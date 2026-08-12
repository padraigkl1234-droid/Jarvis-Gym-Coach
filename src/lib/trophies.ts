/**
 * A trophy cabinet built entirely from data already in the store — no new
 * logging required. Each trophy defines how to read its progress out of
 * sets/sessions/meals/water/metrics, and (once earned) the date the
 * milestone was first crossed, worked out by replaying the relevant entries
 * in chronological order rather than just checking the current total.
 *
 * There are a lot of these (75+), so most are built by small generator
 * functions over a list of tiers/lifts rather than hand-typed one by one —
 * far less room for a copy-paste typo across nearly identical trophies.
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

type Progress = { current: number; earnedDate: string | null };

/** Running sum of dated values; earnedDate is the date the cumulative total first hit `target`. */
function sumMilestone(items: { date: string; value: number }[], target: number): Progress {
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
function maxMilestone(items: { date: string; value: number }[], target: number): Progress {
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
function countMilestone(dates: string[], target: number): Progress {
  const sorted = [...dates].sort();
  const current = sorted.length;
  const earnedDate = current >= target ? sorted[target - 1] : null;
  return { current, earnedDate };
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Longest run of consecutive calendar days in `dates`; earnedDate is the day the run first reached `target` days long. */
function streakMilestone(dates: string[], target: number): Progress {
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

function calorieDaysHit(store: JarvisStore): string[] {
  const target = store.profile.calorieTarget;
  if (!target) return [];
  const byDate = new Map<string, number>();
  for (const m of store.meals) byDate.set(m.date, (byDate.get(m.date) ?? 0) + m.calories);
  return Array.from(byDate.entries())
    .filter(([, kcal]) => kcal >= target * 0.9 && kcal <= target * 1.1)
    .map(([d]) => d);
}

function activityDates(store: JarvisStore): string[] {
  const sessionDates = store.sessions.filter((s) => s.status === 'completed').map((s) => s.date);
  const setDates = store.sets.map((s) => s.date);
  return [...sessionDates, ...setDates];
}

/* ---- Generators — one function per "family" of near-identical trophies ---- */

/** Cumulative-rep trophies for a lift, matched by keyword against the logged exercise name. */
function repMilestones(idPrefix: string, exerciseLabel: string, keywords: string[], tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `${idPrefix}-reps-${target}`,
    label: `${exerciseLabel} x${target.toLocaleString()}`,
    description: `Log ${target.toLocaleString()} total ${exerciseLabel.toLowerCase()} reps.`,
    category: 'strength',
    target,
    unit: 'reps',
    evaluate: (s) =>
      sumMilestone(
        s.sets.filter((x) => x.reps != null && matchesAny(x.exercise, keywords)).map((x) => ({ date: x.date, value: x.reps! })),
        target
      ),
  }));
}

/** Best-single-set weight trophies for a lift, matched by keyword against the logged exercise name. */
function weightMilestones(idPrefix: string, exerciseLabel: string, keywords: string[], tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `${idPrefix}-kg-${target}`,
    label: `${exerciseLabel} ${target}kg`,
    description: `Log a single ${exerciseLabel.toLowerCase()} set at ${target}kg or more.`,
    category: 'strength',
    target,
    unit: 'kg',
    evaluate: (s) =>
      maxMilestone(
        s.sets.filter((x) => x.weightKg != null && matchesAny(x.exercise, keywords)).map((x) => ({ date: x.date, value: x.weightKg! })),
        target
      ),
  }));
}

/** Lifetime cumulative cardio distance, exercise-agnostic. */
function cardioLifetimeDistance(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `cardio-lifetime-${target}`,
    label: `${target}km Club`,
    description: `Rack up ${target}km of cardio, lifetime.`,
    category: 'cardio',
    target,
    unit: 'km',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.distanceKm != null).map((x) => ({ date: x.date, value: x.distanceKm! })), target),
  }));
}

