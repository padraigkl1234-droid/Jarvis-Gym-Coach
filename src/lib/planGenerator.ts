/**
 * Rule-based weekly plan generator. Turns goal + equipment + days/week from
 * the athlete's profile into a full PlanDay[] using the exercise library —
 * no AI call, deterministic, and instantly explainable.
 */

import { type PlanDay, type Profile, type PlannedExercise } from '@/lib/store';
import { exercisesForEquipment, type LibraryExercise, type MuscleGroup } from '@/lib/exercises';

type Archetype = 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Cardio';

const ARCHETYPE_GROUPS: Record<Archetype, MuscleGroup[]> = {
  Push: ['Chest', 'Shoulders', 'Triceps'],
  Pull: ['Back', 'Biceps'],
  Legs: ['Legs', 'Core'],
  Upper: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
  Lower: ['Legs', 'Core'],
  'Full Body': ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'],
  Cardio: ['Cardio'],
};

// Split pattern by training days/week. Index 0 lands on Monday.
const SPLITS: Record<number, Archetype[]> = {
  1: ['Full Body'],
  2: ['Full Body', 'Full Body'],
  3: ['Push', 'Pull', 'Legs'],
  4: ['Upper', 'Lower', 'Upper', 'Lower'],
  5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
};

// Monday-first weekday slots for a given day count, spread across the week
// rather than clumped, so recovery lands between sessions where possible.
const WEEKDAY_SLOTS: Record<number, number[]> = {
  1: [3], // Wed
  2: [1, 4], // Mon, Thu
  3: [1, 3, 5], // Mon, Wed, Fri
  4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
  5: [1, 2, 3, 4, 5], // Mon-Fri
  6: [1, 2, 3, 4, 5, 6], // Mon-Sat
};

function isFatLoss(goal: string) {
  return /fat|lean|cut|lose/i.test(goal);
}
function isStrength(goal: string) {
  return /strong/i.test(goal);
}
function isMuscle(goal: string) {
  return /muscle|gain|bulk/i.test(goal);
}

/** Picks N exercises from the library for the given muscle groups, favoring compounds first. */
function pickExercises(pool: LibraryExercise[], groups: MuscleGroup[], count: number, goal: string): PlannedExercise[] {
  const candidates = pool.filter((ex) => groups.includes(ex.group) && ex.type === 'strength');
  // Strength goal: prioritize barbell compounds. Muscle/fat-loss: mix in more isolation for volume.
  const sorted = isStrength(goal)
    ? [...candidates].sort((a, b) => (a.equipment.includes('Barbell') ? -1 : 0) - (b.equipment.includes('Barbell') ? -1 : 0))
    : candidates;
  const picked = sorted.slice(0, count);
  const repRange = isStrength(goal) ? '4-6' : isFatLoss(goal) ? '12-15' : '8-10';
  const setCount = isStrength(goal) ? 5 : 4;
  return picked.map((ex) => ({
    name: ex.name,
    type: 'strength' as const,
    sets: ex.equipment.includes('Barbell') && isStrength(goal) ? setCount : ex.sets ?? 3,
    reps: ex.equipment.includes('Barbell') && isStrength(goal) ? repRange : ex.reps ?? '8-10',
  }));
}

/** Generates a full weekly plan from the athlete's current profile settings. */
export function generateSuggestedPlan(profile: Profile): PlanDay[] {
  const days = Math.min(6, Math.max(1, profile.daysPerWeek ?? 3));
  const split = SPLITS[days];
  const slots = WEEKDAY_SLOTS[days];
  const pool = exercisesForEquipment(profile.equipment);
  const cardioPool = pool.filter((ex) => ex.type === 'cardio');
  const goal = profile.goal || 'General fitness';

  const plan: PlanDay[] = split.map((archetype, i) => {
    const groups = ARCHETYPE_GROUPS[archetype];
    const exerciseCount = isMuscle(goal) ? 6 : isFatLoss(goal) ? 5 : isStrength(goal) ? 4 : 5;
    const exercises = pickExercises(pool, groups, exerciseCount, goal);

    // Fat loss: add a short cardio finisher to every session.
    if (isFatLoss(goal) && cardioPool.length > 0) {
      const cardio = cardioPool[i % cardioPool.length];
      exercises.push({ name: cardio.name, type: 'cardio', durationMin: cardio.durationMin, distanceKm: cardio.distanceKm });
    }

    return {
      weekday: slots[i],
      label: archetype,
      focus: groups.join(', '),
      exercises,
    };
  });

  return plan.sort((a, b) => a.weekday - b.weekday);
}
