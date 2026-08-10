/**
 * A curated exercise library used to power equipment-aware suggestions when
 * building a training day. Each exercise declares which equipment tags it
 * needs — an athlete whose profile.equipment includes 'Full gym' (or none of
 * these tags overlap their selection) sees everything; otherwise only
 * exercises they can actually do with their gear are shown, plus bodyweight
 * moves, which need nothing.
 */

export type EquipmentTag = 'Dumbbells' | 'Barbell' | 'Machines' | 'Bands' | 'Bodyweight';
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Legs' | 'Core' | 'Cardio';

export interface LibraryExercise {
  name: string;
  group: MuscleGroup;
  equipment: EquipmentTag[]; // any one of these being available is enough
  type: 'strength' | 'cardio';
  sets?: number;
  reps?: string;
  durationMin?: number;
  distanceKm?: number;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { name: 'Barbell Bench Press', group: 'Chest', equipment: ['Barbell'], type: 'strength', sets: 4, reps: '6-8' },
  { name: 'Dumbbell Bench Press', group: 'Chest', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Incline Dumbbell Press', group: 'Chest', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Machine Chest Press', group: 'Chest', equipment: ['Machines'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Cable Fly', group: 'Chest', equipment: ['Machines'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Push-Ups', group: 'Chest', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '10-15' },
  { name: 'Dips', group: 'Chest', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '8-12' },
  { name: 'Resistance Band Chest Press', group: 'Chest', equipment: ['Bands'], type: 'strength', sets: 3, reps: '12-15' },

  // Back
  { name: 'Barbell Row', group: 'Back', equipment: ['Barbell'], type: 'strength', sets: 4, reps: '6-8' },
  { name: 'Deadlift', group: 'Back', equipment: ['Barbell'], type: 'strength', sets: 4, reps: '5-6' },
  { name: 'Dumbbell Row', group: 'Back', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Lat Pulldown', group: 'Back', equipment: ['Machines'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Seated Cable Row', group: 'Back', equipment: ['Machines'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Pull-Ups', group: 'Back', equipment: ['Bodyweight'], type: 'strength', sets: 4, reps: 'max' },
  { name: 'Inverted Rows', group: 'Back', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '8-12' },
  { name: 'Resistance Band Row', group: 'Back', equipment: ['Bands'], type: 'strength', sets: 3, reps: '12-15' },

  // Shoulders
  { name: 'Overhead Press (Barbell)', group: 'Shoulders', equipment: ['Barbell'], type: 'strength', sets: 4, reps: '5-6' },
  { name: 'Dumbbell Shoulder Press', group: 'Shoulders', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Lateral Raises', group: 'Shoulders', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '12-15' },
  { name: 'Rear Delt Fly', group: 'Shoulders', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '15-20' },
  { name: 'Machine Shoulder Press', group: 'Shoulders', equipment: ['Machines'], type: 'strength', sets: 4, reps: '8-10' },
  { name: 'Cable Lateral Raise', group: 'Shoulders', equipment: ['Machines'], type: 'strength', sets: 4, reps: '12-15' },
  { name: 'Pike Push-Ups', group: 'Shoulders', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '8-12' },
  { name: 'Band Lateral Raise', group: 'Shoulders', equipment: ['Bands'], type: 'strength', sets: 3, reps: '12-15' },

  // Arms — split by which day they actually belong on (curls pull, presses push).
  { name: 'Barbell Curl', group: 'Biceps', equipment: ['Barbell'], type: 'strength', sets: 3, reps: '10-12' },
  { name: 'Dumbbell Curl', group: 'Biceps', equipment: ['Dumbbells'], type: 'strength', sets: 3, reps: '10-12' },
  { name: 'Hammer Curl', group: 'Biceps', equipment: ['Dumbbells'], type: 'strength', sets: 3, reps: '10-12' },
  { name: 'Cable Curl', group: 'Biceps', equipment: ['Machines'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Band Curl', group: 'Biceps', equipment: ['Bands'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Close-Grip Bench Press', group: 'Triceps', equipment: ['Barbell'], type: 'strength', sets: 3, reps: '8-10' },
  { name: 'Tricep Pushdown', group: 'Triceps', equipment: ['Machines'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Bench Dips', group: 'Triceps', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '10-15' },

  // Legs
  { name: 'Barbell Back Squat', group: 'Legs', equipment: ['Barbell'], type: 'strength', sets: 4, reps: '6-8' },
  { name: 'Romanian Deadlift', group: 'Legs', equipment: ['Barbell'], type: 'strength', sets: 4, reps: '6-8' },
  { name: 'Goblet Squat', group: 'Legs', equipment: ['Dumbbells'], type: 'strength', sets: 4, reps: '10-12' },
  { name: 'Dumbbell Lunges', group: 'Legs', equipment: ['Dumbbells'], type: 'strength', sets: 3, reps: '10-12' },
  { name: 'Leg Press', group: 'Legs', equipment: ['Machines'], type: 'strength', sets: 4, reps: '10-12' },
  { name: 'Leg Extension', group: 'Legs', equipment: ['Machines'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Seated Leg Curl', group: 'Legs', equipment: ['Machines'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Calf Raise', group: 'Legs', equipment: ['Machines', 'Dumbbells', 'Bodyweight'], type: 'strength', sets: 4, reps: '12-15' },
  { name: 'Bodyweight Squat', group: 'Legs', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '15-20' },
  { name: 'Walking Lunges', group: 'Legs', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '12-16' },
  { name: 'Band Squat', group: 'Legs', equipment: ['Bands'], type: 'strength', sets: 3, reps: '15-20' },

  // Core
  { name: 'Hanging Knee Raises', group: 'Core', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '12-15' },
  { name: 'Plank', group: 'Core', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '30-60s' },
  { name: 'Cable Crunch', group: 'Core', equipment: ['Machines'], type: 'strength', sets: 3, reps: '15-20' },
  { name: 'Ab Wheel Rollout', group: 'Core', equipment: ['Bodyweight'], type: 'strength', sets: 3, reps: '8-12' },
  { name: 'Russian Twists', group: 'Core', equipment: ['Bodyweight', 'Dumbbells'], type: 'strength', sets: 3, reps: '20' },

  // Cardio (no equipment needed)
  { name: 'Run', group: 'Cardio', equipment: ['Bodyweight'], type: 'cardio', distanceKm: 5 },
  { name: 'Cycling', group: 'Cardio', equipment: ['Machines'], type: 'cardio', durationMin: 30 },
  { name: 'Rowing Machine', group: 'Cardio', equipment: ['Machines'], type: 'cardio', durationMin: 20 },
  { name: 'Jump Rope', group: 'Cardio', equipment: ['Bodyweight'], type: 'cardio', durationMin: 10 },
  { name: 'Stair Climber', group: 'Cardio', equipment: ['Machines'], type: 'cardio', durationMin: 15 },
];

/** Filters the library to exercises the athlete can actually do with their equipment. */
export function exercisesForEquipment(equipment: string[] | undefined): LibraryExercise[] {
  if (!equipment || equipment.length === 0 || equipment.includes('Full gym')) return EXERCISE_LIBRARY;
  const has = new Set(equipment);
  return EXERCISE_LIBRARY.filter((ex) => ex.equipment.some((tag) => has.has(tag) || tag === 'Bodyweight'));
}
