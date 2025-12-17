'use client';

import { useState } from 'react';
import { WorkoutSet } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';

interface SetTrackerProps {
    sets: WorkoutSet[];
    currentSet: number;
    exerciseName: string;
    onSetComplete: (setNumber: number, reps: number, weight: number, difficulty?: 'easy' | 'normal' | 'hard') => void;
    onSwapExercise?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
}

export function SetTracker({
    sets,
    currentSet,
    exerciseName,
    onSetComplete,
    onSwapExercise,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown
}: SetTrackerProps) {
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const currentSetData = sets[currentSet - 1];
    const [currentWeight, setCurrentWeight] = useState(currentSetData?.weight || 0);

    if (!currentSetData) return null;

    const handleComplete = () => {
        onSetComplete(currentSet, currentSetData.targetReps, currentWeight, selectedDifficulty);
        setSelectedDifficulty('normal');
    };

    const adjustWeight = (delta: number) => {
        setCurrentWeight(prev => Math.max(0, prev + delta));
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-foreground z-50 safe-bottom">
            <div className="max-w-2xl mx-auto">
                {/* Exercise Header with Quick Actions */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Current Exercise</p>
                        <p className="text-sm font-bold text-foreground truncate">{exerciseName}</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1">
                        {canMoveUp && (
                            <button
                                onClick={onMoveUp}
                                className="w-9 h-9 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center transition-colors"
                                aria-label="Move exercise up"
                            >
                                ↑
                            </button>
                        )}
                        {canMoveDown && (
                            <button
                                onClick={onMoveDown}
                                className="w-9 h-9 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center transition-colors"
                                aria-label="Move exercise down"
                            >
                                ↓
                            </button>
                        )}
                        {onSwapExercise && (
                            <button
                                onClick={onSwapExercise}
                                className="px-3 h-9 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center transition-colors text-xs font-medium whitespace-nowrap"
                                aria-label="Swap exercise"
                            >
                                🔄 Swap
                            </button>
                        )}
                    </div>
                </div>

                {/* Set Progress Dots */}
                <div className="px-4 pt-3 pb-2">
                    <div className="flex gap-2">
                        {sets.map((set) => (
                            <div
                                key={set.setNumber}
                                className={`flex-1 h-1.5 rounded-full transition-all ${set.completed
                                        ? 'bg-foreground'
                                        : set.setNumber === currentSet
                                            ? 'bg-foreground/40'
                                            : 'bg-border'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Main Set Info */}
                <div className="px-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        {/* Set & Reps */}
                        <div>
                            <p className="text-xs text-muted-foreground">Set {currentSet} of {sets.length}</p>
                            <p className="text-2xl font-bold text-foreground">
                                {currentSetData.targetReps} <span className="text-sm text-muted-foreground">reps</span>
                            </p>
                        </div>

                        {/* Weight Adjustment */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => adjustWeight(-2.5)}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center font-bold text-lg transition-colors"
                            >
                                −
                            </button>
                            <div className="text-center min-w-[70px]">
                                <p className="text-xs text-muted-foreground">Weight</p>
                                <p className="text-xl font-bold text-foreground">
                                    {currentWeight}<span className="text-sm text-muted-foreground">kg</span>
                                </p>
                            </div>
                            <button
                                onClick={() => adjustWeight(2.5)}
                                className="w-10 h-10 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center font-bold text-lg transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Difficulty Feedback */}
                    <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">How did it feel?</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setSelectedDifficulty('easy')}
                                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border-2 ${selectedDifficulty === 'easy'
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-background text-foreground border-border hover:border-foreground'
                                    }`}
                            >
                                😊 Easy
                            </button>
                            <button
                                onClick={() => setSelectedDifficulty('normal')}
                                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border-2 ${selectedDifficulty === 'normal'
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-background text-foreground border-border hover:border-foreground'
                                    }`}
                            >
                                💪 Good
                            </button>
                            <button
                                onClick={() => setSelectedDifficulty('hard')}
                                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border-2 ${selectedDifficulty === 'hard'
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-background text-foreground border-border hover:border-foreground'
                                    }`}
                            >
                                🔥 Hard
                            </button>
                        </div>
                    </div>

                    {/* Complete Button */}
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full h-12 text-base"
                        onClick={handleComplete}
                    >
                        Complete Set
                    </Button>
                </div>
            </div>
        </div>
    );
}
