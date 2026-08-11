/**
 * A trophy cabinet built entirely from data already in the store — no new
 * logging required. Each trophy defines how to read its progress out of
 * sets/sessions/meals/water/metrics, and (once earned) the date the
 * milestone was first crossed, worked out by replaying the relevant entries
 * in chronological order rather than just checking the current total.
 */

import type { JarvisStore } from './store';

export type TrophyCategory = 'cardio' | 'strength' | 'consistency' | 'nutrition' | 'body';

export const TROPHY_CATEGORY_LABEL: Record<TrophyCategory, string> = {
  cardio: 'Cardio',
  strength: 'Strength',
  consistency: 'Consistency',
  nutrition: 'Nutrition',
  body: 'Body',
};

export interface Trophy {
  id: string;
  label: string;
  description: string;
  category: TrophyCategory;
  target: number;
  unit: string;
  /** Raw progress toward `target` — not capped, so a trophy can show e.g. "127 / 100kg". */
  current: number;
  /** Date the milestone was first reached, or null if not yet earned. */
  earnedDate: string | null;
}

interface TrophyDef {
  id: string;
  label: string;
  description: string;
  category: TrophyCategory;
  target: number;
  unit: string;
  evaluate: (store: JarvisStore) => { current: number; earnedDate: string | null };
}

/** Running sum of dated values; earnedDate is the date the cumulative total first hit `target`. */
function sumMilestone(items: { date: string; value: number }[], target: number): { current: number; earnedDate: string | null } {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  let total = 0;
  let earnedDate: string | null = null;
  for (const it of sorted) {
    total += it.value;
    if (earnedDate === null && total >= target) earnedDate = it.date;
  }
  return { current: total, earnedDate };
}

/** Best single dated value; earnedDate is the date it first hit `target`. */
function maxMilestone(items: { date: string; value: number }[], target: number): { current: number; earnedDate: string | null } {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let earnedDate: string | null = null;
  for (const it of sorted) {
    if (it.value > best) best = it.value;
    if (earnedDate === null && it.value >= target) earnedDate = it.date;
  }
  return { current: best, earnedDate };
}

