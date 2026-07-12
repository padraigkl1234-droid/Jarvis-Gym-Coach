'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, GlassWater, X } from 'lucide-react';
import { type JarvisStore, type MealEntry, type MealSlot, todayStr } from '@/lib/store';

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

/** Meals logged by voice carry no slot — file them by time of day. */
function slotOf(m: MealEntry): MealSlot {
  if (m.slot) return m.slot;
  const hour = parseInt(m.time.slice(0, 2), 10) || 0;
  if (hour < 5) return 'snack';
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = target > 0 && value > target;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-neutral-500">{label}</span>
        <span className="font-display text-sm tabular-nums text-black">
          {Math.round(value)}
          <span className="text-neutral-400">
            {' '}
            / {target}
            {unit}
          </span>
          {over && <span className="ml-1.5 text-[10px] text-red-600">+{Math.round(value - target)}{unit} over</span>}
        </span>
      </div>
      <div className="h-3 w-full bg-neutral-200">
        <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AddMealForm({
  slot,
  onAdd,
  onClose,
}: {
  slot: MealSlot;
  onAdd: (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; slot: MealSlot }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const valid = name.trim().length > 0 && num(kcal) > 0;

  const numInput = 'h-10 w-full border-2 border-black bg-white px-2 text-center text-sm font-bold tabular-nums text-black focus:border-red-600 focus:outline-none';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd({ name: name.trim(), calories: num(kcal), proteinG: num(protein), carbsG: num(carbs), fatG: num(fat), slot });
        onClose();
      }}
      className="space-y-2 border-t-2 border-black bg-neutral-50 p-3"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Food / meal name"
        className="h-10 w-full border-2 border-black bg-white px-3 text-sm font-medium text-black placeholder:text-neutral-400 focus:border-red-600 focus:outline-none"
      />
      <div className="grid grid-cols-4 gap-2">
        <div>
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="0" className={numInput} />
          <div className="mt-1 text-center font-display text-[8px] uppercase tracking-widest text-neutral-500">kcal</div>
        </div>
        <div>
          <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" placeholder="0" className={numInput} />
          <div className="mt-1 text-center font-display text-[8px] uppercase tracking-widest text-neutral-500">Protein g</div>
        </div>
        <div>
          <input value={carbs} onChange={(e) => setCarbs(e.target.value)} inputMode="numeric" placeholder="0" className={numInput} />
          <div className="mt-1 text-center font-display text-[8px] uppercase tracking-widest text-neutral-500">Carbs g</div>
        </div>
        <div>
          <input value={fat} onChange={(e) => setFat(e.target.value)} inputMode="numeric" placeholder="0" className={numInput} />
          <div className="mt-1 text-center font-display text-[8px] uppercase tracking-widest text-neutral-500">Fat g</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="flex-1 bg-red-600 py-2.5 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          Add to {slot}
        </button>
        <button type="button" onClick={onClose} className="border-2 border-black px-4 font-display text-[11px] uppercase tracking-[0.15em] text-black hover:bg-neutral-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DietPage({
  store,
  onAddMeal,
  onDeleteMeal,
  onSetWater,
}: {
  store: JarvisStore;
  onAddMeal: (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; slot: MealSlot }) => void;
  onDeleteMeal: (meal: MealEntry) => void;
  onSetWater: (ml: number) => void;
}) {
  const today = todayStr();
  const [openForm, setOpenForm] = useState<MealSlot | null>(null);

  const meals = useMemo(() => store.meals.filter((m) => m.date === today), [store, today]);
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const p = store.profile;
  const remaining = Math.round(p.calorieTarget - totals.calories);
  const kcalPct = p.calorieTarget > 0 ? Math.min(100, Math.round((totals.calories / p.calorieTarget) * 100)) : 0;

  const water = store.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const GLASS = 250;
  const glassCount = Math.max(4, Math.min(16, Math.ceil(p.hydrationTargetMl / GLASS)));
  const filledGlasses = Math.min(glassCount, Math.round(water / GLASS));

  const bySlot = (slot: MealSlot) => meals.filter((m) => slotOf(m) === slot);

  return (
    <div className="space-y-6">
      {/* 1 · Calories remaining + macro bars */}
      <section className="border-2 border-black bg-white">
        <div className="grid md:grid-cols-[240px_1fr] md:divide-x-2 md:divide-black">
          <div className="flex flex-col items-center justify-center border-b-2 border-black bg-black px-6 py-6 text-center md:border-b-0">
            <div className={`font-display text-5xl leading-none tracking-tight ${remaining < 0 ? 'text-red-500' : 'text-white'}`}>
              {Math.abs(remaining).toLocaleString()}
            </div>
            <div className="mt-2 font-display text-[10px] uppercase tracking-[0.25em] text-neutral-400">
              kcal {remaining < 0 ? 'over target' : 'remaining'}
            </div>
            <div className="mt-3 h-1.5 w-full max-w-[160px] bg-neutral-700">
              <div className="h-full bg-red-600" style={{ width: `${kcalPct}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] font-bold tabular-nums text-neutral-400">
              {Math.round(totals.calories)} / {p.calorieTarget}
            </div>
          </div>
          <div className="space-y-4 p-5">
            <MacroBar label="Protein" value={totals.proteinG} target={p.proteinTargetG} unit="g" />
            <MacroBar label="Carbs" value={totals.carbsG} target={p.carbsTargetG} unit="g" />
            <MacroBar label="Fat" value={totals.fatG} target={p.fatTargetG} unit="g" />
          </div>
        </div>
      </section>

      {/* 2 · Meal logger sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {SLOTS.map(({ id, label }) => {
          const items = bySlot(id);
          const slotKcal = Math.round(items.reduce((a, m) => a + m.calories, 0));
          return (
            <section key={id} className="border-2 border-black bg-white">
              <div className="flex items-center justify-between border-b-2 border-black px-4 py-2">
                <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">{label}</h2>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xs tabular-nums text-neutral-500">{slotKcal} kcal</span>
                  <button
                    onClick={() => setOpenForm(openForm === id ? null : id)}
                    aria-label={`Add item to ${label}`}
                    className={`flex h-8 w-8 items-center justify-center border-2 transition-colors ${
                      openForm === id ? 'border-black bg-black text-white' : 'border-black bg-white text-black hover:border-red-600 hover:bg-red-600 hover:text-white'
                    }`}
                  >
                    {openForm === id ? <X className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" strokeWidth={3} />}
                  </button>
                </div>
              </div>
              {items.length > 0 ? (
                <ul className="divide-y divide-neutral-200">
                  {items.map((m, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-black">{m.name}</span>
                        <span className="block text-[11px] font-medium tabular-nums text-neutral-500">
                          <span className="font-bold text-black">{Math.round(m.calories)}</span> kcal · P{Math.round(m.proteinG)} C{Math.round(m.carbsG)} F
                          {Math.round(m.fatG)} · {m.time}
                        </span>
                      </span>
                      <button onClick={() => onDeleteMeal(m)} className="p-1.5 text-neutral-300 transition-colors hover:text-red-600" aria-label={`Delete ${m.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                openForm !== id && <p className="px-4 py-3 text-xs font-medium text-neutral-400">Nothing logged.</p>
              )}
              {openForm === id && <AddMealForm slot={id} onAdd={onAddMeal} onClose={() => setOpenForm(null)} />}
            </section>
          );
        })}
      </div>

      {/* 3 · Hydration station */}
      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Hydration Station</h2>
          <span className="font-display text-sm tabular-nums text-black">
            <span className={water >= p.hydrationTargetMl ? 'text-red-600' : ''}>{water}</span>
            <span className="text-neutral-400"> / {p.hydrationTargetMl}ml</span>
          </span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: glassCount }, (_, i) => {
              const filled = i < filledGlasses;
              return (
                <button
                  key={i}
                  onClick={() => onSetWater((i + 1 === filledGlasses ? i : i + 1) * GLASS)}
                  aria-label={`Set water to ${(i + 1) * GLASS}ml`}
                  className={`flex h-12 w-10 items-center justify-center border-2 transition-colors ${
                    filled ? 'border-red-600 bg-red-600 text-white' : 'border-neutral-300 bg-white text-neutral-300 hover:border-red-600 hover:text-red-600'
                  }`}
                >
                  <GlassWater className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Tap a glass · {GLASS}ml each{water >= p.hydrationTargetMl ? ' · Target hit' : ''}
          </div>
        </div>
      </section>
    </div>
  );
}
