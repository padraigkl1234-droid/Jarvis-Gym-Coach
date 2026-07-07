'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { type JarvisStore } from '@/lib/store';
import { buildStats } from '@/lib/stats';
import { sessionCounts, exerciseVolumeSeries, macroConsistency } from '@/lib/analytics';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function StatTile({ value, label, accent = 'sky' }: { value: string; label: string; accent?: 'sky' | 'amber' | 'emerald' | 'violet' }) {
  const color = { sky: 'text-sky-200', amber: 'text-amber-200', emerald: 'text-emerald-200', violet: 'text-violet-200' }[accent];
  return (
    <div className="rounded border border-white/10 bg-white/[0.02] px-2 py-2.5 text-center">
      <div className={`font-display text-lg leading-none tabular-nums ${color}`}>{value}</div>
      <div className="mt-1.5 text-[9px] font-medium uppercase tracking-widest text-white/55">{label}</div>
    </div>
  );
}

/** Tiny inline sparkline for a numeric series. */
function Sparkline({ points, width = 96, height = 24 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2 || points.every((p) => p === 0)) {
    return <div className="h-[24px] w-[96px] rounded bg-white/[0.03]" />;
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - 2 - ((p - min) / span) * (height - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={d} fill="none" stroke="rgba(56,189,248,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProgressPanel({ store, onClose }: { store: JarvisStore; onClose: () => void }) {
  const counts = useMemo(() => sessionCounts(store), [store]);
  const stats = useMemo(() => buildStats(store, { days: 90 }), [store]);
  const macros = useMemo(() => macroConsistency(store, 14), [store]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const topExercises = stats.exerciseHistory.slice(0, 6);
  const focused = selectedExercise ?? topExercises[0]?.exercise ?? null;
  const volumeSeries = useMemo(
    () => (focused ? exerciseVolumeSeries(store, focused, 8) : []),
    [store, focused]
  );

  const recentSessions = stats.completedSessions.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-lg border border-sky-400/25 bg-black/80 p-6 backdrop-blur-md sm:p-7"
        style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.08)' }}
      >
        <span className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-sky-400/60" />
        <span className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-sky-400/60" />
        <span className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-sky-400/60" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-sky-400/60" />

        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="font-display text-base tracking-[0.3em] text-white">PROGRESS</div>
            <div className="mt-0.5 font-display text-[9px] uppercase tracking-[0.3em] text-sky-300/70">
              Training &amp; nutrition analytics
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 transition-colors hover:text-white/80" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overview */}
        <div className="mb-5 grid grid-cols-4 gap-2">
          <StatTile value={String(counts.completedThisWeek)} label="This week" accent="sky" />
          <StatTile value={String(counts.completedThisMonth)} label="This month" accent="sky" />
          <StatTile value={counts.volumeKgThisWeek >= 1000 ? `${(counts.volumeKgThisWeek / 1000).toFixed(1)}t` : `${counts.volumeKgThisWeek}`} label="Vol · wk (kg)" accent="emerald" />
          <StatTile value={macros.proteinHitRate != null ? `${macros.proteinHitRate}%` : '–'} label="Protein hit" accent="violet" />
        </div>

        {/* Exercise progression */}
        <div className="mb-5">
          <div className="mb-2 font-display text-[9px] font-medium uppercase tracking-[0.25em] text-white/55">
            Exercise Progression · 90d
          </div>
          {topExercises.length === 0 ? (
            <div className="text-[12px] italic text-white/35">No sets logged yet — go train and it&rsquo;ll show up here.</div>
          ) : (
            <div className="space-y-1">
              {topExercises.map((e) => {
                const active = e.exercise === focused;
                return (
                  <button
                    key={e.exercise}
                    onClick={() => setSelectedExercise(e.exercise)}
                    className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
                      active ? 'border-sky-400/40 bg-sky-400/10' : 'border-transparent hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px] text-white/85">{e.exercise}</span>
                    <span className="font-display text-[10px] tabular-nums text-white/55">
                      best {e.bestWeightKg ?? '–'}kg
                    </span>
                    <span className="font-display text-[10px] tabular-nums text-sky-200/80">
                      e1RM {e.best1RM ?? '–'}
                    </span>
                  </button>
                );
              })}
              {focused && (
                <div className="mt-2 flex items-center gap-3 rounded border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium text-white/80">{focused} · weekly volume</div>
                    <div className="text-[10px] tabular-nums text-white/45">
                      {volumeSeries.reduce((a, p) => a + p.volumeKg, 0).toLocaleString()}kg over 8 weeks
                    </div>
                  </div>
                  <Sparkline points={volumeSeries.map((p) => p.volumeKg)} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Macro consistency */}
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-[9px] font-medium uppercase tracking-[0.25em] text-white/55">
              Macro Consistency · 14d
            </span>
            <span className="text-[10px] tabular-nums text-white/45">
              {macros.daysLogged} day{macros.daysLogged === 1 ? '' : 's'} logged
              {macros.currentProteinStreak > 1 ? ` · ${macros.currentProteinStreak}-day protein streak` : ''}
            </span>
          </div>
          {macros.perDay.length === 0 ? (
            <div className="text-[12px] italic text-white/35">No meals logged in the last two weeks.</div>
          ) : (
            <div className="space-y-1">
              {macros.perDay.slice(-10).map((d) => (
                <div key={d.date} className="flex items-center gap-2 text-[10px]">
                  <span className="w-8 shrink-0 font-display text-white/45">
                    {WEEKDAYS[new Date(`${d.date}T00:00:00`).getDay()]}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${d.withinCalories ? 'bg-gradient-to-r from-emerald-500 to-teal-300' : 'bg-gradient-to-r from-amber-500 to-yellow-300'}`}
                      style={{ width: `${Math.min(120, d.caloriePct) / 1.2}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right tabular-nums text-white/55">{d.caloriePct}%</span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${d.hitProtein ? 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]' : 'bg-white/15'}`}
                    title={d.hitProtein ? 'Protein target hit' : 'Protein short'}
                  />
                </div>
              ))}
              <div className="pt-1 text-[10px] text-white/40">
                Bar = calories vs target (green when within ±10%) · dot = protein target hit
              </div>
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div>
          <div className="mb-2 font-display text-[9px] font-medium uppercase tracking-[0.25em] text-white/55">
            Recent Sessions
          </div>
          {recentSessions.length === 0 ? (
            <div className="text-[12px] italic text-white/35">No workouts recorded yet.</div>
          ) : (
            <div className="space-y-1">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-baseline gap-2 text-[11px]">
                  <span className="w-8 shrink-0 font-display text-white/45">{WEEKDAYS[s.weekday]}</span>
                  <span className="min-w-0 flex-1 truncate text-white/80">{s.label}</span>
                  <span className={`shrink-0 text-[9px] uppercase tracking-widest ${s.status === 'completed' ? 'text-emerald-300/80' : 'text-amber-300/80'}`}>
                    {s.status === 'completed' ? 'done' : 'open'}
                  </span>
                  <span className="shrink-0 font-display tabular-nums text-white/55">
                    {s.totalSets} sets · {s.totalVolumeKg.toLocaleString()}kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
