'use client';

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
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
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Account Section */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                        Account
                    </h2>
                    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/10 overflow-hidden">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">👤</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Profile</p>
                                    <p className="text-sm text-gray-500">Edit your profile info</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <div className="h-px bg-gray-200 dark:bg-white/10"></div>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">🎯</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Goals</p>
                                    <p className="text-sm text-gray-500">Update your fitness goals</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                        Preferences
                    </h2>
                    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/10 overflow-hidden">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">⏱️</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Rest Timer</p>
                                    <p className="text-sm text-gray-500">Default: 90 seconds</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <div className="h-px bg-gray-200 dark:bg-white/10"></div>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">⚖️</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">Units</p>
                                    <p className="text-sm text-gray-500">Metric (kg)</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Logout */}
                <div className="pt-4">
                    <button
                        onClick={handleLogout}
                        className="w-full p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-2xl hover:bg-red-200 dark:hover:bg-red-900/30 transition-all"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Version */}
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 pt-4">
                    Dreppy v0.1.0
                </p>
            </div>
        </div>
    );
}
