'use client';

import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { type JarvisStore } from '@/lib/store';
import { buildHomeStats } from '@/lib/stats';
import { Bar, Eyebrow } from '@/components/ui';

function greeting(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** One number with a label beneath it. The building block for every stat row. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[20px] font-semibold leading-none tabular-nums text-ink">{value}</div>
      <div className="mt-1.5 text-[12px] text-faint">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-5">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function HomeTab({ store, onGoToPlan, onGoToFood }: { store: JarvisStore; onGoToPlan: () => void; onGoToFood: () => void }) {
  const s = useMemo(() => buildHomeStats(store), [store]);
  const name = store.profile.name;
  const hour = new Date().getHours();

  // Nothing logged ever: show a nudge rather than a grid of zeros.
  const fresh = s.totals.sets === 0;

  const km = (n: number) => (n > 0 ? `${n}` : '0');
  // Tonnes once the numbers get long, so the column never wraps.
  const vol = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}t` : `${n}kg`);

  return (
    <div>
      <Eyebrow>Valoris</Eyebrow>
      <h1 className="mt-1 font-display text-[30px] leading-tight text-ink">
        {greeting(hour)}, {name}.
      </h1>

      {/* Race countdown */}
      {s.race && (
        <div className="mt-5 flex items-baseline justify-between border border-ink px-4 py-3">
          <span className="truncate pr-3 text-[14px] font-semibold uppercase tracking-wide text-ink">{s.race.name}</span>
          <span className="shrink-0 text-[14px] tabular-nums text-muted">
            {s.race.daysAway === 0 ? 'Today' : s.race.daysAway === 1 ? 'Tomorrow' : `${s.race.daysAway} days`}
          </span>
        </div>
      )}

      {/* Today */}
      <Section title="Today">
        <button onClick={onGoToPlan} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <div className="text-[17px] font-semibold text-ink">{s.today.label ?? 'Rest day'}</div>
            <div className="mt-0.5 text-[12px] text-faint">
              {s.today.exerciseCount === 0
                ? 'Nothing scheduled'
                : s.today.sessionStatus === 'completed'
                ? `Finished · ${s.today.setsDone} sets logged`
                : `${Math.min(s.today.exercisesStarted, s.today.exerciseCount)} of ${s.today.exerciseCount} exercises started`}
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-faint" />
        </button>

        <button onClick={onGoToFood} className="mt-4 w-full text-left">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] text-muted">Calories left</span>
            <span className="text-[15px] font-semibold tabular-nums text-ink">
              {s.today.kcalLeft.toLocaleString()}
              <span className="text-[12px] font-normal text-faint"> of {s.today.kcalTarget.toLocaleString()}</span>
            </span>
          </div>
          <div className="mt-2">
            <Bar pct={s.today.kcalTarget > 0 ? (s.today.kcalEaten / s.today.kcalTarget) * 100 : 0} h="h-1" />
          </div>
        </button>
      </Section>

      {/* Before anything is logged, a grid of zeros says nothing useful. */}
      {fresh ? (
        <Section title="Getting started">
          <p className="text-[14px] leading-relaxed text-muted">
            {store.plan.length === 0
              ? 'Set up your weekly plan and your training stats will build up here — sessions, volume, streaks and personal bests.'
              : 'Tick off your first exercise and your training stats will start building up here.'}
          </p>
          <button onClick={onGoToPlan} className="mt-3 flex items-center gap-1 text-[14px] font-semibold text-ink underline">
            {store.plan.length === 0 ? 'Build my plan' : 'Go to my plan'}
          </button>
        </Section>
      ) : (
        <Section title="This week">
          <div className="grid grid-cols-3 gap-3">
            <Stat value={`${s.week.sessionsDone}/${s.week.sessionsPlanned}`} label="Sessions" />
            <Stat value={vol(s.week.volumeKg)} label="Volume lifted" />
            <Stat value={`${km(s.week.distanceKm)}`} label="Distance (km)" />
          </div>
        </Section>
      )}

      {/* Nutrition — the Today bar already covers it until meals exist. */}
      {store.meals.length > 0 && (
      <Section title="Nutrition">
        <div className="grid grid-cols-3 gap-3">
          <Stat value={s.week.avgCalories != null ? s.week.avgCalories.toLocaleString() : '—'} label="Avg kcal / day" />
          <Stat value={store.profile.calorieTarget.toLocaleString()} label="Daily target" />
          <Stat value={`${s.week.daysLogged}/7`} label="Days logged" />
        </div>
      </Section>
      )}

      {/* Streak and lifetime totals */}
      {!fresh && (
      <Section title="Streak & totals">
        <div className="grid grid-cols-4 gap-3">
          <Stat value={`${s.streakWeeks}`} label={s.streakWeeks === 1 ? 'Week' : 'Weeks'} />
          <Stat value={`${s.totals.workouts}`} label="Workouts" />
          <Stat value={`${s.totals.sets}`} label="Sets" />
          <Stat value={`${km(s.totals.distanceKm)}`} label="Km" />
        </div>
      </Section>
      )}

      {/* Personal bests */}
      {s.prs.length > 0 && (
        <Section title="Personal bests">
          <ul className="space-y-2.5">
            {s.prs.map((pr) => (
              <li key={pr.exercise} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{pr.exercise}</span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">
                  {pr.weightKg}kg
                  {pr.reps != null && <span className="text-[12px] font-normal text-faint"> × {pr.reps}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