/** Best single-session distance on a specific cardio activity (e.g. rides). */
function cardioActivityDistance(idPrefix: string, activityLabel: string, keywords: string[], tiers: { target: number; label: string }[]): TrophyDef[] {
  return tiers.map((t) => ({
    id: `${idPrefix}-${t.target}`,
    label: t.label,
    description: `Cover ${t.target}km in a single ${activityLabel.toLowerCase()}.`,
    category: 'cardio',
    target: t.target,
    unit: 'km',
    evaluate: (s) =>
      maxMilestone(
        s.sets.filter((x) => x.distanceKm != null && matchesAny(x.exercise, keywords)).map((x) => ({ date: x.date, value: x.distanceKm! })),
        t.target
      ),
  }));
}

/** Best single cardio session duration, exercise-agnostic. */
function cardioDuration(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `cardio-duration-${target}`,
    label: `${target}-Minute Cardio`,
    description: `Complete a single cardio session of ${target} minutes or more.`,
    category: 'cardio',
    target,
    unit: 'min',
    evaluate: (s) => maxMilestone(s.sets.filter((x) => x.durationMin != null).map((x) => ({ date: x.date, value: x.durationMin! })), target),
  }));
}

/** Count of logged cardio entries (anything with a duration or distance), lifetime. */
function cardioSessionCount(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `cardio-sessions-${target}`,
    label: `${target} Cardio Sessions`,
    description: `Log ${target} cardio sessions, lifetime.`,
    category: 'cardio',
    target,
    unit: 'sessions',
    evaluate: (s) => countMilestone(s.sets.filter((x) => x.distanceKm != null || x.durationMin != null).map((x) => x.date), target),
  }));
}

function consistencySessions(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `consistency-sessions-${target}`,
    label: target === 1 ? 'First Session' : `${target} Sessions`,
    description: target === 1 ? 'Complete your first workout.' : `Complete ${target} workouts.`,
    category: 'consistency',
    target,
    unit: 'sessions',
    evaluate: (s) => countMilestone(s.sessions.filter((x) => x.status === 'completed').map((x) => x.date), target),
  }));
}

function consistencyStreaks(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `consistency-streak-${target}`,
    label: `${target}-Day Streak`,
    description: `Log training on ${target} consecutive days.`,
    category: 'consistency',
    target,
    unit: 'days',
    evaluate: (s) => streakMilestone(activityDates(s), target),
  }));
}

function nutritionMealCounts(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `nutrition-meals-${target}`,
    label: target === 1 ? 'First Meal Logged' : `${target.toLocaleString()} Meals Logged`,
    description: target === 1 ? 'Log your first meal on Fuel.' : `Log ${target.toLocaleString()} meals, lifetime.`,
    category: 'nutrition',
    target,
    unit: 'meals',
    evaluate: (s) => countMilestone(s.meals.map((m) => m.date), target),
  }));
}

function nutritionProteinDays(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `nutrition-protein-${target}`,
    label: `Protein x${target}`,
    description: `Hit your protein target on ${target} different days.`,
    category: 'nutrition',
    target,
    unit: 'days',
    evaluate: (s) => countMilestone(proteinDaysHit(s), target),
  }));
}

function nutritionWaterDays(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `nutrition-water-${target}`,
    label: `Hydration x${target}`,
    description: `Hit your water target on ${target} different days.`,
    category: 'nutrition',
    target,
    unit: 'days',
    evaluate: (s) => countMilestone(waterDaysHit(s), target),
  }));
}

function nutritionCalorieDays(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `nutrition-calories-${target}`,
    label: `On Target x${target}`,
    description: `Land within 10% of your calorie target on ${target} different days.`,
    category: 'nutrition',
    target,
    unit: 'days',
    evaluate: (s) => countMilestone(calorieDaysHit(s), target),
  }));
}

function bodyMetricCounts(tiers: number[]): TrophyDef[] {
  return tiers.map((target) => ({
    id: `body-metrics-${target}`,
    label: target === 1 ? 'First Measurement' : `${target} Measurements`,
    description: target === 1 ? 'Log your first body measurement.' : `Log a measurement on ${target} different days.`,
    category: 'body',
    target,
    unit: 'logs',
    evaluate: (s) => countMilestone(s.metrics.map((m) => m.date), target),
  }));
}

