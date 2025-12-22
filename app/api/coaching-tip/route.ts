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
            trainingGoal
        } = body;

        // Build context for AI
        const goalContext = trainingGoal === 'strength'
            ? 'The user is focused on STRENGTH training (heavy weights, 1-6 reps, longer rest, progressive overload on weight).'
            : 'The user is focused on HYPERTROPHY training (8-15 reps, controlled tempo, mind-muscle connection, volume is key).';

        const historyContext = lastWeight > 0
            ? `Last workout: ${lastWeight}kg for ${lastReps} reps. PR: ${prWeight}kg for ${prReps} reps.`
            : 'No previous history for this exercise.';

        const currentContext = `Currently set to: ${currentWeight}kg for ${currentReps} reps.`;

        const prompt = `You are a concise workout coach. Give ONE short, actionable tip (max 15 words) for this set.

Exercise: ${exerciseName} (${muscleGroup})
${goalContext}
${historyContext}
${currentContext}

Consider: Is the weight appropriate for their goal? Should they adjust? Are they close to a PR? 
For strength: encourage heavier attempts, proper rest, compound power.
For hypertrophy: encourage controlled reps, squeeze at top, full ROM, volume.

Respond with ONLY the tip text, no quotes or formatting. Be encouraging and specific.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50,
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            // Fallback to static tips if API fails
            return NextResponse.json({
                tip: getStaticTip(trainingGoal, currentWeight, lastWeight, prWeight)
            });
        }

        const data = await response.json();
        const tip = data.choices[0]?.message?.content?.trim() || getStaticTip(trainingGoal, currentWeight, lastWeight, prWeight);

        return NextResponse.json({ tip });
    } catch (error) {
        console.error('Coaching tip error:', error);
        return NextResponse.json({
            tip: 'Focus on proper form and controlled movement.'
        });
    }
}

function getStaticTip(goal: string, current: number, last: number, pr: number): string {
    if (goal === 'strength') {
        if (current >= pr && pr > 0) return '🔥 PR attempt! Rest well, brace hard, explode up!';
        if (current > last && last > 0) return '💪 Heavier than last time - great progress!';
        return 'Focus on power output and full lockout.';
    } else {
        if (current >= pr && pr > 0) return '🏆 At your max! Control every rep.';
        return 'Slow eccentric, squeeze at peak contraction.';
    }
}
