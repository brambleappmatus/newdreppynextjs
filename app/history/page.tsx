'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface WorkoutSession {
    id: string;
    name: string;
    status: string;
    started_at: string;
    completed_at: string | null;
}

export default function HistoryPage() {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false });

        setSessions(data ?? []);
        setLoading(false);
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return 'In progress';
        const duration = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(duration / 60000);
        return `${minutes} min`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Workout History</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">📊</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Complete your first workout to see it here</p>
                        <Link
                            href="/workout"
                            className="inline-block px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl"
                        >
                            Start Workout
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-white/10">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {sessions.filter(s => s.status === 'completed').length}
                                </p>
                                <p className="text-sm text-gray-500">Total Workouts</p>
                            </div>
                            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-white/10">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {sessions.length > 0
                                        ? new Date(sessions[0].started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : '--'
                                    }
                                </p>
                                <p className="text-sm text-gray-500">Last Workout</p>
                            </div>
                        </div>

                        {/* Session List */}
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-white/10"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {session.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(session.started_at).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                            })} • {formatDuration(session.started_at, session.completed_at)}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${session.status === 'completed'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        }`}>
                                        {session.status === 'completed' ? '✓ Completed' : 'In Progress'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
