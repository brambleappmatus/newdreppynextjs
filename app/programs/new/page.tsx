'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Exercise {
    id: string;
    name: string;
    equipment: string;
    body_part: string;
    target_sets: number;
    target_reps: number;
}

const bodyParts = [
    { id: 'chest', label: 'Chest' },
    { id: 'back', label: 'Back' },
    { id: 'shoulders', label: 'Shoulders' },
    { id: 'arms', label: 'Arms' },
    { id: 'legs', label: 'Legs' },
    { id: 'core', label: 'Core' },
    { id: 'full_body', label: 'Full Body' },
];

const goalTypes = [
    { id: 'strength', label: 'Build Strength', desc: 'Heavy weights, low reps' },
    { id: 'hypertrophy', label: 'Build Muscle', desc: 'Moderate weights, 8-12 reps' },
    { id: 'endurance', label: 'Muscular Endurance', desc: 'Light weights, high reps' },
];

const exerciseCounts = [3, 4, 5, 6, 7, 8];

export default function NewProgramPage() {
    const [mode, setMode] = useState<'select' | 'manual' | 'ai-step1' | 'ai-step2' | 'ai-step3' | 'ai-review'>('select');
    const [programName, setProgramName] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(false);

    // AI guided questions
    const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
    const [selectedGoal, setSelectedGoal] = useState<string>('');
    const [exerciseCount, setExerciseCount] = useState(5);
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [replacingExercise, setReplacingExercise] = useState<string | null>(null);

    // Manual mode
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const [searching, setSearching] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    const toggleBodyPart = (id: string) => {
        setSelectedBodyParts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const searchExercises = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        const { data } = await supabase
            .from('exercises')
            .select('id, name, equipment, body_part')
            .ilike('name', `%${query}%`)
            .limit(10);

        setSearchResults((data ?? []).map(e => ({
            ...e,
            target_sets: 3,
            target_reps: 10,
        })));
        setSearching(false);
    };

    const addExercise = (exercise: Exercise) => {
        if (!exercises.find(e => e.id === exercise.id)) {
            setExercises([...exercises, exercise]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeExercise = (id: string) => {
        setExercises(exercises.filter(e => e.id !== id));
    };

    const updateExercise = (id: string, field: 'target_sets' | 'target_reps', value: number) => {
        setExercises(exercises.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    const moveExercise = (index: number, direction: 'up' | 'down') => {
        const newExercises = [...exercises];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newExercises.length) return;
        [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];
        setExercises(newExercises);
    };

    const generateWithAI = async () => {
        setAiLoading(true);

        const prompt = `Create a ${selectedGoal} workout targeting ${selectedBodyParts.join(', ')}. 
Include ${exerciseCount} exercises.
${additionalNotes ? `Additional requirements: ${additionalNotes}` : ''}`;

        try {
            const response = await fetch('/api/generate-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();
            if (data.exercises) {
                setExercises(data.exercises);
                setProgramName(data.name || `${selectedBodyParts[0]} ${selectedGoal} Workout`);
                setMode('ai-review');
            }
        } catch (error) {
            console.error('AI generation failed:', error);
        }
        setAiLoading(false);
    };

    const findAlternative = async (exerciseId: string, exerciseName: string, bodyPart: string) => {
        setReplacingExercise(exerciseId);

        const prompt = `Find an alternative exercise to "${exerciseName}" that targets the same muscle (${bodyPart}). 
Pick just 1 exercise that is different but similar in function.`;

        try {
            const response = await fetch('/api/generate-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();
            if (data.exercises && data.exercises.length > 0) {
                const alternative = data.exercises[0];
                // Get the original exercise's sets/reps
                const original = exercises.find(e => e.id === exerciseId);
                setExercises(exercises.map(e =>
                    e.id === exerciseId
                        ? { ...alternative, target_sets: original?.target_sets || 3, target_reps: original?.target_reps || 10 }
                        : e
                ));
            }
        } catch (error) {
            console.error('Failed to find alternative:', error);
        }
        setReplacingExercise(null);
    };

    const saveProgram = async () => {
        if (!programName.trim() || exercises.length === 0) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: template, error: templateError } = await supabase
            .from('workout_templates')
            .insert({ user_id: user.id, name: programName.trim() })
            .select()
            .single();

        if (templateError || !template) {
            setLoading(false);
            return;
        }

        const templateExercises = exercises.map((e, index) => ({
            template_id: template.id,
            exercise_id: e.id,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            order_index: index,
        }));

        await supabase.from('template_exercises').insert(templateExercises);

        router.push('/');
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000]">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#f5f5f7]/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10 px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c1e] flex items-center justify-center shadow-sm border border-gray-200/60 dark:border-white/10"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <h1 className="text-[20px] font-bold text-gray-900 dark:text-white">New Program</h1>
                        </div>
                        {(mode === 'ai-review' || mode === 'manual') && exercises.length > 0 && (
                            <button
                                onClick={saveProgram}
                                disabled={!programName.trim() || loading}
                                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl text-[14px] disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-5 py-6 space-y-6">
                    {/* Mode Selection */}
                    {mode === 'select' && (
                        <div className="space-y-4">
                            <p className="text-[15px] text-gray-600 dark:text-gray-400 text-center">
                                How would you like to create your workout?
                            </p>

                            <button
                                onClick={() => setMode('ai-step1')}
                                className="w-full bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-[16px] text-gray-900 dark:text-white">Create with AI</p>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">Answer a few questions, AI builds it</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            <button
                                onClick={() => setMode('manual')}
                                className="w-full bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-[16px] text-gray-900 dark:text-white">Create Manually</p>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">Pick exercises from 600+ library</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* AI Step 1: Body Parts */}
                    {mode === 'ai-step1' && (
                        <div className="space-y-5">
                            <div>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Step 1 of 3</p>
                                <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">What do you want to train?</h2>
                                <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">Select one or more body parts</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {bodyParts.map((part) => (
                                    <button
                                        key={part.id}
                                        onClick={() => toggleBodyPart(part.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedBodyParts.includes(part.id)
                                            ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                            : 'bg-white dark:bg-[#1c1c1e] border-gray-200/60 dark:border-white/10'
                                            }`}
                                    >
                                        <p className={`font-semibold text-[15px] ${selectedBodyParts.includes(part.id)
                                            ? 'text-white dark:text-black'
                                            : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {part.label}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setMode('ai-step2')}
                                disabled={selectedBodyParts.length === 0}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-3.5 rounded-xl text-[15px] disabled:opacity-50"
                            >
                                Continue
                            </button>

                            <button
                                onClick={() => setMode('select')}
                                className="w-full text-[14px] text-gray-500 dark:text-gray-400"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* AI Step 2: Goal */}
                    {mode === 'ai-step2' && (
                        <div className="space-y-5">
                            <div>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Step 2 of 3</p>
                                <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">What&apos;s your goal?</h2>
                            </div>

                            <div className="space-y-2">
                                {goalTypes.map((goal) => (
                                    <button
                                        key={goal.id}
                                        onClick={() => setSelectedGoal(goal.id)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${selectedGoal === goal.id
                                            ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                            : 'bg-white dark:bg-[#1c1c1e] border-gray-200/60 dark:border-white/10'
                                            }`}
                                    >
                                        <p className={`font-semibold text-[15px] ${selectedGoal === goal.id
                                            ? 'text-white dark:text-black'
                                            : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {goal.label}
                                        </p>
                                        <p className={`text-[13px] ${selectedGoal === goal.id
                                            ? 'text-gray-300 dark:text-gray-600'
                                            : 'text-gray-500'
                                            }`}>
                                            {goal.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setMode('ai-step3')}
                                disabled={!selectedGoal}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-3.5 rounded-xl text-[15px] disabled:opacity-50"
                            >
                                Continue
                            </button>

                            <button
                                onClick={() => setMode('ai-step1')}
                                className="w-full text-[14px] text-gray-500 dark:text-gray-400"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* AI Step 3: Details & Notes */}
                    {mode === 'ai-step3' && (
                        <div className="space-y-5">
                            <div>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Step 3 of 3</p>
                                <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">Final details</h2>
                            </div>

                            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                                <label className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-3 block">
                                    Number of exercises
                                </label>
                                <div className="flex gap-2">
                                    {exerciseCounts.map((count) => (
                                        <button
                                            key={count}
                                            onClick={() => setExerciseCount(count)}
                                            className={`flex-1 py-2.5 rounded-xl font-semibold text-[14px] transition-all ${exerciseCount === count
                                                ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                                <label className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                    Anything else? (optional)
                                </label>
                                <textarea
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    placeholder="e.g., I only have dumbbells, avoid squats, focus on compound movements..."
                                    className="w-full h-24 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none text-[14px]"
                                />
                            </div>

                            <button
                                onClick={generateWithAI}
                                disabled={aiLoading}
                                className="w-full bg-purple-600 text-white font-semibold py-3.5 rounded-xl text-[15px] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {aiLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Generate Workout
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setMode('ai-step2')}
                                className="w-full text-[14px] text-gray-500 dark:text-gray-400"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* AI Review with alternatives */}
                    {mode === 'ai-review' && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-[13px] text-green-600 dark:text-green-400 font-medium mb-1">AI Generated</p>
                                <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">Review your workout</h2>
                                <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">Swap, reorder, or add more exercises</p>
                            </div>

                            {/* Program Name */}
                            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                                <input
                                    type="text"
                                    value={programName}
                                    onChange={(e) => setProgramName(e.target.value)}
                                    placeholder="Program name..."
                                    className="w-full text-[17px] font-semibold text-gray-900 dark:text-white placeholder-gray-400 bg-transparent focus:outline-none"
                                />
                            </div>

                            {/* Search to add more exercises */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchExercises(e.target.value);
                                    }}
                                    placeholder="+ Add more exercises..."
                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                {searching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-lg border border-gray-200/60 dark:border-white/10 overflow-hidden z-10">
                                        {searchResults.map((exercise) => (
                                            <button
                                                key={exercise.id}
                                                onClick={() => addExercise(exercise)}
                                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 text-left"
                                            >
                                                <div>
                                                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">{exercise.name}</p>
                                                    <p className="text-[12px] text-gray-500">{exercise.body_part} • {exercise.equipment}</p>
                                                </div>
                                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Exercises with swap and reorder buttons */}
                            <div className="space-y-2">
                                {exercises.map((exercise, index) => (
                                    <div
                                        key={exercise.id}
                                        className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                {/* Reorder buttons */}
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => moveExercise(index, 'up')}
                                                        disabled={index === 0}
                                                        className="w-6 h-6 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                                    >
                                                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => moveExercise(index, 'down')}
                                                        disabled={index === exercises.length - 1}
                                                        className="w-6 h-6 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                                    >
                                                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[15px] text-gray-900 dark:text-white">{exercise.name}</p>
                                                    <p className="text-[12px] text-gray-500">{exercise.body_part} • {exercise.equipment}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => findAlternative(exercise.id, exercise.name, exercise.body_part)}
                                                    disabled={replacingExercise === exercise.id}
                                                    className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center"
                                                    title="Find alternative"
                                                >
                                                    {replacingExercise === exercise.id ? (
                                                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => removeExercise(exercise.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/20 flex items-center justify-center"
                                                    title="Remove"
                                                >
                                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-[11px] text-gray-500 uppercase mb-1 block">Sets</label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateExercise(exercise.id, 'target_sets', Math.max(1, exercise.target_sets - 1))}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                    >
                                                        <span className="text-gray-600 dark:text-gray-400">−</span>
                                                    </button>
                                                    <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{exercise.target_sets}</span>
                                                    <button
                                                        onClick={() => updateExercise(exercise.id, 'target_sets', exercise.target_sets + 1)}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                    >
                                                        <span className="text-gray-600 dark:text-gray-400">+</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[11px] text-gray-500 uppercase mb-1 block">Reps</label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateExercise(exercise.id, 'target_reps', Math.max(1, exercise.target_reps - 1))}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                    >
                                                        <span className="text-gray-600 dark:text-gray-400">−</span>
                                                    </button>
                                                    <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{exercise.target_reps}</span>
                                                    <button
                                                        onClick={() => updateExercise(exercise.id, 'target_reps', exercise.target_reps + 1)}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                    >
                                                        <span className="text-gray-600 dark:text-gray-400">+</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => { setMode('ai-step3'); }}
                                className="w-full text-[14px] text-blue-600 dark:text-blue-400 font-medium py-2"
                            >
                                Regenerate with different options
                            </button>
                        </div>
                    )}

                    {/* Manual Mode */}
                    {mode === 'manual' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => { setMode('select'); setExercises([]); }}
                                className="text-[14px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>

                            {/* Program Name */}
                            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                                <input
                                    type="text"
                                    value={programName}
                                    onChange={(e) => setProgramName(e.target.value)}
                                    placeholder="Program name..."
                                    className="w-full text-[17px] font-semibold text-gray-900 dark:text-white placeholder-gray-400 bg-transparent focus:outline-none"
                                />
                            </div>

                            {/* Search Exercises */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchExercises(e.target.value);
                                    }}
                                    placeholder="Search exercises..."
                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                {searching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-lg border border-gray-200/60 dark:border-white/10 overflow-hidden z-10">
                                        {searchResults.map((exercise) => (
                                            <button
                                                key={exercise.id}
                                                onClick={() => addExercise(exercise)}
                                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 text-left"
                                            >
                                                <div>
                                                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">{exercise.name}</p>
                                                    <p className="text-[12px] text-gray-500">{exercise.body_part} • {exercise.equipment}</p>
                                                </div>
                                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Added Exercises */}
                            {exercises.length > 0 ? (
                                <div className="space-y-2">
                                    <h3 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                                        Exercises ({exercises.length})
                                    </h3>
                                    {exercises.map((exercise, index) => (
                                        <div
                                            key={exercise.id}
                                            className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[13px] font-semibold text-gray-600 dark:text-gray-400">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-semibold text-[15px] text-gray-900 dark:text-white">{exercise.name}</p>
                                                        <p className="text-[12px] text-gray-500">{exercise.body_part}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeExercise(exercise.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/20 flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-[11px] text-gray-500 uppercase mb-1 block">Sets</label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateExercise(exercise.id, 'target_sets', Math.max(1, exercise.target_sets - 1))}
                                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                        >
                                                            <span className="text-gray-600 dark:text-gray-400">−</span>
                                                        </button>
                                                        <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{exercise.target_sets}</span>
                                                        <button
                                                            onClick={() => updateExercise(exercise.id, 'target_sets', exercise.target_sets + 1)}
                                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                        >
                                                            <span className="text-gray-600 dark:text-gray-400">+</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[11px] text-gray-500 uppercase mb-1 block">Reps</label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateExercise(exercise.id, 'target_reps', Math.max(1, exercise.target_reps - 1))}
                                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                        >
                                                            <span className="text-gray-600 dark:text-gray-400">−</span>
                                                        </button>
                                                        <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{exercise.target_reps}</span>
                                                        <button
                                                            onClick={() => updateExercise(exercise.id, 'target_reps', exercise.target_reps + 1)}
                                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                                        >
                                                            <span className="text-gray-600 dark:text-gray-400">+</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-[14px] text-gray-500 dark:text-gray-400">
                                        Search and add exercises above
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
