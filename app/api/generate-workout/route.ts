import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();
        const supabase = await createClient();

        // Get exercises from database to match AI suggestions
        const { data: allExercises } = await supabase
            .from('exercises')
            .select('id, name, equipment, body_part, target_muscle')
            .order('rating', { ascending: false });

        if (!allExercises || allExercises.length === 0) {
            return NextResponse.json({ error: 'No exercises found' }, { status: 500 });
        }

        // Create a list of exercise names for AI context
        const exerciseList = allExercises.slice(0, 200).map(e =>
            `${e.name} (${e.body_part}, ${e.equipment})`
        ).join('\n');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a fitness expert creating workout programs. Generate a workout based on the user's request.

Available exercises (pick from these EXACTLY):
${exerciseList}

Return a JSON object with:
{
  "name": "Workout name",
  "exercises": [
    {"name": "Exact exercise name from list", "target_sets": 3, "target_reps": 10},
    ...
  ]
}

Pick 4-8 exercises that match the user's goals. Use EXACT exercise names from the list above.
Only return the JSON, no other text.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            console.error('OpenAI API error');
            return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        // Parse the JSON response
        let parsed;
        try {
            // Clean up the response (remove markdown code blocks if present)
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            parsed = JSON.parse(cleanContent);
        } catch {
            console.error('Failed to parse AI response:', content);
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        // Match exercise names to database IDs
        const matchedExercises = parsed.exercises.map((aiExercise: { name: string; target_sets: number; target_reps: number }) => {
            // Find exact or close match
            const match = allExercises.find(e =>
                e.name.toLowerCase() === aiExercise.name.toLowerCase()
            ) || allExercises.find(e =>
                e.name.toLowerCase().includes(aiExercise.name.toLowerCase().split('(')[0].trim())
            ) || allExercises.find(e =>
                aiExercise.name.toLowerCase().includes(e.name.toLowerCase())
            );

            if (match) {
                return {
                    id: match.id,
                    name: match.name,
                    equipment: match.equipment,
                    body_part: match.body_part,
                    target_sets: aiExercise.target_sets || 3,
                    target_reps: aiExercise.target_reps || 10,
                };
            }
            return null;
        }).filter(Boolean);

        return NextResponse.json({
            name: parsed.name,
            exercises: matchedExercises,
        });

    } catch (error) {
        console.error('Generate workout error:', error);
        return NextResponse.json(
            { error: 'An error occurred while generating the workout' },
            { status: 500 }
        );
    }
}
