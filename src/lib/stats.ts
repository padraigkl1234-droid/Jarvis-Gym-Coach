/**
 * Derived analytics over the raw logs. The raw arrays (meals, sets, sessions,
 * water, metrics) remain the single source of truth; everything here is a
 * computed view, so edits and deletions can never leave stats out of sync.
 *
 * Shared by the /api/stats endpoint and the LLM's getHistory tool.
 */

import { type JarvisStore, type SetEntry, todayStr } from '@/lib/store';

export interface DailyMacros {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  mealCount: number;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number };
}

export interface ExerciseDay {
  date: string;
  sets: number;
  topWeightKg: number | null;
  topReps: number | null;
  best1RM: number | null; // Epley estimate
  volumeKg: number; // sum of weight * reps
}

export interface ExerciseHistory {
  exercise: string;
  totalSets: number;
  sessions: number; // distinct days performed
  bestWeightKg: number | null;
  best1RM: number | null;
  lastPerformed: string | null;
  history: ExerciseDay[]; // per-day, oldest first
}

export interface SessionExercise {
  name: string;
  sets: number;
  topWeightKg: number | null;
  volumeKg: number;
}

export interface CompletedSession {
  id: string;
  date: string;
  weekday: number;
  label: string;
  focus?: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt: string | null;
  notes?: string;
  totalSets: number;
  totalVolumeKg: number;
  exercises: SessionExercise[];
}

export interface StatsPayload {
  generatedAt: string;
  range: { since: string; days: number };
  summary: {
    workoutsCompleted: number;
    workoutsInRange: number;
    totalSets: number;
    totalVolumeKg: number;
    daysNutritionLogged: number;
    avgCalories: number | null;
    avgProteinG: number | null;
    bodyweightKg: { first: number; last: number; change: number } | null;
  };
  completedSessions: CompletedSession[];
  exerciseHistory: ExerciseHistory[];
  dailyMacros: DailyMacros[];
}

/** Epley one-rep-max estimate from a working set. */
export function epley1RM(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || weightKg <= 0 || reps == null || reps <= 0) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

function setVolume(s: SetEntry): number {
  return (s.weightKg ?? 0) * (s.reps ?? 0);
}

function cutoff(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, days - 1));
  return todayStr(d);
}

