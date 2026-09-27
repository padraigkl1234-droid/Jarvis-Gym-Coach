'use client';

import React, { useMemo } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { type JarvisStore, type MealEntry, todayStr } from '@/lib/store';
import { Eyebrow } from '@/components/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(date: string): string {
  if (date === todayStr()) return 'Today';
  const d = new Date(`${date}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`;
}

/** Past days of eating, newest first. */
export function FoodHistory({ store, onDeleteMeal, onClose }: { store: JarvisStore; onDeleteMeal: (m: MealEntry) => void; onClose: () => void }) {
  const days = useMemo(() => {
    const byDate: Record<string, MealEntry[]> = {};
    for (const m of store.meals) (byDate[m.date] ??= []).push(m);
    return Object.entries(byDate)
      .map(([date, meals]) => ({
        date,
        meals: [...meals].sort((a, b) => a.time.localeCompare(b.time)),
        kcal: meals.reduce((a, m) => a + m.calories, 0),
        protein: meals.reduce((a, m) => a + m.proteinG, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [store.meals]);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-semibold text-muted">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Nutrition</Eyebrow>
        <h1 className="mt-1 font-display text-[30px] text-ink">History</h1>

        {days.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted">Nothing logged yet.</p>
        ) : (
          <div className="mt-5">
            {days.map((d) => (
              <div key={d.date} className="border-b border-line py-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold text-ink">{fmtDate(d.date)}</span>
                  <span className="text-[13px] tabular-nums text-faint">
                    {Math.round(d.kcal).toLocaleString()} kcal · {Math.round(d.protein)}g protein
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {d.meals.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{m.name}</span>
                      <span className="shrink-0 text-[13px] tabular-nums text-faint">{Math.round(m.calories)}</span>
                      <button onClick={() => onDeleteMeal(m)} aria-label={`Remove ${m.name}`} className="shrink-0 text-faint">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
