import { NextRequest, NextResponse } from 'next/server';

interface CoachingRequest {
    exerciseName: string;
    muscleGroup: string;
    currentWeight: number;
    currentReps: number;
    lastWeight: number;
    lastReps: number;
    prWeight: number;
    prReps: number;
    trainingGoal: 'strength' | 'hypertrophy';
    previousTip?: string;
    previousWeight?: number;
    previousReps?: number;
    isResting?: boolean;
    restTimeLeft?: number;
    currentSet?: number;
    totalSets?: number;
    lastSetDifficulty?: 'easy' | 'normal' | 'hard';
    lastCompletedWeight?: number | null;
    lastCompletedReps?: number | null;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    workoutDuration?: number;
    totalSetsCompleted?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: CoachingRequest = await request.json();
        const {
            exerciseName,
            muscleGroup,
            currentWeight,
            currentReps,
            lastWeight,
            lastReps,
            prWeight,
            prReps,
            trainingGoal,
            previousTip,
            previousWeight,
            previousReps,
            isResting,
            restTimeLeft,
            currentSet,
            totalSets,
            lastSetDifficulty,
            lastCompletedWeight,
            lastCompletedReps,
            timeOfDay,
            workoutDuration,
            totalSetsCompleted,
        } = body;

        // Auto-select tip mode: 75% performance, 15% form, 10% motivation
        const random = Math.random();
        const tipMode = random < 0.75 ? 'performance' : random < 0.9 ? 'form' : 'motivation';

        // Build context - strength is 1-5 reps, hypertrophy is 8-12 reps
        const goalContext = trainingGoal === 'strength'
            ? 'Goal: STRENGTH (heavy weight, 1-5 reps max, explosive power, long rest).'
            : 'Goal: HYPERTROPHY (moderate weight, 8-12 reps, controlled tempo, feel the muscle).';

        const historyContext = lastWeight > 0
            ? `Previous session: ${lastWeight}kg × ${lastReps}. PR: ${prWeight}kg × ${prReps}.`
            : 'First time with this exercise.';

        const setContext = currentSet && totalSets ? `Set ${currentSet}/${totalSets}.` : '';

        // During rest, reference what was ACTUALLY completed, not what's selected
        const completedInfo = lastCompletedWeight && lastCompletedReps
            ? `Just completed: ${lastCompletedWeight}kg × ${lastCompletedReps} reps.`
            : '';

        const currentContext = isResting
            ? `${completedInfo} ${setContext} Now selecting: ${currentWeight}kg × ${currentReps}.`
            : `Selected: ${currentWeight}kg × ${currentReps}. ${setContext}`;

        // Time/duration context
        let timeContext = '';
        if (workoutDuration && workoutDuration > 30) {
            timeContext = `${workoutDuration}min in.`;
        }
        if (totalSetsCompleted && totalSetsCompleted > 10) {
            timeContext += ` ${totalSetsCompleted} sets done.`;
        }

        // Rest context
        let restContext = '';
        if (isResting && restTimeLeft !== undefined && lastSetDifficulty) {
            restContext = `RESTING. Last set felt: ${lastSetDifficulty}.`;
        }

        // Difficulty context
        let difficultyContext = '';
        if (lastSetDifficulty && !isResting && currentSet && currentSet > 1) {
            difficultyContext = `Last set felt: ${lastSetDifficulty}.`;
        }

        // Build prompt based on auto-selected mode
        let modeInstruction = '';
        if (isResting) {
            modeInstruction = `REST TIP: Based on last set feeling ${lastSetDifficulty || 'normal'}, suggest weight for next set. "Easy" = add weight. "Hard" = keep or drop. Be encouraging.`;
        } else if (tipMode === 'motivation') {
            modeInstruction = `MOTIVATION: Give an energetic, hype message! 1-2 emojis. Max 12 words.`;
        } else if (tipMode === 'form') {
            modeInstruction = `FORM TIP: ONE specific technique cue for ${exerciseName}. Max 12 words.`;
        } else {
            // Performance tip - be goal-specific
            if (trainingGoal === 'strength') {
                modeInstruction = `STRENGTH TIP: Focus on power, explosive movement, heavy singles/triples. 1-5 rep range. Max 15 words.`;
            } else {
                modeInstruction = `HYPERTROPHY TIP: Focus on mind-muscle connection, controlled tempo, 8-12 rep range. Max 15 words.`;
            }
        }

        const prompt = `You are a gym coach. ${modeInstruction}

${goalContext}
${historyContext}
${currentContext}
${timeContext}
${difficultyContext}
${restContext}

${currentWeight >= prWeight && prWeight > 0 ? 'At or above PR - extra encouragement!' : ''}

IMPORTANT: Do NOT say they "hit" or "completed" a weight unless isResting is true and lastCompletedWeight is provided.
If isResting, reference the COMPLETED weight (${lastCompletedWeight}kg), not the selected weight.

Respond with ONLY the tip. No quotes. Be concise and natural.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 40,
                temperature: tipMode === 'motivation' ? 0.9 : 0.7,
            }),
        });

        if (!response.ok) {
            return NextResponse.json({
                tip: getStaticTip(trainingGoal, currentWeight, prWeight, isResting, lastSetDifficulty)
            });
        }

        const data = await response.json();
        const tip = data.choices[0]?.message?.content?.trim() || getStaticTip(trainingGoal, currentWeight, prWeight, isResting, lastSetDifficulty);

        return NextResponse.json({ tip });
    } catch (error) {
        console.error('Coaching tip error:', error);
        return NextResponse.json({
            tip: 'Focus on form and controlled movement.'
        });
    }
}

function getStaticTip(goal: string, current: number, pr: number, isResting?: boolean, difficulty?: string): string {
    if (isResting) {
        if (difficulty === 'easy') return 'Easy set! Add some weight next.';
        if (difficulty === 'hard') return 'Tough one! Rest up, same weight.';
        return 'Good rest! Keep the momentum.';
    }
    if (goal === 'strength') {
        if (current >= pr && pr > 0) return 'PR territory! 🔥 Brace hard, explode up!';
        return 'Heavy and explosive. 1-5 reps max.';
    } else {
        if (current >= pr && pr > 0) return 'At your max! Control every rep.';
        return 'Slow tempo, squeeze at top. 8-12 reps.';
    }
}