/** Per-day nutrition rollups vs. the athlete's targets. */
export function buildDailyMacros(store: JarvisStore, since: string): DailyMacros[] {
  const p = store.profile;
  const byDate: Record<string, DailyMacros> = {};
  const ensure = (date: string) =>
    (byDate[date] ??= {
      date,
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      waterMl: 0,
      mealCount: 0,
      targets: {
        calories: p.calorieTarget,
        proteinG: p.proteinTargetG,
        carbsG: p.carbsTargetG,
        fatG: p.fatTargetG,
        waterMl: p.hydrationTargetMl,
      },
    });
  for (const m of store.meals) {
    if (m.date < since) continue;
    const d = ensure(m.date);
    d.calories += m.calories;
    d.proteinG += m.proteinG;
    d.carbsG += m.carbsG;
    d.fatG += m.fatG;
    d.mealCount += 1;
  }
  for (const w of store.water) {
    if (w.date < since) continue;
    ensure(w.date).waterMl += w.ml;
  }
  return Object.values(byDate)
    .map((d) => ({
      ...d,
      calories: Math.round(d.calories),
      proteinG: Math.round(d.proteinG),
      carbsG: Math.round(d.carbsG),
      fatG: Math.round(d.fatG),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Per-exercise progression (best set, e1RM, volume, last performed). */
export function buildExerciseHistory(store: JarvisStore, since: string): ExerciseHistory[] {
  const byExercise: Record<string, Record<string, ExerciseDay>> = {};
  for (const s of store.sets) {
    if (s.date < since) continue;
    const key = s.exercise.trim();
    const kl = key.toLowerCase();
    const days = (byExercise[kl] ??= {});
    const day = (days[s.date] ??= { date: s.date, sets: 0, topWeightKg: null, topReps: null, best1RM: null, volumeKg: 0 });
    day.sets += 1;
    day.volumeKg += setVolume(s);
    if (s.weightKg != null && (day.topWeightKg == null || s.weightKg > day.topWeightKg)) {
      day.topWeightKg = s.weightKg;
      day.topReps = s.reps ?? null;
    }
    const e = epley1RM(s.weightKg, s.reps);
    if (e != null && (day.best1RM == null || e > day.best1RM)) day.best1RM = e;
  }

  const result: ExerciseHistory[] = [];
  for (const kl of Object.keys(byExercise)) {
    const days = Object.values(byExercise[kl]).sort((a, b) => a.date.localeCompare(b.date));
    // Use the most common original casing for display.
    const name = store.sets.find((s) => s.exercise.toLowerCase() === kl)?.exercise ?? kl;
    const bestWeightKg = days.reduce<number | null>((m, d) => (d.topWeightKg != null && (m == null || d.topWeightKg > m) ? d.topWeightKg : m), null);
    const best1RM = days.reduce<number | null>((m, d) => (d.best1RM != null && (m == null || d.best1RM > m) ? d.best1RM : m), null);
    result.push({
      exercise: name,
      totalSets: days.reduce((a, d) => a + d.sets, 0),
      sessions: days.length,
      bestWeightKg,
      best1RM,
      lastPerformed: days.length ? days[days.length - 1].date : null,
      history: days.map((d) => ({ ...d, volumeKg: Math.round(d.volumeKg) })),
    });
  }
  return result.sort((a, b) => (b.lastPerformed ?? '').localeCompare(a.lastPerformed ?? ''));
}

/** Completed (and in-progress) workout sessions with their sets rolled up. */
export function buildSessions(store: JarvisStore, since: string): CompletedSession[] {
  const setsBySession: Record<string, SetEntry[]> = {};
  const setsByDate: Record<string, SetEntry[]> = {};
  for (const s of store.sets) {
    if (s.sessionId) (setsBySession[s.sessionId] ??= []).push(s);
    (setsByDate[s.date] ??= []).push(s);
  }

  const roll = (sets: SetEntry[]): { exercises: SessionExercise[]; totalSets: number; totalVolumeKg: number } => {
    const byEx: Record<string, SessionExercise> = {};
    let totalVolumeKg = 0;
    for (const s of sets) {
      const key = s.exercise.toLowerCase();
      const ex = (byEx[key] ??= { name: s.exercise, sets: 0, topWeightKg: null, volumeKg: 0 });
      ex.sets += 1;
      ex.volumeKg += setVolume(s);
      totalVolumeKg += setVolume(s);
      if (s.weightKg != null && (ex.topWeightKg == null || s.weightKg > ex.topWeightKg)) ex.topWeightKg = s.weightKg;
    }
    return {
      exercises: Object.values(byEx).map((e) => ({ ...e, volumeKg: Math.round(e.volumeKg) })),
      totalSets: sets.length,
      totalVolumeKg: Math.round(totalVolumeKg),
    };
  };

  return store.sessions
    .filter((s) => s.date >= since)
    .map((s) => {
      // Prefer explicitly linked sets; fall back to same-day sets for legacy data.
      const sets = setsBySession[s.id] ?? setsByDate[s.date]?.filter((x) => !x.sessionId) ?? [];
      const rolled = roll(sets);
      return {
        id: s.id,
        date: s.date,
        weekday: s.weekday,
        label: s.label,
        focus: s.focus,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        notes: s.notes,
        ...rolled,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** The full historical stats payload for a rolling window (default 30 days). */
export function buildStats(store: JarvisStore, opts: { days?: number; exercise?: string } = {}): StatsPayload {
  const days = Math.max(1, Math.min(365, opts.days ?? 30));
  const since = cutoff(days);

  const dailyMacros = buildDailyMacros(store, since);
  let exerciseHistory = buildExerciseHistory(store, since);
  if (opts.exercise) {
    const q = opts.exercise.toLowerCase();
    exerciseHistory = exerciseHistory.filter((e) => e.exercise.toLowerCase().includes(q));
  }
  const sessions = buildSessions(store, since);

  const completed = sessions.filter((s) => s.status === 'completed');
  const totalSets = sessions.reduce((a, s) => a + s.totalSets, 0);
  const totalVolumeKg = sessions.reduce((a, s) => a + s.totalVolumeKg, 0);
  const nutritionDays = dailyMacros.filter((d) => d.mealCount > 0);
  const avgCalories = nutritionDays.length
    ? Math.round(nutritionDays.reduce((a, d) => a + d.calories, 0) / nutritionDays.length)
    : null;
  const avgProteinG = nutritionDays.length
    ? Math.round(nutritionDays.reduce((a, d) => a + d.proteinG, 0) / nutritionDays.length)
    : null;

  const weighIns = store.metrics
    .filter((m) => m.date >= since && m.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const bodyweightKg =
    weighIns.length >= 1
      ? {
          first: weighIns[0].weightKg!,
          last: weighIns[weighIns.length - 1].weightKg!,
          change: Math.round((weighIns[weighIns.length - 1].weightKg! - weighIns[0].weightKg!) * 10) / 10,
        }
      : null;

  return {
    generatedAt: new Date().toISOString(),
    range: { since, days },
    summary: {
      workoutsCompleted: completed.length,
      workoutsInRange: sessions.length,
      totalSets,
      totalVolumeKg,
      daysNutritionLogged: nutritionDays.length,
      avgCalories,
      avgProteinG,
      bodyweightKg,
    },
    completedSessions: sessions,
    exerciseHistory,
    dailyMacros,
  };
}
