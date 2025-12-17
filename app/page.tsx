import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Home() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If not logged in, show landing page
    if (!user) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
                <div className="max-w-md w-full space-y-8 text-center">
                    {/* Logo/Brand */}
                    <div className="space-y-4">
                        <div className="w-20 h-20 mx-auto bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-xl">
                            <span className="text-3xl font-black text-white dark:text-black">D</span>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                            Dreppy
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Zero-Friction Adaptive Workouts
                        </p>
                    </div>

                    {/* Value Proposition */}
                    <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200/50 dark:border-white/10 shadow-xl">
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Show up. Train.
                            <br />
                            <span className="font-bold">
                                The plan adapts automatically.
                            </span>
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                            No planning. No tracking. No gym chaos.
                            <br />
                            Just intelligent workouts that adjust to you.
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="space-y-3">
                        <Link
                            href="/signup"
                            className="block w-full bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-4 px-6 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg"
                        >
                            Get Started
                        </Link>
                        <Link
                            href="/login"
                            className="block w-full bg-white dark:bg-white/10 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-2xl border border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/20 transition-all"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    // If no profile name, redirect to onboarding
    if (!profile?.full_name) {
        redirect('/onboarding');
    }

    // Get user's latest workout template
    const { data: templates } = await supabase
        .from('workout_templates')
        .select('id, name')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

    // Get recent workout sessions
    const { data: recentSessions } = await supabase
        .from('workout_sessions')
        .select('id, name, status, started_at, completed_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5);

    const completedWorkouts = recentSessions?.filter(s => s.status === 'completed').length ?? 0;

    return (
        <main className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000]">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="px-5 pt-14 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Welcome back</p>
                            <h1 className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight">
                                {profile.full_name}
                            </h1>
                        </div>
                        <Link
                            href="/settings"
                            className="w-11 h-11 rounded-full bg-white dark:bg-[#1c1c1e] flex items-center justify-center shadow-sm border border-gray-200/60 dark:border-white/10"
                        >
                            <svg className="w-[22px] h-[22px] text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </Link>
                    </div>
                </div>

                <div className="px-5 space-y-5 pb-32">
                    {/* My Programs - Selectable */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                                Start a Workout
                            </h3>
                            <Link
                                href="/programs/new"
                                className="text-[13px] font-semibold text-blue-600 dark:text-blue-400"
                            >
                                + New Program
                            </Link>
                        </div>

                        {templates && templates.length > 0 ? (
                            <div className="space-y-2">
                                {templates.map((template) => (
                                    <Link
                                        key={template.id}
                                        href={`/workout?program=${template.id}`}
                                        className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] block"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[15px] text-gray-900 dark:text-white">{template.name}</p>
                                                <p className="text-[13px] text-gray-500 dark:text-gray-400">Tap to start</p>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 shadow-sm border border-gray-200/60 dark:border-white/5 text-center">
                                <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <p className="text-[15px] font-medium text-gray-900 dark:text-white mb-1">No programs yet</p>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">Create your first workout program</p>
                                <Link
                                    href="/programs/new"
                                    className="inline-block bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-2.5 px-5 rounded-xl text-[14px]"
                                >
                                    Create Program
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                            <p className="text-[28px] font-bold text-gray-900 dark:text-white">{completedWorkouts}</p>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Workouts</p>
                        </div>
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                            <p className="text-[28px] font-bold text-gray-900 dark:text-white">0</p>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Day Streak</p>
                        </div>
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5">
                            <p className="text-[28px] font-bold text-gray-900 dark:text-white">--</p>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">PRs</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h3 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/programs"
                                className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-[15px] text-gray-900 dark:text-white">Programs</p>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">Manage workouts</p>
                                </div>
                            </Link>
                            <Link
                                href="/exercises"
                                className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-[15px] text-gray-900 dark:text-white">Exercises</p>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">Browse library</p>
                                </div>
                            </Link>
                            <Link
                                href="/history"
                                className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-[15px] text-gray-900 dark:text-white">History</p>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">Past workouts</p>
                                </div>
                            </Link>
                            <Link
                                href="/settings"
                                className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-[15px] text-gray-900 dark:text-white">Settings</p>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">Preferences</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Workouts */}
                    {recentSessions && recentSessions.length > 0 && (
                        <div>
                            <h3 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
                                Recent Workouts
                            </h3>
                            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-200/60 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                                {recentSessions.slice(0, 3).map((session) => (
                                    <div
                                        key={session.id}
                                        className="p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.status === 'completed'
                                                ? 'bg-green-50 dark:bg-green-500/20'
                                                : 'bg-amber-50 dark:bg-amber-500/20'
                                                }`}>
                                                {session.status === 'completed' ? (
                                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[15px] text-gray-900 dark:text-white">{session.name}</p>
                                                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                                                    {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${session.status === 'completed'
                                            ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                            : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                            }`}>
                                            {session.status === 'completed' ? 'Completed' : 'In Progress'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
