/**
 * Derived views over the raw logs. The raw arrays stay the single source of
 * truth, so edits and deletions can never leave a stale summary behind.
 */

import { type JarvisStore, type SetEntry } from '@/lib/store';

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

function setVolume(s: SetEntry): number {
  return (s.weightKg ?? 0) * (s.reps ?? 0);
}

/** Completed (and in-progress) workout sessions with their sets rolled up. */
export function buildSessions(store: JarvisStore): CompletedSession[] {
  const setsBySession: Record<string, SetEntry[]> = {};
  const setsByDate: Record<string, SetEntry[]> = {};
  for (const s of store.sets) {
    if (s.sessionId) (setsBySession[s.sessionId] ??= []).push(s);
    (setsByDate[s.date] ??= []).push(s);
  }

  const roll = (sets: SetEntry[]) => {
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
    .map((s) => {
      // Prefer explicitly linked sets; fall back to same-day sets for legacy data.
      const sets = setsBySession[s.id] ?? setsByDate[s.date]?.filter((x) => !x.sessionId) ?? [];
      return { ...s, ...roll(sets) };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------- home stats ------------------------------- */

export interface HomeStats {
  today: {
    label: string | null;
    exerciseCount: number;
    /** Distinct planned exercises with at least one set logged today. */
    exercisesStarted: number;
    setsDone: number;
    sessionStatus: 'none' | 'in_progress' | 'completed';
    kcalEaten: number;
    kcalTarget: number;
    kcalLeft: number;
  };
  week: {
    sessionsDone: number;
    sessionsPlanned: number;
    volumeKg: number;
    distanceKm: number;
    daysLogged: number;
    avgCalories: number | null;
  };
  streakWeeks: number;
  totals: { workouts: number; sets: number; distanceKm: number };
  prs: { exercise: string; weightKg: number; reps: number | null }[];
  race: { name: string; daysAway: number } | null;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Sunday of the week containing `d` — matches the Plan tab's week strip. */
function weekStart(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/** Everything the Home screen shows, derived fresh from the raw logs. */
export function buildHomeStats(store: JarvisStore, now: Date = new Date()): HomeStats {
  const today = iso(now);
  const p = store.profile;

  const thisWeekStart = weekStart(now);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  const inThisWeek = (date: string) => date >= iso(thisWeekStart) && date <= iso(thisWeekEnd);

  /* ---- today ---- */
  const planToday = store.plan.find((d) => d.weekday === now.getDay());
  const extraToday = store.extras.find((e) => e.date === today);
  const exerciseCount = (planToday?.exercises.length ?? 0) + (extraToday?.exercises.length ?? 0);
  const sessionToday = store.sessions.find((s) => s.date === today);
  const setsToday = store.sets.filter((s) => s.date === today);
  const exercisesStarted = new Set(setsToday.map((s) => s.exercise.toLowerCase())).size;
  const mealsToday = store.meals.filter((m) => m.date === today);
  const kcalEaten = Math.round(mealsToday.reduce((a, m) => a + m.calories, 0));

  /* ---- this week ---- */
  const weekSets = store.sets.filter((s) => inThisWeek(s.date));
  const volumeKg = Math.round(weekSets.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0));
  const distanceKm = Math.round(weekSets.reduce((a, s) => a + (s.distanceKm ?? 0), 0) * 10) / 10;
  const sessionsDone = store.sessions.filter((s) => s.status === 'completed' && inThisWeek(s.date)).length;
  const sessionsPlanned =
    store.plan.filter((d) => d.exercises.length > 0).length + store.extras.filter((e) => inThisWeek(e.date) && e.exercises.length > 0).length;

  const weekMealDates = new Set(store.meals.filter((m) => inThisWeek(m.date)).map((m) => m.date));
  const perDay = [...weekMealDates].map((date) => store.meals.filter((m) => m.date === date).reduce((a, m) => a + m.calories, 0));
  const avgCalories = perDay.length ? Math.round(perDay.reduce((a, b) => a + b, 0) / perDay.length) : null;

  /* ---- streak: consecutive weeks containing at least one finished workout ---- */
  const doneDates = store.sessions.filter((s) => s.status === 'completed').map((s) => s.date);
  const weeksWithWork = new Set(doneDates.map((d) => iso(weekStart(new Date(`${d}T00:00:00`)))));
  let streakWeeks = 0;
  const cursor = new Date(thisWeekStart);
  // An empty current week doesn't break the run — it just hasn't happened yet.
  if (!weeksWithWork.has(iso(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (weeksWithWork.has(iso(cursor))) {
    streakWeeks += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  /* ---- lifetime ---- */
  const totals = {
    workouts: store.sessions.filter((s) => s.status === 'completed').length,
    sets: store.sets.length,
    distanceKm: Math.round(store.sets.reduce((a, s) => a + (s.distanceKm ?? 0), 0) * 10) / 10,
  };

  /* ---- personal bests, for the lifts trained most often ---- */
  const byExercise: Record<string, { exercise: string; count: number; weightKg: number; reps: number | null }> = {};
  for (const s of store.sets) {
    if (s.weightKg == null || s.weightKg <= 0) continue;
    const key = s.exercise.toLowerCase();
    const cur = (byExercise[key] ??= { exercise: s.exercise, count: 0, weightKg: 0, reps: null });
    cur.count += 1;
    if (s.weightKg > cur.weightKg) {
      cur.weightKg = s.weightKg;
      cur.reps = s.reps ?? null;
    }
  }
  const prs = Object.values(byExercise)
    .sort((a, b) => b.count - a.count || b.weightKg - a.weightKg)
    .slice(0, 5)
    .map(({ exercise, weightKg, reps }) => ({ exercise, weightKg, reps }));

  /* ---- race countdown ---- */
  let race: HomeStats['race'] = null;
  if (p.raceDate) {
    const target = new Date(`${p.raceDate}T00:00:00`);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const daysAway = Math.round((target.getTime() - start.getTime()) / 86400000);
    if (daysAway >= 0) race = { name: p.raceName?.trim() || 'Race day', daysAway };
  }

  return {
    today: {
      label: planToday && planToday.exercises.length > 0 ? planToday.label : extraToday ? extraToday.label : null,
      exerciseCount,
      exercisesStarted,
      setsDone: setsToday.length,
      sessionStatus: sessionToday ? sessionToday.status : 'none',
      kcalEaten,
      kcalTarget: p.calorieTarget,
      kcalLeft: Math.max(0, p.calorieTarget - kcalEaten),
    },
    week: { sessionsDone, sessionsPlanned, volumeKg, distanceKm, daysLogged: weekMealDates.size, avgCalories },
    streakWeeks,
    totals,
    prs,
    race,
  };
}
