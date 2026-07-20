'use client';

import React, { useMemo, useState } from 'react';
import { type JarvisStore } from '@/lib/store';
import { buildStats } from '@/lib/stats';
import { Card, Chip, Eyebrow, TrendChart } from '@/components/ui';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function StatCard({ label, value, unit, sub, subTone = 'faint' }: { label: string; value: string; unit?: string; sub?: string; subTone?: 'sage' | 'faint' }) {
  return (
    <Card className="rounded-[18px] p-4">
      <Eyebrow className="!text-[10px]">{label}</Eyebrow>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[26px] leading-none text-ink">{value}</span>
        {unit && <span className="text-[12px] text-faint">{unit}</span>}
      </div>
      {sub && <div className={`mt-1.5 text-[12px] font-bold ${subTone === 'sage' ? 'text-sage' : 'text-faint'}`}>{sub}</div>}
    </Card>
  );
}

export function ProgressScreen({ store }: { store: JarvisStore }) {
  const [days, setDays] = useState(30);
  const stats = useMemo(() => buildStats(store, { days }), [store, days]);
  const { summary } = stats;

  const caloriePoints = useMemo(
    () => [...stats.dailyMacros].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ date: d.date, value: d.calories })),
    [stats]
  );

  const strengthExercises = useMemo(() => stats.exerciseHistory.filter((e) => e.bestWeightKg != null), [stats]);

  return (
    <div>
      <Eyebrow className="pt-2">Stats</Eyebrow>
      <h1 className="mt-1 font-display text-[32px] text-ink">Progress</h1>

      <div className="mt-5 flex gap-2">
          {RANGES.map((r) => (
            <Chip key={r.days} active={days === r.days} onClick={() => setDays(r.days)}>
              {r.label}
            </Chip>
          ))}
        </div>

        {/* Summary tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatCard
            label="Avg calories / day"
            value={summary.avgCalories != null ? summary.avgCalories.toLocaleString() : '—'}
            sub={summary.avgCalories != null ? `of ${store.profile.calorieTarget.toLocaleString()} target` : `Logged ${summary.daysNutritionLogged} days`}
          />
          <StatCard
            label="Weight change"
            value={summary.bodyweightKg ? `${summary.bodyweightKg.change > 0 ? '+' : ''}${summary.bodyweightKg.change}` : '—'}
            unit={summary.bodyweightKg ? 'kg' : undefined}
            sub={summary.bodyweightKg ? `${summary.bodyweightKg.first}kg → ${summary.bodyweightKg.last}kg` : 'No weigh-ins yet'}
            subTone={summary.bodyweightKg && summary.bodyweightKg.change < 0 ? 'sage' : 'faint'}
          />
          <StatCard label="Sessions completed" value={String(summary.workoutsCompleted)} sub={`${summary.totalSets} sets logged`} />
          <StatCard label="Total volume" value={summary.totalVolumeKg.toLocaleString()} unit="kg lifted" />
        </div>

        {/* Calories over time */}
        <Card className="mt-5 rounded-[20px] p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[18px] text-ink">Calories eaten</span>
            <span className="text-[12px] font-semibold text-faint">
              {RANGES.find((r) => r.days === days)?.label}
            </span>
          </div>
          <div className="mt-3">
            <TrendChart points={caloriePoints} emptyLabel="Log meals on at least two days to see a trend" />
          </div>
        </Card>

        {/* Strength progress */}
        <div className="mt-7">
          <Eyebrow>Strength progress</Eyebrow>
          {strengthExercises.length === 0 ? (
            <p className="mt-2 text-[14px] text-muted">Log a few strength sets and this fills in with how much you're improving on each lift.</p>
          ) : (
            <ul className="mt-1">
              {strengthExercises.map((ex, i) => {
                const first = ex.history[0];
                const last = ex.history[ex.history.length - 1];
                const weightDelta = ex.history.length > 1 && first.topWeightKg != null && last.topWeightKg != null ? last.topWeightKg - first.topWeightKg : null;
                const repsDelta = ex.history.length > 1 && first.topReps != null && last.topReps != null ? last.topReps - first.topReps : null;
                return (
                  <li key={ex.exercise} className={`py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-ink">{ex.exercise}</div>
                        <div className="mt-0.5 text-[12px] text-faint">
                          {ex.totalSets} sets · {ex.sessions} session{ex.sessions === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-[17px] text-ink">
                          {last.topWeightKg != null ? `${last.topWeightKg}kg` : '—'}
                          {last.topReps != null && <span className="text-[13px] text-faint"> × {last.topReps}</span>}
                        </div>
                        {(weightDelta != null && weightDelta !== 0) || (repsDelta != null && repsDelta !== 0) ? (
                          <div className={`mt-0.5 text-[11px] font-bold ${(weightDelta ?? 0) >= 0 ? 'text-sage' : 'text-clay'}`}>
                            {weightDelta != null && weightDelta !== 0 ? `${weightDelta > 0 ? '+' : ''}${weightDelta}kg` : ''}
                            {weightDelta && repsDelta ? ' · ' : ''}
                            {repsDelta != null && repsDelta !== 0 ? `${repsDelta > 0 ? '+' : ''}${repsDelta} reps` : ''}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
  );
}
