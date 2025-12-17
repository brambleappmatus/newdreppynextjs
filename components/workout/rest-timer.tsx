'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface RestTimerProps {
    seconds: number;
    onComplete: () => void;
    onSkip: () => void;
}

export function RestTimer({ seconds, onComplete, onSkip }: RestTimerProps) {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const progress = ((seconds - timeLeft) / seconds) * 100;

    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onComplete]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    const handleSkip = () => {
        onSkip();
    };

    if (timeLeft <= 0) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/10 z-50 safe-bottom shadow-2xl">
            <div className="max-w-2xl mx-auto px-6 py-6">
                {/* Progress bar with gradient */}
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full mb-5 overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-2">Rest Time</p>
                        <p className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums">
                            {formatTime(timeLeft)}
                        </p>
                    </div>

                    <button
                        onClick={handleSkip}
                        className="px-8 h-14 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-bold rounded-2xl transition-all active:scale-95 border border-gray-300 dark:border-white/20 shadow-lg"
                    >
                        Skip Rest
                    </button>
                </div>
            </div>
        </div>
    );
}
