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
        } = body;

        // Build context for AI
        const goalContext = trainingGoal === 'strength'
            ? 'The user is focused on STRENGTH training (heavy weights, 1-6 reps, longer rest, progressive overload on weight).'
            : 'The user is focused on HYPERTROPHY training (8-15 reps, controlled tempo, mind-muscle connection, volume is key).';

        const historyContext = lastWeight > 0
            ? `Previous workout best: ${lastWeight}kg for ${lastReps} reps. PR: ${prWeight}kg for ${prReps} reps.`
            : 'No previous history for this exercise.';

        const setContext = currentSet && totalSets
            ? `Set ${currentSet} of ${totalSets}.`
            : '';

        const currentContext = `Currently set to: ${currentWeight}kg for ${currentReps} reps. ${setContext}`;

        // Build rest context
        let restContext = '';
        if (isResting && restTimeLeft !== undefined) {
            const minutesLeft = Math.floor(restTimeLeft / 60);
            const secondsLeft = restTimeLeft % 60;
            restContext = `
REST PERIOD ACTIVE: User is resting with ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')} remaining.
${lastSetDifficulty ? `Last set felt: ${lastSetDifficulty.toUpperCase()}` : ''}
Give advice for their REST period - should they keep the same weight, go heavier, or drop weight based on how the last set felt?
Be supportive about resting ("Good rest!", "Recover well", etc.)`;
        }

        // Build conversation context if we have previous interaction
        let conversationContext = '';
        if (previousTip && previousWeight !== undefined && previousReps !== undefined && !isResting) {
            const weightChanged = currentWeight !== previousWeight;
            const repsChanged = currentReps !== previousReps;
            const weightIncreased = currentWeight > previousWeight;
            const repsIncreased = currentReps > previousReps;

            if (weightChanged || repsChanged) {
                conversationContext = `
IMPORTANT CONTEXT - Previous interaction:
- You previously suggested: "${previousTip}"
- User was at: ${previousWeight}kg × ${previousReps} reps
- User changed to: ${currentWeight}kg × ${currentReps} reps
${weightIncreased ? '- User INCREASED weight (they followed advice if you suggested adding weight!)' : ''}
${repsIncreased ? '- User INCREASED reps (they followed advice if you suggested more reps!)' : ''}
${currentWeight < previousWeight ? '- User DECREASED weight (maybe they need reassurance)' : ''}

Acknowledge their adjustment positively if they followed your advice! Be encouraging about their choice.`;
            }
        }

        // Build difficulty context for non-rest scenarios
        let difficultyContext = '';
        if (lastSetDifficulty && !isResting && currentSet && currentSet > 1) {
            difficultyContext = `
Previous set felt: ${lastSetDifficulty.toUpperCase()}
${lastSetDifficulty === 'easy' ? '- They might be ready to increase weight or push harder' : ''}
${lastSetDifficulty === 'hard' ? '- They might need to maintain or slightly reduce - focus on form' : ''}`;
        }

        const prompt = `You are a concise, encouraging workout coach. Give ONE short tip (max 18 words) for this moment.

Exercise: ${exerciseName} (${muscleGroup})
${goalContext}
${historyContext}
${currentContext}
${difficultyContext}
${restContext}
${conversationContext}

Guidelines:
${isResting ? `
- This is a REST PERIOD - acknowledge they're resting
- If last set was "easy", suggest they could add weight
- If last set was "hard", suggest keeping weight or dropping slightly
- If last set was "normal/good", encourage maintaining the weight
- Be supportive: "Rest up!", "Good recovery time", etc.
` : `
- If user followed your previous advice (increased weight/reps), acknowledge it positively!
- If at or above PR, be extra encouraging
- Consider how their last set felt (easy/normal/hard) if mentioned
- If last set was hard, be supportive and suggest good form over pushing harder
- If last set was easy, encourage adding weight or more intensity
- For strength: encourage power, explosive movement
- For hypertrophy: encourage control, squeeze, mind-muscle connection
`}
- Be conversational and supportive, like a gym buddy

Respond with ONLY the tip text, no quotes or formatting.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 60,
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            // Fallback to static tips if API fails
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
            tip: 'Focus on proper form and controlled movement.'
        });
    }
}

function getStaticTip(goal: string, current: number, previous: number, pr: number, isResting?: boolean, difficulty?: string): string {
    if (isResting) {
        if (difficulty === 'easy') return '💪 That looked easy! Consider adding 2.5kg next set.';
        if (difficulty === 'hard') return '😤 Tough set! Rest well, maybe drop weight slightly.';
        return '⏱️ Good rest! Keep the same weight, focus on form next set.';
    }

    if (goal === 'strength') {
        if (current >= pr && pr > 0) return '🔥 PR attempt! Rest well, brace hard, explode up!';
        if (current > previous && previous > 0) return '💪 Nice! You bumped up the weight - let\'s crush it!';
        return 'Focus on power output and full lockout.';
    } else {
        if (current >= pr && pr > 0) return '🏆 At your max! Control every rep.';
        if (current > previous && previous > 0) return '👍 Good call adding weight! Keep the tempo slow.';
        return 'Slow eccentric, squeeze at peak contraction.';
    }
}
