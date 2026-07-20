'use client';

import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { type JarvisStore, type MealEntry, type MealSlot, todayStr } from '@/lib/store';
import { Bar, Card, Eyebrow, fieldCls } from '@/components/ui';

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

/** Meals logged without a slot get filed by time of day. */
function slotOf(m: MealEntry): MealSlot {
  if (m.slot) return m.slot;
  const hour = parseInt(m.time.slice(0, 2), 10) || 0;
  if (hour < 5) return 'snack';
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

function MacroMini({ label, value, target, fill }: { label: string; value: number; target: number; fill: string }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-ondark-sub">{label}</div>
      <div className="mb-1.5 mt-0.5 text-[12px] tabular-nums text-ondark-sub">
        {Math.round(value)} / {target}
      </div>
      <Bar pct={target > 0 ? (value / target) * 100 : 0} fill={fill} track="bg-ondark-track" h="h-[5px]" />
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd({ name: name.trim(), calories: num(kcal), proteinG: num(protein), carbsG: num(carbs), fatG: num(fat), slot });
        onClose();
      }}
      className="mt-3 space-y-2 border-t border-divider pt-3"
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="What did you eat?" className={`${fieldCls} !bg-canvas`} />
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ['kcal', kcal, setKcal],
            ['P g', protein, setProtein],
            ['C g', carbs, setCarbs],
            ['F g', fat, setFat],
          ] as const
        ).map(([ph, val, set]) => (
          <input
            key={ph}
            value={val}
            onChange={(e) => set(e.target.value)}
            inputMode="numeric"
            placeholder={ph}
            className={`${fieldCls} !bg-canvas !px-2 text-center`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="flex-1 rounded-full bg-clay py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-clay-dark disabled:bg-track disabled:text-hairline"
        >
          Add
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2.5 text-[13px] font-bold text-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function FuelTab({
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
  const [addingSlot, setAddingSlot] = useState<MealSlot | null>(null);
  const today = todayStr();
  const p = store.profile;

  const meals = useMemo(() => store.meals.filter((m) => m.date === today), [store, today]);
  const kcal = meals.reduce((a, m) => a + m.calories, 0);
  const protein = meals.reduce((a, m) => a + m.proteinG, 0);
  const carbs = meals.reduce((a, m) => a + m.carbsG, 0);
  const fat = meals.reduce((a, m) => a + m.fatG, 0);
  const remaining = Math.max(0, p.calorieTarget - kcal);
  const waterMl = store.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);

  return (
    <div>
      <Eyebrow className="pt-2">Diet</Eyebrow>
      <h1 className="mt-1 font-display text-[32px] text-ink">Fuel</h1>

      {/* Hero card */}
      <div className="mt-5 rounded-3xl bg-ink p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display text-[44px] leading-none text-white">{remaining.toLocaleString()}</div>
            <div className="eyebrow mt-2 !text-ondark-label">Kcal remaining</div>
          </div>
          <div className="pb-1 text-right text-[12px] leading-snug text-ondark-sub">
            {Math.round(kcal).toLocaleString()} eaten
            <br />
            of {p.calorieTarget.toLocaleString()}
          </div>
        </div>
        <div className="mt-4">
          <Bar pct={p.calorieTarget > 0 ? (kcal / p.calorieTarget) * 100 : 0} fill="bg-clay-bright" track="bg-ondark-track" />
        </div>
        <div className="mt-[22px] grid grid-cols-3 gap-[22px]">
          <MacroMini label="Protein" value={protein} target={p.proteinTargetG} fill="bg-sage-bright" />
          <MacroMini label="Carbs" value={carbs} target={p.carbsTargetG} fill="bg-carb" />
          <MacroMini label="Fat" value={fat} target={p.fatTargetG} fill="bg-fatm" />
        </div>
      </div>

      {/* Meal cards */}
      <div className="mt-5 space-y-3">
        {SLOTS.map(({ id, label }) => {
          const slotMeals = meals.filter((m) => slotOf(m) === id);
          const slotKcal = slotMeals.reduce((a, m) => a + m.calories, 0);
          return (
            <Card key={id} className="rounded-[18px] px-[18px] py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[15px] font-bold text-ink">{label}</span>
                  {slotKcal > 0 && <span className="text-[13px] text-faint">{Math.round(slotKcal)} kcal</span>}
                </div>
                <button
                  onClick={() => setAddingSlot(addingSlot === id ? null : id)}
                  aria-label={`Add to ${label}`}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-clay-soft text-clay"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
              {slotMeals.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-x-1 gap-y-1">
                  {slotMeals.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[13px] text-muted">
                      {m.name}
                      <button onClick={() => onDeleteMeal(m)} aria-label={`Remove ${m.name}`} className="text-hairline transition-colors hover:text-clay">
                        <X className="h-3 w-3" />
                      </button>
                      {i < slotMeals.length - 1 && <span className="text-hairline">·</span>}
                    </span>
                  ))}
                </div>
              ) : (
                addingSlot !== id && <div className="mt-1.5 text-[13px] text-hairline">Nothing logged yet</div>
              )}
              {addingSlot === id && <AddMealForm slot={id} onAdd={onAddMeal} onClose={() => setAddingSlot(null)} />}
            </Card>
          );
        })}
      </div>

      {/* Water */}
      <Card className="mt-3 rounded-[18px] px-[18px] py-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-ink">Water</span>
          <span className="font-display text-[17px] text-ink">
            {(waterMl / 1000).toFixed(1)} / {(p.hydrationTargetMl / 1000).toFixed(1)} L
          </span>
        </div>
        <div className="mt-3">
          <Bar pct={p.hydrationTargetMl > 0 ? (waterMl / p.hydrationTargetMl) * 100 : 0} fill="bg-sage-bright" track="bg-sage-track" h="h-2" />
        </div>
        <button
          onClick={() => onSetWater(waterMl + 250)}
          className="mt-3 rounded-full bg-sage-soft px-4 py-2 text-[13px] font-bold text-sage transition-colors hover:bg-sage-track"
        >
          +250 ml
        </button>
      </Card>
    </div>
  );
}
