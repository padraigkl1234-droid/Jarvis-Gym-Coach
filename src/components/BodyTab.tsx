'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { type JarvisStore, type MetricEntry, todayStr } from '@/lib/store';
import { Card, Eyebrow } from '@/components/ui';

const CLAY = '#B4552F';

function MetricTile({
  label,
  value,
  unit,
  sub,
  subTone = 'faint',
  onClick,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  subTone?: 'sage' | 'faint';
  onClick: () => void;
}) {
  return (
    <Card onClick={onClick} className="rounded-[18px] p-4">
      <Eyebrow className="!text-[10px]">{label}</Eyebrow>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[28px] leading-none text-ink">{value}</span>
        <span className="text-[13px] text-faint">{unit}</span>
      </div>
      {sub && <div className={`mt-1.5 text-[12px] font-bold ${subTone === 'sage' ? 'text-sage' : 'text-faint'}`}>{sub}</div>}
    </Card>
  );
}

/** 90-day weight line: clay polyline over a soft gradient area. */
function WeightChart({ points }: { points: { date: string; value: number }[] }) {
  const W = 300;
  const H = 110;
  const PAD = { l: 6, r: 6, t: 10, b: 20 };
  if (points.length < 2) {
    return (
      <div className="flex h-[110px] items-center justify-center rounded-xl bg-canvas text-[12px] font-semibold text-hairline">
        Log two weigh-ins to draw your trend
      </div>
    );
  }
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const lo = min - span * 0.2;
  const hi = max + span * 0.2;
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime() || t0 + 1;
  const x = (d: string) => PAD.l + ((new Date(d).getTime() - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points[points.length - 1].date).toFixed(1)},${H - PAD.b} L${x(points[0].date).toFixed(1)},${H - PAD.b} Z`;

  // Month labels across the visible range.
  const months: { label: string; xPos: number }[] = [];
  const cursor = new Date(points[0].date);
  cursor.setDate(1);
  while (cursor.getTime() <= t1) {
    if (cursor.getTime() >= t0) {
      months.push({ label: cursor.toLocaleDateString('en-GB', { month: 'short' }), xPos: x(todayStr(cursor)) });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight trend chart">
      <defs>
        <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CLAY} stopOpacity="0.18" />
          <stop offset="100%" stopColor={CLAY} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#weightFill)" />
      <path d={line} fill="none" stroke={CLAY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {months.map((m, i) => (
        <text key={i} x={m.xPos} y={H - 6} textAnchor="middle" fontSize="11" fill="#A8A296" fontWeight="600">
          {m.label}
        </text>
      ))}
    </svg>
  );
}

export function BodyTab({
  store,
  onOpenLog,
  onDeleteMetric,
}: {
  store: JarvisStore;
  onOpenLog: () => void;
  onDeleteMetric: (entry: MetricEntry) => void;
}) {
  const weighIns = useMemo(
    () => store.metrics.filter((m) => m.weightKg != null).sort((a, b) => a.date.localeCompare(b.date)),
    [store]
  );
  const latestW = weighIns[weighIns.length - 1];

  // Change over the last month of weigh-ins.
  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return todayStr(d);
  }, []);
  const baseline = weighIns.find((m) => m.date >= monthAgo) ?? weighIns[0];
  const delta = latestW && baseline && latestW !== baseline ? latestW.weightKg! - baseline.weightKg! : null;

  const latest = (key: 'bodyFatPct' | 'restingHr' | 'sleepHours') => {
    const rows = store.metrics.filter((m) => m[key] != null).sort((a, b) => a.date.localeCompare(b.date));
    return rows[rows.length - 1];
  };
  const bf = latest('bodyFatPct');
  const hr = latest('restingHr');
  const sleep = latest('sleepHours');

  const chartStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return todayStr(d);
  }, []);
  const chartPoints = weighIns.filter((m) => m.date >= chartStart).map((m) => ({ date: m.date, value: m.weightKg! }));

  const recent = [...store.metrics]
    .filter((m) => m.weightKg != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div>
      <Eyebrow className="pt-2">Progress</Eyebrow>
      <h1 className="mt-1 font-display text-[32px] text-ink">Body</h1>

      {/* Metric grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricTile
          label="Weight"
          value={latestW ? String(latestW.weightKg) : '—'}
          unit="kg"
          sub={
            delta != null
              ? `${delta <= 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(1)} this month`
              : latestW
              ? `as of ${latestW.date.slice(5)}`
              : 'Tap to log'
          }
          subTone={delta != null && delta < 0 ? 'sage' : 'faint'}
          onClick={onOpenLog}
        />
        <MetricTile label="Body fat" value={bf ? String(bf.bodyFatPct) : '—'} unit="%" sub={bf ? `as of ${bf.date.slice(5)}` : 'Tap to log'} onClick={onOpenLog} />
        <MetricTile label="Resting HR" value={hr ? String(hr.restingHr) : '—'} unit="bpm" sub={hr ? `as of ${hr.date.slice(5)}` : 'Tap to log'} onClick={onOpenLog} />
        <MetricTile label="Sleep" value={sleep ? String(sleep.sleepHours) : '—'} unit="hrs" sub={sleep ? `as of ${sleep.date.slice(5)}` : 'Tap to log'} onClick={onOpenLog} />
      </div>

      {/* Chart */}
      <Card className="mt-5 rounded-[20px] p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[18px] text-ink">Weight over time</span>
          <span className="text-[12px] font-semibold text-faint">90 days</span>
        </div>
        <div className="mt-3">
          <WeightChart points={chartPoints} />
        </div>
      </Card>

      {/* Recent logs */}
      <div className="mt-7">
        <Eyebrow>Recent logs</Eyebrow>
        {recent.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">No measurements yet — tap a tile above or the + button to log one.</p>
        ) : (
          <ul className="mt-1">
            {recent.map((m, i) => (
              <li key={m.date} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <span className="text-[13px] text-faint">
                  {new Date(`${m.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-display text-[17px] text-ink">{m.weightKg} kg</span>
                  <button onClick={() => onDeleteMetric(m)} aria-label={`Delete ${m.date} log`} className="text-hairline transition-colors hover:text-clay">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