/** Count of qualifying dates; earnedDate is the date the Nth one landed. */
function countMilestone(dates: string[], target: number): { current: number; earnedDate: string | null } {
  const sorted = [...dates].sort();
  const current = sorted.length;
  const earnedDate = current >= target ? sorted[target - 1] : null;
  return { current, earnedDate };
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Longest run of consecutive calendar days in `dates`; earnedDate is the day the run first reached `target` days long. */
function streakMilestone(dates: string[], target: number): { current: number; earnedDate: string | null } {
  const uniq = Array.from(new Set(dates)).sort();
  let bestLen = 0;
  let runLen = 0;
  let earnedDate: string | null = null;
  let prev: string | null = null;
  for (const d of uniq) {
    runLen = prev != null && daysBetween(prev, d) === 1 ? runLen + 1 : 1;
    if (runLen > bestLen) bestLen = runLen;
    if (earnedDate === null && runLen >= target) earnedDate = d;
    prev = d;
  }
  return { current: bestLen, earnedDate };
}

function matchesAny(name: string, keywords: string[]): boolean {
  const n = name.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

function proteinDaysHit(store: JarvisStore): string[] {
  const target = store.profile.proteinTargetG;
  if (!target) return [];
  const byDate = new Map<string, number>();
  for (const m of store.meals) byDate.set(m.date, (byDate.get(m.date) ?? 0) + m.proteinG);
  return Array.from(byDate.entries())
    .filter(([, g]) => g >= target * 0.9)
    .map(([d]) => d);
}

function waterDaysHit(store: JarvisStore): string[] {
  const target = store.profile.hydrationTargetMl;
  if (!target) return [];
  return store.water.filter((w) => w.ml >= target).map((w) => w.date);
}

function activityDates(store: JarvisStore): string[] {
  const sessionDates = store.sessions.filter((s) => s.status === 'completed').map((s) => s.date);
  const setDates = store.sets.map((s) => s.date);
  return [...sessionDates, ...setDates];
}

const TROPHY_DEFS: TrophyDef[] = [
  // Cardio — distance is exercise-agnostic (a run, a ride, a row all count).
  {
    id: 'cardio-5k',
    label: 'First 5K',
    description: 'Cover 5km or more in a single cardio session.',
    category: 'cardio',
    target: 5,
    unit: 'km',
    evaluate: (s) => maxMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), 5),
  },
  {
    id: 'cardio-10k',
    label: 'First 10K',
    description: 'Cover 10km or more in a single cardio session.',
    category: 'cardio',
    target: 10,
    unit: 'km',
    evaluate: (s) => maxMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), 10),
  },
  {
    id: 'cardio-half',
    label: 'Half Marathon',
    description: 'Cover 21.1km in a single cardio session.',
    category: 'cardio',
    target: 21.1,
    unit: 'km',
    evaluate: (s) => maxMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), 21.1),
  },
  {
    id: 'cardio-full',
    label: 'Marathon',
    description: 'Cover 42.2km in a single cardio session.',
    category: 'cardio',
    target: 42.2,
    unit: 'km',
    evaluate: (s) => maxMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), 42.2),
  },
  {
    id: 'cardio-50-lifetime',
    label: '50km Club',
    description: 'Rack up 50km of cardio, lifetime.',
    category: 'cardio',
    target: 50,
    unit: 'km',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), 50),
  },
  {
    id: 'cardio-100-lifetime',
    label: '100km Club',
    description: 'Rack up 100km of cardio, lifetime.',
    category: 'cardio',
    target: 100,
    unit: 'km',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), 100),
  },

  // Strength
  {
    id: 'strength-bench-50',
    label: 'Bench Press x50',
    description: 'Log 50 total bench press reps.',
    category: 'strength',
    target: 50,
    unit: 'reps',
    evaluate: (s) =>
      sumMilestone(
        s.sets.filter((x) => x.reps != null && matchesAny(x.exercise, ['bench press'])).map((x) => ({ date: x.date, value: x.reps! })),
        50
      ),
  },
  {
    id: 'strength-squat-50',
    label: 'Squat x50',
    description: 'Log 50 total squat reps.',
    category: 'strength',
    target: 50,
    unit: 'reps',
    evaluate: (s) =>
      sumMilestone(
        s.sets.filter((x) => x.reps != null && matchesAny(x.exercise, ['squat'])).map((x) => ({ date: x.date, value: x.reps! })),
        50
      ),
  },
  {
    id: 'strength-deadlift-50',
    label: 'Deadlift x50',
    description: 'Log 50 total deadlift reps.',
    category: 'strength',
    target: 50,
    unit: 'reps',
    evaluate: (s) =>
      sumMilestone(
        s.sets.filter((x) => x.reps != null && matchesAny(x.exercise, ['deadlift'])).map((x) => ({ date: x.date, value: x.reps! })),
        50
      ),
  },
  {
    id: 'strength-century',
    label: 'Century Lift',
    description: 'Log a single set at 100kg or more, any lift.',
    category: 'strength',
    target: 100,
    unit: 'kg',
    evaluate: (s) => maxMilestone(s.sets.filter((x) => x.weightKg != null).map((x) => ({ date: x.date, value: x.weightKg! })), 100),
  },
  {
    id: 'strength-1000-reps',
    label: '1,000 Reps',
    description: 'Log 1,000 reps, lifetime, across all lifts.',
    category: 'strength',
    target: 1000,
    unit: 'reps',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.reps != null).map((x) => ({ date: x.date, value: x.reps! })), 1000),
  },
  {
    id: 'strength-5000-reps',
    label: '5,000 Reps',
    description: 'Log 5,000 reps, lifetime, across all lifts.',
    category: 'strength',
    target: 5000,
    unit: 'reps',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.reps != null).map((x) => ({ date: x.date, value: x.reps! })), 5000),
  },

  // Consistency
  {
    id: 'consistency-first-session',
    label: 'First Session',
    description: 'Complete your first workout.',
    category: 'consistency',
    target: 1,
    unit: 'sessions',
    evaluate: (s) => countMilestone(s.sessions.filter((x) => x.status === 'completed').map((x) => x.date), 1),
  },
  {
    id: 'consistency-10-sessions',
    label: '10 Sessions',
    description: 'Complete 10 workouts.',
    category: 'consistency',
    target: 10,
    unit: 'sessions',
    evaluate: (s) => countMilestone(s.sessions.filter((x) => x.status === 'completed').map((x) => x.date), 10),
  },
  {
    id: 'consistency-50-sessions',
    label: '50 Sessions',
    description: 'Complete 50 workouts.',
    category: 'consistency',
    target: 50,
    unit: 'sessions',
    evaluate: (s) => countMilestone(s.sessions.filter((x) => x.status === 'completed').map((x) => x.date), 50),
  },
  {
    id: 'consistency-100-sessions',
    label: '100 Sessions',
    description: 'Complete 100 workouts.',
    category: 'consistency',
    target: 100,
    unit: 'sessions',
    evaluate: (s) => countMilestone(s.sessions.filter((x) => x.status === 'completed').map((x) => x.date), 100),
  },
  {
    id: 'consistency-7-streak',
    label: '7-Day Streak',
    description: 'Log training on 7 consecutive days.',
    category: 'consistency',
    target: 7,
    unit: 'days',
    evaluate: (s) => streakMilestone(activityDates(s), 7),
  },
  {
    id: 'consistency-30-streak',
    label: '30-Day Streak',
    description: 'Log training on 30 consecutive days.',
    category: 'consistency',
    target: 30,
    unit: 'days',
    evaluate: (s) => streakMilestone(activityDates(s), 30),
  },

  // Nutrition
  {
    id: 'nutrition-first-meal',
    label: 'First Meal Logged',
    description: 'Log your first meal on Fuel.',
    category: 'nutrition',
    target: 1,
    unit: 'meals',
    evaluate: (s) => countMilestone(s.meals.map((m) => m.date), 1),
  },
  {
    id: 'nutrition-protein-7',
    label: 'Protein Pro',
    description: 'Hit your protein target on 7 different days.',
    category: 'nutrition',
    target: 7,
    unit: 'days',
    evaluate: (s) => countMilestone(proteinDaysHit(s), 7),
  },
  {
    id: 'nutrition-water-7',
    label: 'Hydration Habit',
    description: 'Hit your water target on 7 different days.',
    category: 'nutrition',
    target: 7,
    unit: 'days',
    evaluate: (s) => countMilestone(waterDaysHit(s), 7),
  },

  // Body
  {
    id: 'body-first-metric',
    label: 'First Measurement',
    description: 'Log your first body measurement.',
    category: 'body',
    target: 1,
    unit: 'logs',
    evaluate: (s) => countMilestone(s.metrics.map((m) => m.date), 1),
  },
  {
    id: 'body-4-metrics',
    label: 'Progress Tracker',
    description: 'Log a measurement on 4 different days.',
    category: 'body',
    target: 4,
    unit: 'logs',
    evaluate: (s) => countMilestone(s.metrics.map((m) => m.date), 4),
  },
];

export function getTrophies(store: JarvisStore): Trophy[] {
  return TROPHY_DEFS.map((def) => {
    const { current, earnedDate } = def.evaluate(store);
    return { id: def.id, label: def.label, description: def.description, category: def.category, target: def.target, unit: def.unit, current, earnedDate };
  });
}

export function earnedTrophyCount(store: JarvisStore): number {
  return getTrophies(store).filter((t) => t.earnedDate != null).length;
}

export const TOTAL_TROPHY_COUNT = TROPHY_DEFS.length;
