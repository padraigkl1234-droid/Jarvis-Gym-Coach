'use client';

import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { type JarvisStore, type MetricEntry, todayStr } from '@/lib/store';
import { MetricCard, ProgressChart } from '@/components/Dashboard';

const fieldCls =
  'h-10 w-full border-2 border-black bg-white px-2 text-center text-sm font-bold tabular-nums text-black focus:border-red-600 focus:outline-none';

/** Log form — one entry per date; saving again for the same date updates it. */
function LogMetricForm({ onSave }: { onSave: (patch: Partial<MetricEntry> & { date: string }) => void }) {
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [sleep, setSleep] = useState('');

  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const valid = num(weight) != null || num(bodyFat) != null || num(restingHr) != null || num(sleep) != null;

  const save = () => {
    if (!valid) return;
    onSave({ date, weightKg: num(weight), bodyFatPct: num(bodyFat), restingHr: num(restingHr), sleepHours: num(sleep) });
    setWeight('');
    setBodyFat('');
    setRestingHr('');
    setSleep('');
  };

  return (
    <div className="space-y-3 p-4">
      <div>
        <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Date</div>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 w-full border-2 border-black bg-white px-3 text-sm font-medium text-black focus:border-red-600 focus:outline-none sm:w-52"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Weight · kg</div>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="0" className={fieldCls} />
        </div>
        <div>
          <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Body Fat · %</div>
          <input value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} inputMode="decimal" placeholder="0" className={fieldCls} />
        </div>
        <div>
          <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Resting HR · bpm</div>
          <input value={restingHr} onChange={(e) => setRestingHr(e.target.value)} inputMode="numeric" placeholder="0" className={fieldCls} />
        </div>
        <div>
          <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Sleep · hrs</div>
          <input value={sleep} onChange={(e) => setSleep(e.target.value)} inputMode="decimal" placeholder="0" className={fieldCls} />
        </div>
      </div>
      <button
        onClick={save}
        disabled={!valid}
        className="w-full bg-red-600 px-5 py-2.5 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
      >
        Save Measurement
      </button>
    </div>
  );
}

export function BodyPage({
  store,
  onLogMetric,
  onDeleteMetric,
}: {
  store: JarvisStore;
  onLogMetric: (patch: Partial<MetricEntry> & { date: string }) => void;
  onDeleteMetric: (entry: MetricEntry) => void;
}) {
  const sorted = useMemo(() => [...store.metrics].sort((a, b) => b.date.localeCompare(a.date)), [store]);

  const weighIns = useMemo(
    () => store.metrics.filter((m) => m.weightKg != null).sort((a, b) => a.date.localeCompare(b.date)),
    [store]
  );
  const bfIns = useMemo(
    () => store.metrics.filter((m) => m.bodyFatPct != null).sort((a, b) => a.date.localeCompare(b.date)),
    [store]
  );
  const latestW = weighIns[weighIns.length - 1];
  const prevW = weighIns[weighIns.length - 2];
  const latestBf = bfIns[bfIns.length - 1];
  const latestHr = [...store.metrics].filter((m) => m.restingHr != null).sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];
  const latestSleep = [...store.metrics].filter((m) => m.sleepHours != null).sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];

  return (
    <div className="space-y-6">
      {/* Hero metric strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Weight"
          value={latestW ? `${latestW.weightKg}kg` : '—'}
          sub={latestW && prevW ? `${(latestW.weightKg! - prevW.weightKg!).toFixed(1)}kg vs last` : 'Log a weigh-in'}
        />
        <MetricCard label="Body Fat" value={latestBf ? `${latestBf.bodyFatPct}%` : '—'} sub={latestBf ? `as of ${latestBf.date.slice(5)}` : 'Not logged yet'} />
        <MetricCard label="Resting HR" value={latestHr ? `${latestHr.restingHr}bpm` : '—'} sub={latestHr ? `as of ${latestHr.date.slice(5)}` : 'Not logged yet'} />
        <MetricCard label="Sleep" value={latestSleep ? `${latestSleep.sleepHours}h` : '—'} sub={latestSleep ? `as of ${latestSleep.date.slice(5)}` : 'Not logged yet'} />
      </div>

      {/* Log form */}
      <section className="border-2 border-black bg-white">
        <div className="border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Log Measurement</h2>
        </div>
        <LogMetricForm onSave={onLogMetric} />
      </section>

      {/* Weight trend */}
      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Weight Over Time</h2>
          <span className="h-2 w-2 bg-red-600" />
        </div>
        <div className="p-4">
          <ProgressChart
            title="Bodyweight"
            unit="kg"
            points={weighIns.slice(-24).map((m) => ({ label: m.date.slice(5).replace('-', '/'), value: m.weightKg! }))}
          />
        </div>
      </section>

      {/* Body fat trend */}
      {bfIns.length >= 2 && (
        <section className="border-2 border-black bg-white">
          <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Body Fat Over Time</h2>
            <span className="h-2 w-2 bg-red-600" />
          </div>
          <div className="p-4">
            <ProgressChart
              title="Body fat"
              unit="%"
              points={bfIns.slice(-24).map((m) => ({ label: m.date.slice(5).replace('-', '/'), value: m.bodyFatPct! }))}
            />
          </div>
        </section>
      )}

      {/* History */}
      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Measurement History</h2>
          <span className="font-display text-xs tabular-nums text-red-600">{sorted.length}</span>
        </div>
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-sm font-medium text-neutral-500">No measurements logged yet — add one above, or tell VALORIS your weight.</p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {sorted.map((m, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-20 shrink-0 font-display text-[11px] tabular-nums text-neutral-400">{m.date.slice(5)}</span>
                <span className="flex-1 truncate text-sm font-medium text-black">
                  {[
                    m.weightKg != null ? `${m.weightKg}kg` : null,
                    m.bodyFatPct != null ? `${m.bodyFatPct}% BF` : null,
                    m.restingHr != null ? `${m.restingHr}bpm` : null,
                    m.sleepHours != null ? `${m.sleepHours}h sleep` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
                <button onClick={() => onDeleteMetric(m)} className="p-1 text-neutral-300 transition-colors hover:text-red-600" aria-label={`Delete ${m.date} measurement`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
