'use client';

import { WorkoutExercise } from '@/lib/mock-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExerciseCardProps {
    exercise: WorkoutExercise;
    isActive: boolean;
    onSubstitute?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
}

export function ExerciseCard({ exercise, isActive, onSubstitute, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: ExerciseCardProps) {
    const completedSets = exercise.sets.filter(s => s.completed).length;
    const totalSets = exercise.sets.length;
    const allCompleted = completedSets === totalSets;

    return (
        <Card className={`transition-all ${isActive ? 'ring-2 ring-foreground shadow-strong' : ''} ${allCompleted ? 'opacity-60' : ''}`}>
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <CardTitle className={allCompleted ? 'line-through' : ''}>
                            {exercise.name}
                        </CardTitle>
                        <CardDescription>{exercise.muscleGroup}</CardDescription>
                    </div>

                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1">
                        {canMoveUp && (
                            <button
                                onClick={onMoveUp}
                                className="w-8 h-8 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center transition-colors"
                                aria-label="Move up"
                            >
                                ↑
                            </button>
                        )}
                        {canMoveDown && (
                            <button
                                onClick={onMoveDown}
                                className="w-8 h-8 rounded-lg bg-secondary hover:bg-foreground hover:text-background border border-foreground flex items-center justify-center transition-colors"
                                aria-label="Move down"
                            >
                                ↓
                            </button>
                        )}
                    </div>

                    {allCompleted && (
                        <div className="flex items-center justify-center w-8 h-8 bg-foreground rounded-full">
                            <span className="text-background text-lg">✓</span>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Sets Overview */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-semibold text-card-foreground">
                        {completedSets}/{totalSets} sets
                    </span>
                </div>

                {/* Set Details */}
                <div className="space-y-2">
                    {exercise.sets.map((set) => (
                        <div
                            key={set.setNumber}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${set.completed
                                    ? 'bg-foreground/10 border border-foreground'
                                    : set.setNumber === exercise.currentSet && isActive
                                        ? 'bg-secondary border-2 border-foreground'
                                        : 'bg-secondary/50 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${set.completed
                                            ? 'bg-foreground text-background'
                                            : 'bg-background text-foreground border border-foreground'
                                        }`}
                                >
                                    {set.completed ? '✓' : set.setNumber}
                                </div>
                                <span className="text-sm font-medium text-card-foreground">
                                    {set.targetReps} reps
                                </span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                                {set.weight} kg
                            </span>
                        </div>
                    ))}
                </div>

                {/* Notes */}
                {exercise.notes && (
                    <p className="text-xs text-muted-foreground italic">
                        💡 {exercise.notes}
                    </p>
                )}

                {/* Substitute Button */}
                {isActive && !allCompleted && onSubstitute && (
                    <div className="pt-2 border-t border-border">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={onSubstitute}
                        >
                            🔄 Substitute Exercise
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
