'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Exercise {
    id: string;
    name: string;
    equipment: string;
    body_part: string;
    target_muscle: string;
    rating: number;
}

const bodyParts = ['All', 'Chest', 'Back', 'Shoulder', 'Upper Arms', 'Forearms', 'Thighs', 'Calves', 'Waist', 'Hips', 'Neck'];
const equipmentTypes = ['All', 'Barbell', 'Dumbbell', 'Cable', 'Body Weight', 'Lever (plate loaded)', 'Lever (selectorized)', 'Smith', 'Band', 'Weighted'];

export default function ExercisesPage() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [bodyPart, setBodyPart] = useState('All');
    const [equipment, setEquipment] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const supabase = createClient();

    const fetchExercises = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('exercises')
            .select('*')
            .order('rating', { ascending: false })
            .limit(50);

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        if (bodyPart !== 'All') {
            query = query.eq('body_part', bodyPart);
        }
        if (equipment !== 'All') {
            query = query.eq('equipment', equipment);
        }

        const { data } = await query;
        setExercises(data ?? []);
        setLoading(false);
    }, [supabase, search, bodyPart, equipment]);

    useEffect(() => {
        const debounce = setTimeout(fetchExercises, 300);
        return () => clearTimeout(debounce);
    }, [fetchExercises]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Link
                            href="/"
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Exercise Library</h1>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search exercises..."
                            className="flex-1 h-12 px-4 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        />
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showFilters || bodyPart !== 'All' || equipment !== 'All'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="mt-4 space-y-3 animate-fade-in">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Body Part
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {bodyParts.map((part) => (
                                        <button
                                            key={part}
                                            onClick={() => setBodyPart(part)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${bodyPart === part
                                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {part}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Equipment
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {equipmentTypes.map((eq) => (
                                        <button
                                            key={eq}
                                            onClick={() => setEquipment(eq)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${equipment === eq
                                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {eq}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Exercise List */}
            <div className="p-4 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : exercises.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No exercises found</p>
                    </div>
                ) : (
                    exercises.map((exercise) => (
                        <div
                            key={exercise.id}
                            className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-white/10"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {exercise.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                            {exercise.body_part}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                            {exercise.equipment}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Target: {exercise.target_muscle.replace(',', '')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <span
                                            key={i}
                                            className={`text-xs ${i < exercise.rating
                                                    ? 'text-yellow-500'
                                                    : 'text-gray-300 dark:text-gray-600'
                                                }`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
