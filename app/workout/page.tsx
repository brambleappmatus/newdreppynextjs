'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { alternativeExercises } from '@/lib/mock-data';
import { NumberWheel } from '@/components/ui/number-picker';
import Link from 'next/link';

interface WorkoutSet {
    setNumber: number;
    targetReps: number;
    completedReps?: number;
    weight?: number;
    completed: boolean;
    difficulty?: 'easy' | 'normal' | 'hard';
}

interface WorkoutExercise {
    id: string;
    name: string;
    muscleGroup: string;
    currentSet: number;
    restSeconds: number;
    notes?: string;
    sets: WorkoutSet[];
}

interface Workout {
    id: string;
    name: string;
    date: string;
    exercises: WorkoutExercise[];
}

// Loading fallback for Suspense
function WorkoutLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 mx-auto border-3 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading workout...</p>
            </div>
        </div>
    );
}

// Main page wrapper with Suspense
export default function WorkoutPage() {
    return (
        <Suspense fallback={<WorkoutLoading />}>
            <WorkoutContent />
        </Suspense>
    );
}

// Actual workout content that uses useSearchParams
function WorkoutContent() {
    const searchParams = useSearchParams();
    const programId = searchParams.get('program');
    const supabase = createClient();

    const [workout, setWorkout] = useState<Workout | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
    const [showRestTimer, setShowRestTimer] = useState(false);
    const [restTimeLeft, setRestTimeLeft] = useState(0);
    const [restTimeTotal, setRestTimeTotal] = useState(0);
    const [showSubstitutes, setShowSubstitutes] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [showAllSets, setShowAllSets] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

    // Fetch workout data based on program ID
    useEffect(() => {
        const fetchWorkout = async () => {
            if (!programId) {
                setLoading(false);
                return;
            }

            // Fetch the template
            const { data: template } = await supabase
                .from('workout_templates')
                .select('id, name')
                .eq('id', programId)
                .single();

            if (!template) {
                setLoading(false);
                return;
            }

            // Fetch template exercises with exercise details
            const { data: templateExercises } = await supabase
                .from('template_exercises')
                .select(`
                    id,
                    target_sets,
                    target_reps,
                    order_index,
                    exercises (
                        id,
                        name,
                        body_part,
                        target_muscle
                    )
                `)
                .eq('template_id', programId)
                .order('order_index', { ascending: true });

            if (!templateExercises || templateExercises.length === 0) {
                setLoading(false);
                return;
            }

            // Convert to workout format
            const workoutExercises: WorkoutExercise[] = templateExercises.map((te: any) => {
                const exercise = te.exercises;
                const sets: WorkoutSet[] = Array.from({ length: te.target_sets || 3 }, (_, i) => ({
                    setNumber: i + 1,
                    targetReps: te.target_reps || 10,
                    weight: 0, // TODO: Get from previous workout history
                    completed: false,
                }));

                return {
                    id: exercise.id,
                    name: exercise.name,
                    muscleGroup: exercise.body_part || exercise.target_muscle || 'General',
                    currentSet: 1,
                    restSeconds: 120,
                    sets,
                };
            });

            setWorkout({
                id: template.id,
                name: template.name,
                date: new Date().toISOString(),
                exercises: workoutExercises,
            });
            setLoading(false);
        };

        fetchWorkout();
    }, [programId, supabase]);

    const activeExercise = workout?.exercises[activeExerciseIndex];
    const currentSetData = activeExercise?.sets[(activeExercise?.currentSet ?? 1) - 1];
    const [currentWeight, setCurrentWeight] = useState(0);
    const [currentReps, setCurrentReps] = useState(8);

    const completedExercises = workout?.exercises.filter(ex =>
        ex.sets.every(set => set.completed)
    ).length ?? 0;
    const totalExercises = workout?.exercises.length ?? 0;
    const workoutComplete = completedExercises === totalExercises && totalExercises > 0;

    // Sync reps and weight when exercise or set changes
    useEffect(() => {
        if (activeExercise) {
            const currentSet = activeExercise.sets[(activeExercise.currentSet ?? 1) - 1];
            if (currentSet) {
                setCurrentReps(currentSet.targetReps ?? 8);
                setCurrentWeight(currentSet.weight ?? 0);
            }
        }
    }, [activeExerciseIndex, activeExercise]);

    // Rest timer countdown effect
    useEffect(() => {
        if (!showRestTimer || restTimeLeft <= 0) {
            if (showRestTimer && restTimeLeft <= 0) {
                setShowRestTimer(false);
            }
            return;
        }
        const timer = setInterval(() => {
            setRestTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [showRestTimer, restTimeLeft]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 mx-auto border-3 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading workout...</p>
                </div>
            </div>
        );
    }

    // No program or no exercises
    if (!workout || !activeExercise) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">No Workout Found</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {!programId
                            ? "No program was selected. Please go back and choose a workout program."
                            : "This program doesn't have any exercises yet. Add exercises to your program first."}
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const handleSetComplete = () => {
        const currentSetIndex = activeExercise.currentSet - 1;
        const isLastSet = activeExercise.currentSet >= activeExercise.sets.length;
        const isLastExercise = activeExerciseIndex >= workout.exercises.length - 1;

        // Update the workout
        setWorkout(prev => {
            const updated = JSON.parse(JSON.stringify(prev)); // Deep clone to avoid mutation issues
            const exercise = updated.exercises[activeExerciseIndex];

            // Mark the current set as completed
            exercise.sets[currentSetIndex] = {
                ...exercise.sets[currentSetIndex],
                completed: true,
                completedReps: currentReps,
                weight: currentWeight,
                difficulty: selectedDifficulty,
            };

            // Advance to next set (only if not the last set)
            if (!isLastSet) {
                exercise.currentSet = exercise.currentSet + 1;
            }

            return updated;
        });

        // Handle exercise transition separately (outside the workout state update)
        if (isLastSet && !isLastExercise) {
            setActiveExerciseIndex(activeExerciseIndex + 1);
            const nextExercise = workout.exercises[activeExerciseIndex + 1];
            setCurrentWeight(nextExercise.sets[0]?.weight ?? 0);
        }

        setSelectedDifficulty('normal');

        // Start rest timer
        if (!isLastSet || !isLastExercise) {
            setRestTimeLeft(activeExercise.restSeconds);
            setRestTimeTotal(activeExercise.restSeconds);
            setShowRestTimer(true);
        }
    };

    const handleSubstitute = () => {
        setShowSubstitutes(true);
    };

    const handleSelectSubstitute = (substituteId: string) => {
        console.log('Substitute selected:', substituteId);
        setShowSubstitutes(false);
    };

    const moveExercise = (direction: 'up' | 'down') => {
        if (!workout) return;
        const toIndex = direction === 'up' ? activeExerciseIndex - 1 : activeExerciseIndex + 1;
        if (toIndex < 0 || toIndex >= workout.exercises.length) return;

        setWorkout(prev => {
            if (!prev) return prev;
            const exercises = [...prev.exercises];
            [exercises[activeExerciseIndex], exercises[toIndex]] = [exercises[toIndex], exercises[activeExerciseIndex]];
            return { ...prev, exercises };
        });

        setActiveExerciseIndex(toIndex);
    };

    const adjustWeight = (delta: number) => {
        setCurrentWeight(prev => Math.max(0, prev + delta));
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage = { role: 'user' as const, content: chatInput.trim() };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...chatMessages, userMessage],
                    exerciseContext: {
                        name: activeExercise.name,
                        muscleGroup: activeExercise.muscleGroup,
                        currentSet: activeExercise.currentSet,
                        totalSets: activeExercise.sets.length,
                        targetReps: currentSetData?.targetReps,
                        weight: currentWeight,
                    },
                }),
            });

            const data = await response.json();
            if (data.message) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not connect. Please check your connection.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const currentExerciseCompleted = activeExercise?.sets.every(set => set.completed);

    if (workoutComplete) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
                <div className="text-center space-y-8 animate-scale-in max-w-md w-full">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 rounded-full flex items-center justify-center shadow-2xl">
                        <svg className="w-12 h-12 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Workout Complete!
                        </h2>
                        <p className="text-base text-gray-600 dark:text-gray-400">
                            Great job! You completed all {totalExercises} exercises.
                        </p>
                    </div>
                    <div className="bg-white/60 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-white/10 shadow-xl">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold uppercase tracking-widest">Total Volume</p>
                        <p className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            {workout.exercises.reduce((total, ex) =>
                                total + ex.sets.reduce((sum, set) => sum + (set.weight || 0) * (set.completedReps || set.targetReps), 0), 0
                            ).toLocaleString()}
                            <span className="text-2xl ml-2">kg</span>
                        </p>
                    </div>
                    <Link href="/">
                        <button className="w-full h-14 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-bold rounded-2xl transition-all active:scale-95 shadow-lg">
                            Back to Home
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex flex-col">
            {/* Main Content with Swipe Detection */}
            <div
                className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full overflow-y-auto pb-28"
                onTouchStart={(e) => setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })}
                onTouchEnd={(e) => {
                    if (touchStart === null) return;
                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;
                    const diffX = touchStart.x - touchEndX;
                    const diffY = Math.abs(touchStart.y - touchEndY);

                    // Only trigger horizontal swipe if horizontal movement > vertical movement
                    // and horizontal movement is significant (>80px)
                    if (Math.abs(diffX) > 80 && Math.abs(diffX) > diffY * 1.5) {
                        if (diffX > 0 && activeExerciseIndex < workout.exercises.length - 1) {
                            // Swipe left - next exercise
                            setActiveExerciseIndex(activeExerciseIndex + 1);
                        } else if (diffX < 0 && activeExerciseIndex > 0) {
                            // Swipe right - previous exercise
                            setActiveExerciseIndex(activeExerciseIndex - 1);
                        }
                    }
                    setTouchStart(null);
                }}
            >
                {/* Exercise Header with Navigation */}
                <div className="mb-4 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-4 border border-gray-200/50 dark:border-white/10 shadow-xl">
                    {/* Navigation Row */}
                    <div className="flex items-center gap-2 mb-3">
                        {/* Left Arrow */}
                        <button
                            onClick={() => {
                                if (activeExerciseIndex > 0) {
                                    setActiveExerciseIndex(activeExerciseIndex - 1);
                                }
                            }}
                            disabled={activeExerciseIndex === 0}
                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 ${activeExerciseIndex === 0
                                ? 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600'
                                : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white'
                                }`}
                            aria-label="Previous exercise"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Exercise Name & Info */}
                        <div className="flex-1 min-w-0 text-center">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5 truncate">{activeExercise.name}</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{activeExercise.muscleGroup}</p>
                        </div>

                        {/* Right Arrow */}
                        <button
                            onClick={() => {
                                if (activeExerciseIndex < workout.exercises.length - 1) {
                                    setActiveExerciseIndex(activeExerciseIndex + 1);
                                }
                            }}
                            disabled={activeExerciseIndex === workout.exercises.length - 1}
                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 ${activeExerciseIndex === workout.exercises.length - 1
                                ? 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600'
                                : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white'
                                }`}
                            aria-label="Next exercise"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Info & Swap */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                Exercise {activeExerciseIndex + 1}/{totalExercises}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600">•</span>
                            <span className="text-gray-900 dark:text-white font-semibold">
                                {completedExercises} completed
                            </span>
                        </div>
                        <button
                            onClick={handleSubstitute}
                            className="px-3 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 flex items-center justify-center transition-all active:scale-90 text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                            Swap
                        </button>
                    </div>

                    {/* Overall Progress Bar with Gradient */}
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 transition-all duration-500 rounded-full"
                            style={{ width: `${(completedExercises / totalExercises) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Set Progress Dots */}
                <div className="flex gap-2 mb-4">
                    {activeExercise.sets.map((set) => (
                        <div
                            key={set.setNumber}
                            className={`flex-1 h-2 rounded-full transition-all shadow-sm ${set.completed
                                ? 'bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300'
                                : set.setNumber === activeExercise.currentSet
                                    ? 'bg-gray-400 dark:bg-gray-600'
                                    : 'bg-gray-200 dark:bg-gray-800'
                                }`}
                        />
                    ))}
                </div>

                {/* Current Set Card with Premium Glass Effect */}
                {!currentExerciseCompleted ? (
                    <>
                        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-3xl p-4 border border-gray-200/50 dark:border-white/10 shadow-2xl mb-4">
                            {/* Set Info */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-widest mb-2 text-center">
                                Set {activeExercise.currentSet} of {activeExercise.sets.length}
                            </p>

                            {/* Reps Picker */}
                            <div className="mb-2">
                                <NumberWheel
                                    value={currentReps}
                                    onChange={setCurrentReps}
                                    min={1}
                                    max={40}
                                    step={1}
                                    unit="reps"
                                    label="Reps"
                                />
                            </div>

                            {/* Weight Picker */}
                            <div className="mb-3">
                                <NumberWheel
                                    value={currentWeight}
                                    onChange={setCurrentWeight}
                                    min={0}
                                    max={400}
                                    step={2.5}
                                    unit="kg"
                                    label="Weight"
                                />
                            </div>

                            {/* Difficulty Feedback with Premium Styling */}
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold uppercase tracking-widest">How did it feel?</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['easy', 'normal', 'hard'] as const).map((difficulty) => (
                                        <button
                                            key={difficulty}
                                            onClick={() => setSelectedDifficulty(difficulty)}
                                            className={`py-3 px-3 rounded-2xl text-sm font-bold transition-all active:scale-95 ${selectedDifficulty === difficulty
                                                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-xl scale-105'
                                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20'
                                                }`}
                                        >
                                            {difficulty === 'easy' ? 'Easy' : difficulty === 'normal' ? 'Good' : 'Hard'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Split Complete/Skip Button */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSetComplete}
                                    className="flex-[4] h-14 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 hover:from-gray-800 hover:to-gray-600 dark:hover:from-gray-100 dark:hover:to-gray-300 text-white dark:text-black font-bold text-base rounded-2xl transition-all active:scale-95 shadow-2xl"
                                >
                                    Complete Set
                                </button>
                                <button
                                    onClick={() => {
                                        // Skip current set - advance without completing
                                        const isLastSet = activeExercise.currentSet >= activeExercise.sets.length;
                                        const isLastExercise = activeExerciseIndex >= workout.exercises.length - 1;

                                        if (!isLastSet) {
                                            setWorkout(prev => {
                                                const updated = JSON.parse(JSON.stringify(prev));
                                                updated.exercises[activeExerciseIndex].currentSet += 1;
                                                return updated;
                                            });
                                        } else if (!isLastExercise) {
                                            setActiveExerciseIndex(activeExerciseIndex + 1);
                                            const nextExercise = workout.exercises[activeExerciseIndex + 1];
                                            setCurrentWeight(nextExercise.sets[0]?.weight ?? 0);
                                        }
                                    }}
                                    className="flex-1 h-14 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-2xl transition-all active:scale-95 shadow-2xl flex items-center justify-center"
                                    aria-label="Skip set"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* View All Sets Button */}
                        <button
                            onClick={() => setShowAllSets(true)}
                            className="w-full h-14 bg-white/60 dark:bg-white/5 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-3xl transition-all active:scale-95 border border-gray-200/50 dark:border-white/10 shadow-xl text-sm uppercase tracking-widest"
                        >
                            View All Sets
                        </button>
                    </>
                ) : (
                    /* Exercise Completed State */
                    <div className="bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-gray-200/50 dark:border-white/10 shadow-2xl mb-4 text-center">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 rounded-full flex items-center justify-center shadow-xl mb-4">
                            <svg className="w-8 h-8 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Exercise Complete!</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            All {activeExercise.sets.length} sets finished
                        </p>
                        <button
                            onClick={() => setShowAllSets(true)}
                            className="px-6 h-12 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-semibold rounded-2xl transition-all active:scale-95 border border-gray-300 dark:border-white/20"
                        >
                            View Sets Summary
                        </button>
                    </div>
                )}
            </div>

            {/* All Sets Modal */}
            {showAllSets && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full max-h-[75vh] overflow-hidden animate-slide-up shadow-2xl border border-gray-200/50 dark:border-white/10">
                        <div className="bg-gradient-to-b from-white/60 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    All Sets - {activeExercise.name}
                                </h3>
                                <button
                                    onClick={() => setShowAllSets(false)}
                                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
                                >
                                    <span className="text-gray-900 dark:text-white font-bold text-xl">×</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                            {activeExercise.sets.map((set) => (
                                <div
                                    key={set.setNumber}
                                    className={`flex items-center justify-between p-4 rounded-2xl transition-all ${set.completed
                                        ? 'bg-gray-900/10 dark:bg-white/10 border border-gray-900/20 dark:border-white/20'
                                        : set.setNumber === activeExercise.currentSet
                                            ? 'bg-white/80 dark:bg-white/10 backdrop-blur-xl border-2 border-gray-900 dark:border-white shadow-lg'
                                            : 'bg-gray-100/50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${set.completed
                                                ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-900 dark:border-white'
                                                }`}
                                        >
                                            {set.completed ? '✓' : set.setNumber}
                                        </div>
                                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                                            {set.completed ? set.completedReps : set.targetReps} reps
                                        </span>
                                    </div>
                                    <span className="text-base font-bold text-gray-900 dark:text-white">
                                        {set.weight} kg
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gradient-to-t from-white/60 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-4">
                            <button
                                onClick={() => setShowAllSets(false)}
                                className="w-full h-12 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-semibold rounded-2xl transition-all active:scale-95 border border-gray-300 dark:border-white/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Substitute Modal */}
            {showSubstitutes && alternativeExercises[activeExercise.id] && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full max-h-[75vh] overflow-hidden animate-slide-up shadow-2xl border border-gray-200/50 dark:border-white/10">
                        <div className="bg-gradient-to-b from-white/60 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 pb-5">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Alternative Exercises
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Tap to substitute {activeExercise.name}
                            </p>
                        </div>

                        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
                            {alternativeExercises[activeExercise.id].map((alt) => (
                                <button
                                    key={alt.id}
                                    onClick={() => handleSelectSubstitute(alt.id)}
                                    className="w-full text-left bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-2xl p-5 transition-all border border-gray-200 dark:border-white/20 active:scale-95 shadow-md"
                                >
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{alt.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alt.muscleGroup}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-medium">
                                        {alt.sets} sets × {alt.reps} reps @ {alt.weight}kg
                                    </p>
                                </button>
                            ))}
                        </div>

                        <div className="bg-gradient-to-t from-white/60 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-4">
                            <button
                                onClick={() => setShowSubstitutes(false)}
                                className="w-full h-14 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-bold rounded-2xl transition-all active:scale-95 border border-gray-300 dark:border-white/20"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Chat Modal */}
            {
                showAIChat && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full h-[80vh] overflow-hidden animate-slide-up shadow-2xl border border-gray-200/50 dark:border-white/10 flex flex-col">
                            {/* Header */}
                            <div className="bg-gradient-to-b from-white/60 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        AI Coach
                                    </h3>
                                    <button
                                        onClick={() => setShowAIChat(false)}
                                        className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
                                    >
                                        <span className="text-gray-900 dark:text-white font-bold text-xl">×</span>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Ask me anything about your workout
                                </p>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {/* Welcome message */}
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                                        <span className="text-white dark:text-black text-sm font-bold">AI</span>
                                    </div>
                                    <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-2xl p-3">
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            Hi! I&apos;m your AI workout coach. I can help you with exercise form, suggest alternatives, adjust weights, or answer any questions about {activeExercise.name}. How can I help?
                                        </p>
                                    </div>
                                </div>

                                {/* Chat messages */}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                                            ? 'bg-blue-500'
                                            : 'bg-gray-900 dark:bg-white'
                                            }`}>
                                            <span className={`text-sm font-bold ${msg.role === 'user'
                                                ? 'text-white'
                                                : 'text-white dark:text-black'
                                                }`}>
                                                {msg.role === 'user' ? 'U' : 'AI'}
                                            </span>
                                        </div>
                                        <div className={`flex-1 rounded-2xl p-3 ${msg.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-white/10'
                                            }`}>
                                            <p className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {/* Loading indicator */}
                                {chatLoading && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                                            <span className="text-white dark:text-black text-sm font-bold">AI</span>
                                        </div>
                                        <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-2xl p-3">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="bg-gradient-to-t from-white/60 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type your message..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                        className="flex-1 h-12 px-4 rounded-2xl bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                                    />
                                    <button
                                        onClick={sendChatMessage}
                                        disabled={chatLoading || !chatInput.trim()}
                                        className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center justify-center transition-all active:scale-95 shadow-lg disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/10 z-50 safe-bottom shadow-2xl">
                <div className="max-w-2xl mx-auto px-6 py-5">
                    {showRestTimer && !workoutComplete ? (
                        /* Rest Timer Mode */
                        <>
                            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full mb-4 overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 transition-all duration-1000 ease-linear rounded-full"
                                    style={{ width: `${restTimeTotal > 0 ? ((restTimeTotal - restTimeLeft) / restTimeTotal) * 100 : 0}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-1">Rest Time</p>
                                    <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
                                        {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, '0')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowRestTimer(false)}
                                    className="px-6 h-12 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-bold rounded-2xl transition-all active:scale-95 border border-gray-300 dark:border-white/20 shadow-lg"
                                >
                                    Skip Rest
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Action Buttons Mode */
                        <div className="flex items-center justify-between gap-3">
                            <Link
                                href="/"
                                className="flex-1 h-12 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-semibold rounded-2xl transition-all active:scale-95 border border-gray-300 dark:border-white/20 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </Link>
                            <button
                                onClick={() => setShowAIChat(true)}
                                className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 font-semibold rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                Talk to AI
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
