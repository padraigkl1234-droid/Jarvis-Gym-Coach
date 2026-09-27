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
