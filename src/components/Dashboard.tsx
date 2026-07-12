'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Check } from 'lucide-react';
import { type JarvisStore, todayStr } from '@/lib/store';
import { buildDailyMacros, buildSessions } from '@/lib/stats';
import { sessionCounts, exerciseVolumeSeries, macroConsistency } from '@/lib/analytics';

const RED = '#DC2626';

/* ---------------- Hero metric strip ---------------- */

function MetricCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
}) {
  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl tracking-tight text-black">{value}</span>
        {trend && (
          <span className="text-red-600">
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : trend === 'down' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </span>
        )}
      </div>
      <div className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] font-medium text-neutral-700">{sub}</div>}
    </div>
  );
}

/* ---------------- Progress chart (inline SVG) ---------------- */

function ProgressChart({ points, unit, title }: { points: { label: string; value: number }[]; unit: string; title: string }) {
  const W = 640;
  const H = 220;
  const PAD = { l: 44, r: 14, t: 14, b: 26 };
  if (points.length < 2) {
    return (
      <div className="flex h-[180px] items-center justify-center border border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-400">
        Log at least two {title.toLowerCase()} entries to draw the trend
      </div>
    );
  }
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD.t + f * (H - PAD.t - PAD.b));
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title} trend chart`}>
      {gridY.map((gy, i) => (
        <line key={i} x1={PAD.l} x2={W - PAD.r} y1={gy} y2={gy} stroke="#e5e5e5" strokeWidth="1" />
      ))}
      {[0, 0.5, 1].map((f, i) => {
        const v = hi - f * (hi - lo);
        return (
          <text key={i} x={PAD.l - 8} y={PAD.t + f * (H - PAD.t - PAD.b) + 4} textAnchor="end" fontSize="10" fill="#737373" fontWeight="600">
            {Math.round(v)}
            {unit}
          </text>
        );
      })}
      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#a3a3a3" fontWeight="600">
            {p.label}
          </text>
        ) : null
      )}
      <path d={path} fill="none" stroke={RED} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" fill="#fff" stroke={RED} strokeWidth="2.5" />
      ))}
    </svg>
  );
}

/* ---------------- Daily checklist ---------------- */

interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  manual: boolean;
}

const MANUAL_KEY = 'valoris.checklist.manual.v1';

function readManual(): Record<string, boolean> {
  try {
    const raw = JSON.parse(localStorage.getItem(MANUAL_KEY) ?? '{}');
    return raw.date === todayStr() ? raw.items ?? {} : {};
  } catch {
    return {};
  }
}

/* ---------------- Briefing ---------------- */

const QUOTES = [
  'Discipline is choosing between what you want now and what you want most.',
  'You do not rise to the occasion. You fall to the level of your training.',
  'The bar is honest. Show up and it will tell you the truth.',
  'Consistency beats intensity every week of the year.',
  'Hard days build the athlete. Easy days build the habit.',
  'No one is coming to lift it for you.',
  'Strength is earned in the sets you did not want to do.',
];

function buildBriefing(store: JarvisStore): string {
  const counts = sessionCounts(store);
  const macros = macroConsistency(store, 7);
  const today = todayStr();
  const weekday = new Date().getDay();
  const plan = store.plan.find((p) => p.weekday === weekday);
  const doneToday = buildSessions(store, today).some((s) => s.date === today && s.status === 'completed');

  const parts: string[] = [];
  parts.push(
    `${counts.completedThisWeek} session${counts.completedThisWeek === 1 ? '' : 's'} completed this week` +
      (counts.volumeKgThisWeek > 0 ? ` for ${counts.volumeKgThisWeek.toLocaleString()}kg of volume.` : '.')
  );
  if (macros.proteinHitRate != null) {
    parts.push(`Protein target hit on ${macros.proteinHitRate}% of logged days over the last 7.`);
  }
  if (plan && plan.exercises.length > 0) {
    parts.push(doneToday ? `Today's ${plan.label} session is in the books.` : `Today's mission: ${plan.label} — ${plan.exercises.length} exercises. Execute.`);
  } else {
    parts.push('No session scheduled today — recover hard: protein, water, sleep.');
  }
  return parts.join(' ');
}

/* ---------------- Dashboard ---------------- */

export function Dashboard({ store }: { store: JarvisStore }) {
  const [manual, setManual] = useState<Record<string, boolean>>({});
  useEffect(() => setManual(readManual()), []);

  const counts = useMemo(() => sessionCounts(store), [store]);

  const weighIns = useMemo(
    () => store.metrics.filter((m) => m.weightKg != null).sort((a, b) => a.date.localeCompare(b.date)),
    [store]
  );
  const latestW = weighIns[weighIns.length - 1];
  const prevW = weighIns[weighIns.length - 2];
  const wTrend: 'up' | 'down' | 'flat' | undefined =
    latestW && prevW ? (latestW.weightKg! > prevW.weightKg! ? 'up' : latestW.weightKg! < prevW.weightKg! ? 'down' : 'flat') : undefined;

  const bodyFats = store.metrics.filter((m) => m.bodyFatPct != null);
  const latestBf = bodyFats[bodyFats.length - 1];

  const today = todayStr();
  const todayMacros = useMemo(() => buildDailyMacros(store, today).find((d) => d.date === today), [store, today]);
  const kcal = todayMacros?.calories ?? 0;
  const kcalTarget = store.profile.calorieTarget;
  const kcalPct = kcalTarget > 0 ? Math.round((kcal / kcalTarget) * 100) : 0;

  // Chart: bodyweight trend when available, otherwise weekly training volume.
  const chart = useMemo(() => {
    if (weighIns.length >= 2) {
      return {
        title: 'Bodyweight',
        unit: 'kg',
        points: weighIns.slice(-16).map((m) => ({
          label: m.date.slice(5).replace('-', '/'),
          value: m.weightKg!,
        })),
      };
    }
    const topExercise = [...store.sets].sort((a, b) => b.date.localeCompare(a.date))[0]?.exercise;
    if (topExercise) {
      const series = exerciseVolumeSeries(store, topExercise, 8).filter((p) => p.sets > 0 || true);
      return {
        title: `${topExercise} weekly volume`,
        unit: '',
        points: series.map((p) => ({ label: p.weekStart.slice(5).replace('-', '/'), value: p.volumeKg })),
      };
    }
    return { title: 'Bodyweight', unit: 'kg', points: [] as { label: string; value: number }[] };
  }, [store, weighIns]);

  // Checklist: derived from real logs; stretch is a manual tick.
  const proteinPct = todayMacros && store.profile.proteinTargetG > 0 ? (todayMacros.proteinG / store.profile.proteinTargetG) * 100 : 0;
  const waterMl = todayMacros?.waterMl ?? 0;
  const weekday = new Date().getDay();
  const planToday = store.plan.find((p) => p.weekday === weekday);
  const sessionDoneToday = useMemo(
    () => buildSessions(store, today).some((s) => s.date === today && s.status === 'completed'),
    [store, today]
  );

  const items: ChecklistItem[] = [
    {
      id: 'protein',
      label: 'Hit protein goal',
      detail: `${Math.round(todayMacros?.proteinG ?? 0)} / ${store.profile.proteinTargetG}g`,
      done: proteinPct >= 90,
      manual: false,
    },
    {
      id: 'workout',
      label: planToday && planToday.exercises.length > 0 ? `Complete ${planToday.label} workout` : 'Rest day — recover',
      detail: planToday && planToday.exercises.length > 0 ? `${planToday.exercises.length} exercises planned` : 'No session scheduled',
      done: planToday && planToday.exercises.length > 0 ? sessionDoneToday : true,
      manual: false,
    },
    {
      id: 'water',
      label: `Drink ${(store.profile.hydrationTargetMl / 1000).toFixed(1)}L water`,
      detail: `${(waterMl / 1000).toFixed(1)}L logged`,
      done: waterMl >= store.profile.hydrationTargetMl,
      manual: false,
    },
    {
      id: 'stretch',
      label: 'Stretch / mobility 10 min',
      detail: 'Tap to check off',
      done: !!manual.stretch,
      manual: true,
    },
  ];

  const toggleManual = (id: string) => {
    const next = { ...manual, [id]: !manual[id] };
    setManual(next);
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify({ date: todayStr(), items: next }));
    } catch {
      /* storage unavailable */
    }
  };

  const briefing = useMemo(() => buildBriefing(store), [store]);
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="space-y-6">
      {/* Hero metric strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Weight"
          value={latestW ? `${latestW.weightKg}kg` : '—'}
          sub={latestW && prevW ? `${(latestW.weightKg! - prevW.weightKg!).toFixed(1)}kg vs last` : 'Log a weigh-in'}
          trend={wTrend}
        />
        <MetricCard label="Body Fat" value={latestBf ? `${latestBf.bodyFatPct}%` : '—'} sub={latestBf ? `as of ${latestBf.date.slice(5)}` : 'Not logged yet'} />
        <MetricCard
          label="Calories Today"
          value={`${kcalPct}%`}
          sub={`${Math.round(kcal)} / ${kcalTarget} kcal`}
          trend={kcalPct > 110 ? 'up' : kcalPct >= 90 ? 'flat' : undefined}
        />
        <MetricCard
          label="Week Streak"
          value={`${counts.completedThisWeek}/${store.profile.daysPerWeek ?? '—'}`}
          sub={`${counts.completedThisMonth} sessions this month`}
        />
      </div>

      {/* Progress chart */}
      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Progress · {chart.title}</h2>
          <span className="h-2 w-2 bg-red-600" />
        </div>
        <div className="p-4">
          <ProgressChart points={chart.points} unit={chart.unit} title={chart.title} />
        </div>
      </section>

      {/* Daily checklist */}
      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Today&apos;s Non-Negotiables</h2>
          <span className="font-display text-xs tabular-nums text-red-600">
            {doneCount}/{items.length}
          </span>
        </div>
        <ul className="divide-y divide-neutral-200">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.manual ? () => toggleManual(item.id) : undefined}
                disabled={!item.manual}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${item.manual ? 'cursor-pointer hover:bg-neutral-50' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${
                    item.done ? 'border-red-600 bg-red-600 text-white' : 'border-black bg-white text-transparent'
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={3.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold uppercase tracking-wide ${item.done ? 'text-neutral-400 line-through' : 'text-black'}`}>
                    {item.label}
                  </span>
                  <span className="block text-[11px] font-medium text-neutral-500">{item.detail}</span>
                </span>
                {item.done && <span className="font-display text-[9px] uppercase tracking-[0.2em] text-red-600">Done</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Coach briefing */}
      <section className="border-2 border-black bg-black text-white">
        <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-white">Valoris · Daily Briefing</h2>
          <span className="h-2 w-2 animate-pulse bg-red-600" />
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm font-medium leading-relaxed text-neutral-100">{briefing}</p>
          <p className="border-l-4 border-red-600 pl-3 text-[13px] italic leading-snug text-neutral-400">&ldquo;{quote}&rdquo;</p>
        </div>
      </section>
    </div>
  );
}
