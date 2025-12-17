'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Step = 'profile' | 'goals' | 'experience' | 'schedule';

const goals = [
    { id: 'strength', label: 'Build Strength', icon: '💪', desc: 'Lift heavier weights' },
    { id: 'muscle', label: 'Build Muscle', icon: '🏋️', desc: 'Increase muscle mass' },
    { id: 'endurance', label: 'Improve Endurance', icon: '🏃', desc: 'Train longer and harder' },
    { id: 'lose_fat', label: 'Lose Fat', icon: '🔥', desc: 'Burn calories and get lean' },
    { id: 'general', label: 'General Fitness', icon: '⚡', desc: 'Overall health and wellness' },
];

const experienceLevels = [
    { id: 'beginner', label: 'Beginner', desc: 'New to strength training', months: '0-6 months' },
    { id: 'intermediate', label: 'Intermediate', desc: 'Consistent training experience', months: '6-24 months' },
    { id: 'advanced', label: 'Advanced', desc: 'Years of dedicated training', months: '2+ years' },
];

const daysPerWeek = [2, 3, 4, 5, 6];

export default function OnboardingPage() {
    const [step, setStep] = useState<Step>('profile');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [experience, setExperience] = useState<string>('');
    const [trainingDays, setTrainingDays] = useState<number>(4);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // Pre-fill email-based name if available
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                const emailName = user.email.split('@')[0];
                setName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
            }
        };
        getUser();
    }, [supabase.auth]);

    const toggleGoal = (goalId: string) => {
        setSelectedGoals(prev =>
            prev.includes(goalId)
                ? prev.filter(g => g !== goalId)
                : [...prev, goalId]
        );
    };

    const nextStep = () => {
        const steps: Step[] = ['profile', 'goals', 'experience', 'schedule'];
        const currentIndex = steps.indexOf(step);
        if (currentIndex < steps.length - 1) {
            setStep(steps[currentIndex + 1]);
        }
    };

    const prevStep = () => {
        const steps: Step[] = ['profile', 'goals', 'experience', 'schedule'];
        const currentIndex = steps.indexOf(step);
        if (currentIndex > 0) {
            setStep(steps[currentIndex - 1]);
        }
    };

    const completeOnboarding = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Update or create profile
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                full_name: name,
                updated_at: new Date().toISOString(),
            });

            // Store preferences (we can add a preferences table later or use jsonb)
            // For now, just complete onboarding
        }

        router.push('/');
        router.refresh();
    };

    const canProceed = () => {
        switch (step) {
            case 'profile': return name.trim().length >= 2;
            case 'goals': return selectedGoals.length > 0;
            case 'experience': return experience !== '';
            case 'schedule': return true;
            default: return false;
        }
    };

    const stepIndex = ['profile', 'goals', 'experience', 'schedule'].indexOf(step);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex flex-col">
            {/* Progress Bar */}
            <div className="p-6">
                <div className="max-w-md mx-auto">
                    <div className="flex gap-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all ${i <= stepIndex
                                        ? 'bg-gray-900 dark:bg-white'
                                        : 'bg-gray-200 dark:bg-white/20'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Profile Step */}
                    {step === 'profile' && (
                        <div className="animate-fade-in">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
                                What should we call you?
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                                This is how you&apos;ll appear in the app
                            </p>

                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-lg text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all"
                                placeholder="Your name"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Goals Step */}
                    {step === 'goals' && (
                        <div className="animate-fade-in">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
                                What are your goals?
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                                Select all that apply
                            </p>

                            <div className="space-y-3">
                                {goals.map((goal) => (
                                    <button
                                        key={goal.id}
                                        onClick={() => toggleGoal(goal.id)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedGoals.includes(goal.id)
                                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                                            }`}
                                    >
                                        <span className="text-2xl">{goal.icon}</span>
                                        <div className="text-left">
                                            <p className={`font-semibold ${selectedGoals.includes(goal.id)
                                                    ? 'text-white dark:text-black'
                                                    : 'text-gray-900 dark:text-white'
                                                }`}>
                                                {goal.label}
                                            </p>
                                            <p className={`text-sm ${selectedGoals.includes(goal.id)
                                                    ? 'text-gray-300 dark:text-gray-600'
                                                    : 'text-gray-500'
                                                }`}>
                                                {goal.desc}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Experience Step */}
                    {step === 'experience' && (
                        <div className="animate-fade-in">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
                                Your experience level?
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                                This helps us personalize your workouts
                            </p>

                            <div className="space-y-3">
                                {experienceLevels.map((level) => (
                                    <button
                                        key={level.id}
                                        onClick={() => setExperience(level.id)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${experience === level.id
                                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                                            }`}
                                    >
                                        <p className={`font-semibold ${experience === level.id
                                                ? 'text-white dark:text-black'
                                                : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {level.label}
                                        </p>
                                        <p className={`text-sm ${experience === level.id
                                                ? 'text-gray-300 dark:text-gray-600'
                                                : 'text-gray-500'
                                            }`}>
                                            {level.desc} · {level.months}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Schedule Step */}
                    {step === 'schedule' && (
                        <div className="animate-fade-in">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
                                How often can you train?
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                                We&apos;ll build a program that fits your schedule
                            </p>

                            <div className="flex justify-center gap-3">
                                {daysPerWeek.map((days) => (
                                    <button
                                        key={days}
                                        onClick={() => setTrainingDays(days)}
                                        className={`w-14 h-14 rounded-2xl border-2 font-bold text-lg transition-all ${trainingDays === days
                                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-black'
                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-white/30'
                                            }`}
                                    >
                                        {days}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-gray-500 mt-4">
                                {trainingDays} days per week
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="p-6">
                <div className="max-w-md mx-auto flex gap-3">
                    {step !== 'profile' && (
                        <button
                            onClick={prevStep}
                            className="h-14 px-8 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={step === 'schedule' ? completeOnboarding : nextStep}
                        disabled={!canProceed() || loading}
                        className="flex-1 h-14 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Setting up...' : step === 'schedule' ? 'Get Started' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
