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
    // Context from previous suggestion
    previousTip?: string;
    previousWeight?: number;
    previousReps?: number;
    // Rest/set context
    isResting?: boolean;
    restTimeLeft?: number;
    currentSet?: number;
    totalSets?: number;
    lastSetDifficulty?: 'easy' | 'normal' | 'hard';
    // Enhanced context
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    workoutDuration?: number; // minutes
    totalSetsCompleted?: number;
    tipMode?: 'quick' | 'form' | 'motivation';
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
            tipMode = 'quick',
        } = body;

        // Build context for AI
        const goalContext = trainingGoal === 'strength'
            ? 'User goal: STRENGTH (heavy weights, 1-6 reps, power focus).'
            : 'User goal: HYPERTROPHY (8-15 reps, controlled tempo, mind-muscle connection).';

        const historyContext = lastWeight > 0
            ? `Last workout: ${lastWeight}kg × ${lastReps}. PR: ${prWeight}kg × ${prReps}.`
            : 'First time doing this exercise.';

        const setContext = currentSet && totalSets ? `Set ${currentSet}/${totalSets}.` : '';
        const currentContext = `Current: ${currentWeight}kg × ${currentReps} reps. ${setContext}`;

        // Time/duration context
        let timeContext = '';
        if (timeOfDay) {
            const timeMessages: Record<string, string> = {
                morning: 'Early workout - might need extra warm-up.',
                afternoon: 'Afternoon session - should be well warmed up.',
                evening: 'Evening workout - good energy levels expected.',
                night: 'Late night session - be mindful of fatigue.',
            };
            timeContext = timeMessages[timeOfDay] || '';
        }
        if (workoutDuration && workoutDuration > 45) {
            timeContext += ` Been training ${workoutDuration} min - stay hydrated!`;
        }
        if (totalSetsCompleted && totalSetsCompleted > 12) {
            timeContext += ` ${totalSetsCompleted} sets done - you're crushing it!`;
        }

        // Build rest context
        let restContext = '';
        if (isResting && restTimeLeft !== undefined) {
            const mins = Math.floor(restTimeLeft / 60);
            const secs = restTimeLeft % 60;
            restContext = `REST PERIOD: ${mins}:${secs.toString().padStart(2, '0')} left. ${lastSetDifficulty ? `Last set felt: ${lastSetDifficulty.toUpperCase()}.` : ''}`;
        }

        // Conversation context
        let conversationContext = '';
        if (previousTip && previousWeight !== undefined && !isResting) {
            const weightChanged = currentWeight !== previousWeight;
            const weightUp = currentWeight > previousWeight;
            if (weightChanged) {
                conversationContext = `Previous tip: "${previousTip}" at ${previousWeight}kg. User ${weightUp ? 'INCREASED' : 'DECREASED'} to ${currentWeight}kg.`;
            }
        }

        // Difficulty context
        let difficultyContext = '';
        if (lastSetDifficulty && !isResting && currentSet && currentSet > 1) {
            difficultyContext = `Previous set felt: ${lastSetDifficulty.toUpperCase()}.`;
        }

        // Mode-specific instructions
        const modeInstructions: Record<string, string> = {
            quick: 'Give a SHORT, actionable tip (max 15 words). Focus on the immediate set.',
            form: `Give a TECHNIQUE tip for ${exerciseName}. Focus on body position, grip, range of motion, or common mistakes.`,
            motivation: 'Give a HYPE/MOTIVATIONAL message. Be energetic and encouraging! Use emojis. Get them fired up!',
        };

        const prompt = `You are a gym coach. ${modeInstructions[tipMode]}

${goalContext}
${historyContext}
${currentContext}
${timeContext}
${difficultyContext}
${restContext}
${conversationContext}

${isResting ? `
RESTING: Suggest weight adjustment based on difficulty. "Easy" = add weight. "Hard" = maybe drop. "Normal" = maintain.
` : tipMode === 'form' ? `
FORM FOCUS: Give specific technique cues for ${exerciseName} (e.g., "drive through heels", "squeeze at top", "keep elbows tucked").
` : tipMode === 'motivation' ? `
HYPE MODE: Be enthusiastic! Use motivational language. Examples: "Let's GO! 🔥", "You've got this!", "BEAST MODE! 💪"
` : `
If they followed your previous advice, acknowledge it! At PR? Extra encouragement.
`}

Respond with ONLY the tip. No quotes. Keep it concise.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: tipMode === 'motivation' ? 40 : 50,
                temperature: tipMode === 'motivation' ? 0.9 : 0.7,
            }),
        });

        if (!response.ok) {
            return NextResponse.json({
                tip: getStaticTip(trainingGoal, currentWeight, previousWeight ?? 0, prWeight, isResting, lastSetDifficulty, tipMode)
            });
        }

        const data = await response.json();
        const tip = data.choices[0]?.message?.content?.trim() || getStaticTip(trainingGoal, currentWeight, previousWeight ?? 0, prWeight, isResting, lastSetDifficulty, tipMode);

        return NextResponse.json({ tip });
    } catch (error) {
        console.error('Coaching tip error:', error);
        return NextResponse.json({
            tip: 'Focus on form and controlled movement.'
        });
    }
}

function getStaticTip(goal: string, current: number, previous: number, pr: number, isResting?: boolean, difficulty?: string, mode?: string): string {
    if (mode === 'motivation') {
        return '💪 You\'ve got this! Give it everything! 🔥';
    }
    if (mode === 'form') {
        return 'Control the weight through full range of motion.';
    }
    if (isResting) {
        if (difficulty === 'easy') return '💪 Easy set! Add some weight next round.';
        if (difficulty === 'hard') return '😤 Tough one! Rest up, consider dropping weight.';
        return '⏱️ Rest up! Same weight, focus on form.';
    }
    if (goal === 'strength') {
        if (current >= pr && pr > 0) return '🔥 PR attempt! Brace hard, explode up!';
        if (current > previous && previous > 0) return '💪 Weight bump! Let\'s crush it!';
        return 'Power and lockout. You\'ve got this.';
    } else {
        if (current >= pr && pr > 0) return '🏆 At your max! Control every rep.';
        if (current > previous && previous > 0) return '👍 Good weight increase! Keep tempo slow.';
        return 'Slow eccentric, squeeze at peak.';
    }
}
