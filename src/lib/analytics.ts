/**
 * Fitness analytics computed from the structured logs: training frequency
 * (sessions this week/month), per-exercise volume tracking, and macro
 * consistency over time. Pure functions over the store — shared by the
 * Progress panel and available to any future endpoint.
 */

import { type JarvisStore, todayStr } from '@/lib/store';
import { buildDailyMacros, buildSessions } from '@/lib/stats';

/** Monday-based start of the week containing `d`. */
function weekStart(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7; // Mon = 0
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

export interface SessionCounts {
  completedThisWeek: number;
  completedThisMonth: number;
  completedLast30: number;
  totalSetsThisWeek: number;
  volumeKgThisWeek: number;
  allTimeCompleted: number;
}

/** How often the athlete has trained: calendar week (Mon-start) and month. */
export function sessionCounts(store: JarvisStore, now: Date = new Date()): SessionCounts {
  const sinceEver = '0000-00-00';
  const sessions = buildSessions(store, sinceEver);
  const wkStart = todayStr(weekStart(now));
  const moStart = todayStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 29);
  const last30 = todayStr(d30);

  const completed = sessions.filter((s) => s.status === 'completed');
  const thisWeek = sessions.filter((s) => s.date >= wkStart);
  return {
    completedThisWeek: completed.filter((s) => s.date >= wkStart).length,
    completedThisMonth: completed.filter((s) => s.date >= moStart).length,
    completedLast30: completed.filter((s) => s.date >= last30).length,
    totalSetsThisWeek: thisWeek.reduce((a, s) => a + s.totalSets, 0),
    volumeKgThisWeek: thisWeek.reduce((a, s) => a + s.totalVolumeKg, 0),
    allTimeCompleted: completed.length,
  };
}

export interface WeeklyVolumePoint {
  weekStart: string; // YYYY-MM-DD (Monday)
  volumeKg: number;
  sets: number;
  topWeightKg: number | null;
}

/** Weekly volume series for one exercise (fuzzy name match), oldest first. */
export function exerciseVolumeSeries(
  store: JarvisStore,
  exercise: string,
  weeks = 12,
  now: Date = new Date()
): WeeklyVolumePoint[] {
  const q = exercise.trim().toLowerCase();
  const start = weekStart(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  const buckets: WeeklyVolumePoint[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = new Date(start);
    ws.setDate(ws.getDate() + i * 7);
    buckets.push({ weekStart: todayStr(ws), volumeKg: 0, sets: 0, topWeightKg: null });
  }
  const startStr = buckets[0].weekStart;
  for (const s of store.sets) {
    if (s.date < startStr || !s.exercise.toLowerCase().includes(q)) continue;
    const d = new Date(`${s.date}T00:00:00`);
    const idx = Math.floor((weekStart(d).getTime() - start.getTime()) / (7 * 86400000));
    if (idx < 0 || idx >= buckets.length) continue;
    const b = buckets[idx];
    b.sets += 1;
    b.volumeKg += (s.weightKg ?? 0) * (s.reps ?? 0);
    if (s.weightKg != null && (b.topWeightKg == null || s.weightKg > b.topWeightKg)) b.topWeightKg = s.weightKg;
  }
  return buckets.map((b) => ({ ...b, volumeKg: Math.round(b.volumeKg) }));
}

export interface MacroConsistency {
  days: number;
  daysLogged: number;
  calorieHitRate: number | null; // share of logged days within ±10% of target
  proteinHitRate: number | null; // share of logged days reaching ≥90% protein target
  avgCaloriePct: number | null; // average intake as % of target on logged days
  currentProteinStreak: number; // consecutive most-recent logged days hitting protein
  perDay: {
    date: string;
    caloriePct: number; // intake / target * 100
    proteinPct: number;
    withinCalories: boolean;
    hitProtein: boolean;
  }[];
}

/** How consistently intake matched targets over the last N days. */
export function macroConsistency(store: JarvisStore, days = 14, now: Date = new Date()): MacroConsistency {
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  const daily = buildDailyMacros(store, todayStr(since)).filter((d) => d.mealCount > 0);

  const perDay = daily
    .map((d) => {
      const caloriePct = d.targets.calories > 0 ? Math.round((d.calories / d.targets.calories) * 100) : 0;
      const proteinPct = d.targets.proteinG > 0 ? Math.round((d.proteinG / d.targets.proteinG) * 100) : 0;
      return {
        date: d.date,
        caloriePct,
        proteinPct,
        withinCalories: caloriePct >= 90 && caloriePct <= 110,
        hitProtein: proteinPct >= 90,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const n = perDay.length;
  let streak = 0;
  for (let i = n - 1; i >= 0 && perDay[i].hitProtein; i--) streak++;

  return {
    days,
    daysLogged: n,
    calorieHitRate: n ? Math.round((perDay.filter((d) => d.withinCalories).length / n) * 100) : null,
    proteinHitRate: n ? Math.round((perDay.filter((d) => d.hitProtein).length / n) * 100) : null,
    avgCaloriePct: n ? Math.round(perDay.reduce((a, d) => a + d.caloriePct, 0) / n) : null,
    currentProteinStreak: streak,
    perDay,
  };
}
