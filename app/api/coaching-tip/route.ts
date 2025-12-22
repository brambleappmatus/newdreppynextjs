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
            timeOfDay,
            workoutDuration,
            totalSetsCompleted,
        } = body;

        // Auto-select tip mode: 70% performance, 20% form, 10% motivation
        const random = Math.random();
        const tipMode = random < 0.7 ? 'performance' : random < 0.9 ? 'form' : 'motivation';

        // Build context
        const goalContext = trainingGoal === 'strength'
            ? 'Goal: STRENGTH (heavy, 1-6 reps, power).'
            : 'Goal: HYPERTROPHY (8-15 reps, controlled tempo, mind-muscle).';

        const historyContext = lastWeight > 0
            ? `Last session: ${lastWeight}kg × ${lastReps}. PR: ${prWeight}kg × ${prReps}.`
            : 'First time with this exercise.';

        const setContext = currentSet && totalSets ? `Set ${currentSet}/${totalSets}.` : '';
        const currentContext = `Current: ${currentWeight}kg × ${currentReps}. ${setContext}`;

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
        if (isResting && restTimeLeft !== undefined) {
            const mins = Math.floor(restTimeLeft / 60);
            const secs = restTimeLeft % 60;
            restContext = `RESTING (${mins}:${secs.toString().padStart(2, '0')} left). Last set: ${lastSetDifficulty || 'normal'}.`;
        }

        // Conversation context
        let conversationContext = '';
        if (previousTip && previousWeight !== undefined && !isResting) {
            const weightUp = currentWeight > previousWeight;
            const weightDown = currentWeight < previousWeight;
            if (weightUp || weightDown) {
                conversationContext = `You said: "${previousTip}" (at ${previousWeight}kg). They ${weightUp ? 'increased' : 'decreased'} to ${currentWeight}kg.`;
            }
        }

        // Difficulty context
        let difficultyContext = '';
        if (lastSetDifficulty && !isResting && currentSet && currentSet > 1) {
            difficultyContext = `Last set felt: ${lastSetDifficulty}.`;
        }

        // Build prompt based on auto-selected mode
        let modeInstruction = '';
        if (isResting) {
            modeInstruction = `REST TIP: Quick advice about weight for next set. If "easy" = suggest adding weight. If "hard" = suggest keeping or dropping. Be encouraging about their rest.`;
        } else if (tipMode === 'motivation') {
            modeInstruction = `MOTIVATION: Give an energetic, hype message! Use 1-2 emojis. Get them fired up! Max 12 words.`;
        } else if (tipMode === 'form') {
            modeInstruction = `FORM TIP: Give ONE specific technique cue for ${exerciseName}. Examples: "squeeze at top", "drive through heels", "elbows tucked". Max 12 words.`;
        } else {
            modeInstruction = `PERFORMANCE TIP: Give actionable advice for this set - weight adjustment, rep target, or focus cue. Max 15 words.`;
        }

        const prompt = `You are a gym coach giving a quick tip. ${modeInstruction}

${goalContext}
${historyContext}
${currentContext}
${timeContext}
${difficultyContext}
${restContext}
${conversationContext}

${previousTip && currentWeight > (previousWeight || 0) ? 'They followed your advice and added weight - acknowledge this positively!' : ''}
${currentWeight >= prWeight && prWeight > 0 ? 'This is at or above their PR - be extra encouraging!' : ''}

Respond with ONLY the tip text. No quotes, no labels. Be concise and natural.`;

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
                tip: getStaticTip(trainingGoal, currentWeight, previousWeight ?? 0, prWeight, isResting, lastSetDifficulty)
            });
        }

        const data = await response.json();
        const tip = data.choices[0]?.message?.content?.trim() || getStaticTip(trainingGoal, currentWeight, previousWeight ?? 0, prWeight, isResting, lastSetDifficulty);

        return NextResponse.json({ tip });
    } catch (error) {
        console.error('Coaching tip error:', error);
        return NextResponse.json({
            tip: 'Focus on form and controlled movement.'
        });
    }
}

function getStaticTip(goal: string, current: number, previous: number, pr: number, isResting?: boolean, difficulty?: string): string {
    if (isResting) {
        if (difficulty === 'easy') return 'Easy set! Try adding 2.5kg next.';
        if (difficulty === 'hard') return 'Tough one! Rest up, same weight.';
        return 'Good rest! Keep the same weight.';
    }
    if (goal === 'strength') {
        if (current >= pr && pr > 0) return 'PR territory! 🔥 Brace hard!';
        if (current > previous && previous > 0) return 'Nice weight bump! Crush it!';
        return 'Explosive power, full lockout.';
    } else {
        if (current >= pr && pr > 0) return 'At your max! Control every rep.';
        if (current > previous && previous > 0) return 'Good increase! Slow tempo.';
        return 'Feel the muscle, squeeze at top.';
    }
}
