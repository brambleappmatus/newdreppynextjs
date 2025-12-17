'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface WorkoutTemplate {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export default function ProgramsPage() {
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newProgramName, setNewProgramName] = useState('');
    const [creating, setCreating] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('workout_templates')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        setTemplates(data ?? []);
        setLoading(false);
    };

    const createProgram = async () => {
        if (!newProgramName.trim()) return;
        setCreating(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('workout_templates').insert({
            user_id: user.id,
            name: newProgramName.trim(),
        });

        setNewProgramName('');
        setShowNewModal(false);
        setCreating(false);
        fetchTemplates();
    };

    const deleteProgram = async (id: string) => {
        if (!confirm('Delete this program?')) return;
        await supabase.from('workout_templates').delete().eq('id', id);
        fetchTemplates();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Programs</h1>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">📋</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No programs yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first workout program</p>
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl"
                        >
                            Create Program
                        </button>
                    </div>
                ) : (
                    templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-white/10"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {template.name}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Updated {new Date(template.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/programs/${template.id}`}
                                        className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </Link>
                                    <button
                                        onClick={() => deleteProgram(template.id)}
                                        className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Program Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Program</h2>
                        <input
                            type="text"
                            value={newProgramName}
                            onChange={(e) => setNewProgramName(e.target.value)}
                            placeholder="Program name..."
                            className="w-full h-12 px-4 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="flex-1 h-12 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createProgram}
                                disabled={!newProgramName.trim() || creating}
                                className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
