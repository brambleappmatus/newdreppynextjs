// Mock workout data for prototype
export interface Exercise {
    id: string;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: number | string; // Can be "8-12" for ranges
    weight?: number;
    restSeconds: number;
    notes?: string;
}

export interface WorkoutSet {
    setNumber: number;
    targetReps: number;
    completedReps?: number;
    weight?: number;
    completed: boolean;
    difficulty?: 'easy' | 'normal' | 'hard';
}

export interface WorkoutExercise extends Omit<Exercise, 'sets' | 'reps'> {
    currentSet: number;
    sets: WorkoutSet[];
}

export const mockWorkout = {
    id: 'workout-1',
    name: 'Upper Body Push',
    date: new Date().toISOString(),
    exercises: [
        {
            id: 'ex-1',
            name: 'Barbell Bench Press',
            muscleGroup: 'Chest',
            currentSet: 1,
            restSeconds: 180,
            notes: 'Main compound movement',
            sets: [
                { setNumber: 1, targetReps: 8, weight: 80, completed: false },
                { setNumber: 2, targetReps: 8, weight: 80, completed: false },
                { setNumber: 3, targetReps: 8, weight: 80, completed: false },
                { setNumber: 4, targetReps: 8, weight: 80, completed: false },
            ],
        },
        {
            id: 'ex-2',
            name: 'Incline Dumbbell Press',
            muscleGroup: 'Chest (Upper)',
            currentSet: 1,
            restSeconds: 120,
            sets: [
                { setNumber: 1, targetReps: 10, weight: 30, completed: false },
                { setNumber: 2, targetReps: 10, weight: 30, completed: false },
                { setNumber: 3, targetReps: 10, weight: 30, completed: false },
            ],
        },
        {
            id: 'ex-3',
            name: 'Overhead Press',
            muscleGroup: 'Shoulders',
            currentSet: 1,
            restSeconds: 120,
            sets: [
                { setNumber: 1, targetReps: 8, weight: 50, completed: false },
                { setNumber: 2, targetReps: 8, weight: 50, completed: false },
                { setNumber: 3, targetReps: 8, weight: 50, completed: false },
            ],
        },
        {
            id: 'ex-4',
            name: 'Lateral Raises',
            muscleGroup: 'Shoulders (Side)',
            currentSet: 1,
            restSeconds: 90,
            sets: [
                { setNumber: 1, targetReps: 12, weight: 12, completed: false },
                { setNumber: 2, targetReps: 12, weight: 12, completed: false },
                { setNumber: 3, targetReps: 12, weight: 12, completed: false },
            ],
        },
        {
            id: 'ex-5',
            name: 'Tricep Pushdowns',
            muscleGroup: 'Triceps',
            currentSet: 1,
            restSeconds: 90,
            sets: [
                { setNumber: 1, targetReps: 12, weight: 40, completed: false },
                { setNumber: 2, targetReps: 12, weight: 40, completed: false },
                { setNumber: 3, targetReps: 12, weight: 40, completed: false },
            ],
        },
    ] as WorkoutExercise[],
};

export const alternativeExercises: Record<string, Exercise[]> = {
    'ex-1': [
        {
            id: 'alt-1-1',
            name: 'Dumbbell Bench Press',
            muscleGroup: 'Chest',
            sets: 4,
            reps: 8,
            weight: 35,
            restSeconds: 180,
        },
        {
            id: 'alt-1-2',
            name: 'Machine Chest Press',
            muscleGroup: 'Chest',
            sets: 4,
            reps: 10,
            weight: 70,
            restSeconds: 120,
        },
    ],
    'ex-2': [
        {
            id: 'alt-2-1',
            name: 'Incline Barbell Press',
            muscleGroup: 'Chest (Upper)',
            sets: 3,
            reps: 8,
            weight: 60,
            restSeconds: 120,
        },
    ],
};
