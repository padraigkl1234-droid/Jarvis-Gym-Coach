'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import { type JarvisStore, type MealEntry, todayStr } from '@/lib/store';
import { Card, Eyebrow } from '@/components/ui';

function fmtDay(date: string): string {
  const today = todayStr();
  const d = new Date(`${date}T00:00:00`);
  const yst = new Date();
  yst.setDate(yst.getDate() - 1);
  if (date === today) return 'Today';
  if (date === todayStr(yst)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface DayGroup {
  date: string;
  meals: MealEntry[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function FoodDiary({
  store,
  onDeleteMeal,
  onClose,
}: {
  store: JarvisStore;
  onDeleteMeal: (meal: MealEntry) => void;
  onClose: () => void;
}) {
  const target = store.profile.calorieTarget;

  const days = useMemo<DayGroup[]>(() => {
    const byDate: Record<string, DayGroup> = {};
    for (const m of store.meals) {
      const g = (byDate[m.date] ??= { date: m.date, meals: [], calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
      g.meals.push(m);
      g.calories += m.calories;
      g.proteinG += m.proteinG;
      g.carbsG += m.carbsG;
      g.fatG += m.fatG;
    }
    return Object.values(byDate)
      .map((g) => ({ ...g, meals: [...g.meals].sort((a, b) => a.time.localeCompare(b.time)) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [store]);

  const [open, setOpen] = useState<string | null>(days[0]?.date ?? null);

  const avg = days.length ? Math.round(days.reduce((a, d) => a + d.calories, 0) / days.length) : 0;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-bold text-faint">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Diet</Eyebrow>
        <h1 className="mt-1 font-display text-[32px] text-ink">Food History</h1>

        {days.length === 0 ? (
          <p className="mt-5 text-[14px] leading-relaxed text-muted">
            No meals logged yet. Anything you add on the Fuel tab is saved here, day by day.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[13px] text-muted">
              {days.length} day{days.length === 1 ? '' : 's'} logged · averaging{' '}
              <span className="font-semibold text-ink">{avg.toLocaleString()}</span> kcal/day
            </p>

            <div className="mt-5 space-y-3">
              {days.map((d) => {
                const isOpen = open === d.date;
                const overUnder = d.calories - target;
                return (
                  <Card key={d.date} className="overflow-hidden rounded-[18px]">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : d.date)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 px-[18px] py-4 text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-ink">{fmtDay(d.date)}</div>
                        <div className="mt-0.5 text-[12px] text-faint">
                          {d.meals.length} item{d.meals.length === 1 ? '' : 's'} · P{Math.round(d.proteinG)} / C{Math.round(d.carbsG)} / F
                          {Math.round(d.fatG)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="text-right">
                          <div className="font-display text-[18px] leading-none text-ink">{Math.round(d.calories).toLocaleString()}</div>
                          <div className={`mt-0.5 text-[11px] font-bold ${overUnder > 0 ? 'text-clay' : 'text-sage'}`}>
                            {overUnder > 0 ? '+' : ''}
                            {Math.round(overUnder)} vs target
                          </div>
                        </div>
                        <ChevronDown size={18} className={`text-faintest transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-divider border-t border-divider px-[18px]">
                        {d.meals.map((m, i) => (
                          <li key={i} className="flex items-center gap-3 py-2.5">
                            <span className="w-11 shrink-0 font-display text-[11px] tabular-nums text-faintest">{m.time}</span>
                            <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{m.name}</span>
                            <span className="shrink-0 font-display text-[14px] text-ink">{Math.round(m.calories)}</span>
                            <button
                              onClick={() => onDeleteMeal(m)}
                              aria-label={`Delete ${m.name}`}
                              className="shrink-0 text-hairline transition-colors hover:text-clay"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