const TROPHY_DEFS: TrophyDef[] = [
  // ---- Cardio ----
  // Single-session distance, exercise-agnostic (a run, a ride, a row all count).
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
  ...cardioLifetimeDistance([50, 100, 250, 500, 1000]),
  ...cardioActivityDistance('cardio-ride', 'ride', ['cycl', 'bike', 'ride'], [
    { target: 20, label: 'First 20K Ride' },
    { target: 50, label: 'First 50K Ride' },
    { target: 100, label: 'Century Ride' },
  ]),
  ...cardioDuration([30, 60, 90]),
  ...cardioSessionCount([10, 25, 50, 100]),

  // ---- Strength ----
  ...weightMilestones('bench', 'Bench Press', ['bench press'], [40, 60, 80, 100, 120]),
  ...weightMilestones('squat', 'Squat', ['squat'], [60, 80, 100, 140, 180]),
  ...weightMilestones('deadlift', 'Deadlift', ['deadlift'], [80, 100, 140, 180, 220]),
  ...weightMilestones('ohp', 'Overhead Press', ['overhead press', 'shoulder press'], [30, 40, 60, 80]),
  ...weightMilestones('row', 'Row', ['row'], [40, 60, 80, 100]),
  ...repMilestones('bench', 'Bench Press', ['bench press'], [50, 250, 1000]),
  ...repMilestones('squat', 'Squat', ['squat'], [50, 250, 1000]),
  ...repMilestones('deadlift', 'Deadlift', ['deadlift'], [50, 250, 1000]),
  ...repMilestones('pullup', 'Pull-Up', ['pull-up', 'pull up'], [50, 250, 1000]),
  ...repMilestones('pushup', 'Push-Up', ['push-up', 'push up'], [100, 500, 2000]),
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
    id: 'strength-total-reps-1000',
    label: '1,000 Reps',
    description: 'Log 1,000 reps, lifetime, across all lifts.',
    category: 'strength',
    target: 1000,
    unit: 'reps',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.reps != null).map((x) => ({ date: x.date, value: x.reps! })), 1000),
  },
  {
    id: 'strength-total-reps-5000',
    label: '5,000 Reps',
    description: 'Log 5,000 reps, lifetime, across all lifts.',
    category: 'strength',
    target: 5000,
    unit: 'reps',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.reps != null).map((x) => ({ date: x.date, value: x.reps! })), 5000),
  },
  {
    id: 'strength-total-reps-10000',
    label: '10,000 Reps',
    description: 'Log 10,000 reps, lifetime, across all lifts.',
    category: 'strength',
    target: 10000,
    unit: 'reps',
    evaluate: (s) => sumMilestone(s.sets.filter((x) => x.reps != null).map((x) => ({ date: x.date, value: x.reps! })), 10000),
  },

  // ---- Consistency ----
  ...consistencySessions([1, 5, 10, 25, 50, 100, 200, 365]),
  ...consistencyStreaks([3, 7, 14, 30, 60, 100]),

  // ---- Nutrition ----
  ...nutritionMealCounts([1, 10, 50, 100, 365]),
  ...nutritionProteinDays([3, 7, 14, 30]),
  ...nutritionWaterDays([3, 7, 14, 30]),
  ...nutritionCalorieDays([7, 30]),

  // ---- Body ----
  ...bodyMetricCounts([1, 4, 10, 25, 52]),
  {
    id: 'body-first-bodyfat',
    label: 'First Body Fat % Logged',
    description: 'Log your body fat percentage for the first time.',
    category: 'body',
    target: 1,
    unit: 'logs',
    evaluate: (s) => countMilestone(s.metrics.filter((m) => m.bodyFatPct != null).map((m) => m.date), 1),
  },
  {
    id: 'body-first-resting-hr',
    label: 'First Resting HR Logged',
    description: 'Log your resting heart rate for the first time.',
    category: 'body',
    target: 1,
    unit: 'logs',
    evaluate: (s) => countMilestone(s.metrics.filter((m) => m.restingHr != null).map((m) => m.date), 1),
  },
  {
    id: 'body-first-sleep',
    label: 'First Sleep Logged',
    description: 'Log your sleep hours for the first time.',
    category: 'body',
    target: 1,
    unit: 'logs',
    evaluate: (s) => countMilestone(s.metrics.filter((m) => m.sleepHours != null).map((m) => m.date), 1),
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
