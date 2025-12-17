import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        const { messages, exerciseContext } = await request.json();
        const supabase = await createClient();

        // Get user's workout history for context
        const { data: { user } } = await supabase.auth.getUser();
        let historyContext = '';

        if (user) {
            // Get recent completed sets for PRs
            const { data: recentSets } = await supabase
                .from('completed_sets')
                .select(`
                    reps, weight, created_at,
                    session_exercises!inner (
                        exercises!inner (name)
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (recentSets && recentSets.length > 0) {
                // Calculate PRs per exercise
                const prs: Record<string, { weight: number; reps: number }> = {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recentSets.forEach((set: any) => {
                    const exerciseName = set.session_exercises?.exercises?.name;
                    if (exerciseName && set.weight) {
                        if (!prs[exerciseName] || set.weight > prs[exerciseName].weight) {
                            prs[exerciseName] = { weight: set.weight, reps: set.reps };
                        }
                    }
                });

                if (Object.keys(prs).length > 0) {
                    historyContext = '\n\nUser\'s Personal Records (PRs):\n' +
                        Object.entries(prs)
                            .map(([name, pr]) => `- ${name}: ${pr.weight}kg x ${pr.reps} reps`)
                            .join('\n');
                }
            }
        }

        // Build system message with exercise context
        const systemMessage: Message = {
            role: 'system',
            content: `You are an AI workout coach helping someone during their workout. Be concise, encouraging, and helpful.

${exerciseContext ? `Current exercise context:
- Exercise: ${exerciseContext.name}
- Muscle group: ${exerciseContext.muscleGroup}
- Current set: ${exerciseContext.currentSet} of ${exerciseContext.totalSets}
- Target reps: ${exerciseContext.targetReps}
- Weight: ${exerciseContext.weight}kg` : 'No specific exercise context provided.'}
${historyContext}

Provide brief, actionable advice. If asked about form, give clear step-by-step instructions. If asked about PRs or history, use the data provided above. Keep responses under 150 words unless detailed explanation is needed.`
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [systemMessage, ...messages],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            return NextResponse.json(
                { error: 'Failed to get response from AI' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        return NextResponse.json({ message: assistantMessage });
    } catch (error) {
        console.error('AI chat error:', error);
        return NextResponse.json(
            { error: 'An error occurred while processing your request' },
            { status: 500 }
        );
    }
}
