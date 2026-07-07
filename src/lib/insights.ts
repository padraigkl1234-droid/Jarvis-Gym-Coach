/**
 * Proactive insight detection — the analysis half of the background worker.
 * Scans the last 3–5 days of structured data (daily_macros, completed_sessions)
 * for muscle-recovery risk (protein consistently under target) and missed
 * planned workouts. Pure functions; the page-level worker decides when to run
 * them and how to notify.
 */

import { type JarvisStore, todayStr } from '@/lib/store';
import { buildDailyMacros, buildSessions } from '@/lib/stats';

export type InsightKind = 'recovery_risk' | 'missed_workouts';

export interface Insight {
  kind: InsightKind;
  title: string;
  /** Deterministic message used when the AI phrasing call is unavailable. */
  fallback: string;
  /** Compact facts handed to the AI so it can phrase the nudge with real numbers. */
  facts: Record<string, string | number>;
}

function daysAgo(n: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return todayStr(d);
}

/** Protein under 80% of target on 2+ of the last 3 logged days → recovery risk. */
function detectRecoveryRisk(store: JarvisStore, now: Date): Insight | null {
  const since = daysAgo(4, now);
  const logged = buildDailyMacros(store, since).filter((d) => d.mealCount > 0);
  const recent = logged.slice(0, 3); // newest first
  if (recent.length < 2) return null;

  const target = store.profile.proteinTargetG;
  if (target <= 0) return null;
  const low = recent.filter((d) => d.proteinG / target < 0.8);
  if (low.length < 2) return null;

  const avgProtein = Math.round(recent.reduce((a, d) => a + d.proteinG, 0) / recent.length);
  const trainedRecently = store.sets.some((s) => s.date >= since);

  return {
    kind: 'recovery_risk',
    title: 'Muscle recovery risk',
    fallback: `Protein has come in under 80% of your ${target}g target on ${low.length} of your last ${recent.length} logged days (averaging ${avgProtein}g)${trainedRecently ? ' while you have been training' : ''}. That puts recovery at risk — front-load protein today.`,
    facts: {
      proteinTargetG: target,
      avgProteinG: avgProtein,
      lowDays: low.length,
      loggedDays: recent.length,
      trainedInWindow: trainedRecently ? 'yes' : 'no',
    },
  };
}

/** Two or more planned training days in the last 5 days with no completed session. */
function detectMissedWorkouts(store: JarvisStore, now: Date): Insight | null {
  const trainingWeekdays = new Set(
    store.plan.filter((p) => p.exercises.length > 0).map((p) => p.weekday)
  );
  if (trainingWeekdays.size === 0) return null;

  const sessions = buildSessions(store, daysAgo(5, now));
  const completedDates = new Set(sessions.filter((s) => s.status === 'completed').map((s) => s.date));

  // Look at the last 5 full days (yesterday backwards) so today isn't "missed" mid-day.
  const missed: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (trainingWeekdays.has(d.getDay()) && !completedDates.has(todayStr(d))) {
      missed.push(todayStr(d));
    }
  }
  if (missed.length < 2) return null;

  const lastDone = sessions.find((s) => s.status === 'completed');
  return {
    kind: 'missed_workouts',
    title: 'Missed workout streak',
    fallback: `You've missed ${missed.length} planned sessions in the last 5 days${lastDone ? ` — last completed workout was ${lastDone.label} on ${lastDone.date}` : ''}. Momentum fades fast; even a short session today restarts the streak.`,
    facts: {
      missedCount: missed.length,
      windowDays: 5,
      lastCompleted: lastDone ? `${lastDone.label} on ${lastDone.date}` : 'none in window',
    },
  };
}

/** All insights currently firing, most urgent first. */
export function detectInsights(store: JarvisStore, now: Date = new Date()): Insight[] {
  const out: Insight[] = [];
  const missed = detectMissedWorkouts(store, now);
  if (missed) out.push(missed);
  const recovery = detectRecoveryRisk(store, now);
  if (recovery) out.push(recovery);
  return out;
}

/* --- Once-per-day notification dedupe (client-side) --- */

const SEEN_KEY = 'valoris.insights.seen.v1';

function readSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function wasSeenToday(kind: InsightKind): boolean {
  return readSeen()[kind] === todayStr();
}

export function markSeen(kind: InsightKind): void {
  if (typeof window === 'undefined') return;
  try {
    const seen = readSeen();
    seen[kind] = todayStr();
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage unavailable — worst case the nudge shows again.
  }
}
