'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { type JarvisStore, todayStr } from '@/lib/store';
import { Bar, Eyebrow } from '@/components/ui';

const MANUAL_KEY = 'valoris.checklist.manual.v1';

function readManual(): Record<string, boolean> {
  try {
    const raw = JSON.parse(localStorage.getItem(MANUAL_KEY) ?? '{}');
    return raw.date === todayStr() ? raw.items ?? {} : {};
  } catch {
    return {};
  }
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export function HomeTab({
  store,
  onStartSession,
  onOpenSettings,
}: {
  store: JarvisStore;
  onStartSession: () => void;
  onOpenSettings: () => void;
}) {
  const [manual, setManual] = useState<Record<string, boolean>>({});
  useEffect(() => setManual(readManual()), []);

  const now = new Date();
  const today = todayStr(now);
  const weekday = now.getDay();
  const p = store.profile;
  const firstName = (p.name || 'Athlete').split(' ')[0];

  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\w+) /, '$1 · ');

  const planToday = store.plan.find((d) => d.weekday === weekday);
  const hasSession = !!planToday && planToday.exercises.length > 0;

  const todayMeals = store.meals.filter((m) => m.date === today);
  const kcal = todayMeals.reduce((a, m) => a + m.calories, 0);
  const protein = todayMeals.reduce((a, m) => a + m.proteinG, 0);
  const waterMl = store.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const sessionDone = store.sessions.some((s) => s.date === today && s.status === 'completed');

  const estMinutes = hasSession ? planToday!.exercises.length * 9 + 3 : 0;

  const items = useMemo(
    () => [
      {
        id: 'protein',
        label: 'Hit protein goal',
        done: p.proteinTargetG > 0 && protein >= p.proteinTargetG * 0.9,
        manual: false,
      },
      {
        id: 'workout',
        label: hasSession ? `Complete ${planToday!.label}` : 'Rest day — recover well',
        done: hasSession ? sessionDone : true,
        manual: false,
      },
      {
        id: 'water',
        label: `Drink ${(p.hydrationTargetMl / 1000).toFixed(1)} L of water`,
        done: waterMl >= p.hydrationTargetMl,
        manual: false,
      },
      {
        id: 'stretch',
        label: 'Stretch or mobility · 10 min',
        done: !!manual.stretch,
        manual: true,
      },
    ],
    [p, protein, hasSession, planToday, sessionDone, waterMl, manual]
  );
  const doneCount = items.filter((i) => i.done).length;

  const toggleManual = (id: string) => {
    const next = { ...manual, [id]: !manual[id] };
    setManual(next);
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify({ date: todayStr(), items: next }));
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-[3px] bg-clay" />
          <span className="text-[13px] font-extrabold tracking-[0.16em] text-ink">VALORIS</span>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-track text-[14px] font-bold text-muted"
        >
          {firstName[0]?.toUpperCase() ?? 'A'}
        </button>
      </div>

      {/* Greeting */}
      <div className="mt-[34px]">
        <div className="text-[13px] font-semibold text-faint">{dateLine}</div>
        <h1 className="mt-1.5 font-display text-[34px] leading-[1.12] text-ink">
          {greetingFor(now.getHours())}
          <br />
          {firstName}.
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
          {hasSession ? (
            <>
              <span className="font-semibold text-clay">{planToday!.label}</span> is on the plan today.
            </>
          ) : (
            'No session today — recovery is part of the plan.'
          )}
        </p>
      </div>

      {/* Macro bars */}
      <div className="mt-7 space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-ink">Calories</span>
            <span className="text-[13px] text-faint">
              <span className="font-display text-[17px] text-ink">{Math.round(kcal).toLocaleString()}</span> / {p.calorieTarget.toLocaleString()}
            </span>
          </div>
          <Bar pct={p.calorieTarget > 0 ? (kcal / p.calorieTarget) * 100 : 0} fill="bg-clay" />
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-ink">Protein</span>
            <span className="text-[13px] text-faint">
              <span className="font-display text-[17px] text-ink">{Math.round(protein)}</span> / {p.proteinTargetG} g
            </span>
          </div>
          <Bar pct={p.proteinTargetG > 0 ? (protein / p.proteinTargetG) * 100 : 0} fill="bg-sage" />
        </div>
      </div>

      {/* Today's session card */}
      {hasSession && (
        <button
          type="button"
          onClick={onStartSession}
          className="mt-7 block w-full rounded-[22px] bg-ink px-6 py-[22px] text-left"
        >
          <div className="eyebrow !text-ondark-label">Today&apos;s session</div>
          <div className="mt-2 font-display text-[24px] text-white">{planToday!.label}</div>
          <div className="mt-1 text-[13px] text-ondark-sub">
            {planToday!.exercises.length} exercise{planToday!.exercises.length === 1 ? '' : 's'} · ~{estMinutes} min
          </div>
          <div className="mt-4 text-[13px] font-bold text-white">{sessionDone ? 'Session complete ✓' : 'Start session →'}</div>
        </button>
      )}

      {/* Today's focus */}
      <div className="mt-8">
        <Eyebrow>
          Today&apos;s focus · {doneCount} / {items.length}
        </Eyebrow>
        <ul className="mt-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.manual ? () => toggleManual(item.id) : undefined}
                className={`flex w-full items-center gap-3.5 py-3 text-left ${item.manual ? '' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] transition-colors duration-150 ${
                    item.done ? 'bg-sage text-white' : 'border-2 border-[#D8D2C4] bg-transparent text-transparent'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className={`text-[14px] font-medium ${item.done ? 'text-hairline line-through' : 'text-ink'}`}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
