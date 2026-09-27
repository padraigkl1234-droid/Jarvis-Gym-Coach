'use client';

import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { type JarvisStore, type MealEntry, type MealSlot, todayStr } from '@/lib/store';
import { Bar, Card, CtaButton, Eyebrow, Field, Sheet, fieldCls } from '@/components/ui';
import { FoodHistory } from '@/components/FoodHistory';

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

function slotForHour(hour: number): MealSlot {
  if (hour < 5) return 'snack';
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

/** Meals logged without a slot get filed by time of day. */
function slotOf(m: MealEntry): MealSlot {
  if (m.slot) return m.slot;
  return slotForHour(parseInt(m.time.slice(0, 2), 10) || 0);
}

function MacroRow({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-faint">
          {Math.round(value)} / {target} g
        </span>
      </div>
      <div className="mt-1.5">
        <Bar pct={target > 0 ? (value / target) * 100 : 0} h="h-1" />
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
  onAdd: (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; slot: MealSlot }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fibre, setFibre] = useState('');
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
        onAdd({ name: name.trim(), calories: num(kcal), proteinG: num(protein), carbsG: num(carbs), fatG: num(fat), fibreG: num(fibre), slot });
        onClose();
      }}
      className="mt-3 space-y-2 border-t border-line pt-3"
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="What did you eat?" className={fieldCls} />
      <div className="grid grid-cols-5 gap-1.5">
        {(
          [
            ['kcal', kcal, setKcal],
            ['P', protein, setProtein],
            ['C', carbs, setCarbs],
            ['F', fat, setFat],
            ['Fib', fibre, setFibre],
          ] as const
        ).map(([ph, val, set]) => (
          <input
            key={ph}
            value={val}
            onChange={(e) => set(e.target.value)}
            inputMode="numeric"
            placeholder={ph}
            className={`${fieldCls} !px-1.5 text-center`}
          />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!valid}
          className="flex-1 rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white disabled:bg-track disabled:text-faint"
        >
          Add
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2.5 text-[13px] font-semibold text-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditMealSheet({
  meal,
  onSave,
  onDelete,
  onClose,
}: {
  meal: MealEntry;
  onSave: (patch: Partial<MealEntry>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(meal.name);
  const [kcal, setKcal] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.proteinG));
  const [carbs, setCarbs] = useState(String(meal.carbsG));
  const [fat, setFat] = useState(String(meal.fatG));
  const [fibre, setFibre] = useState(String(meal.fibreG));
  const num = (s: string, fallback: number) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const valid = name.trim().length > 0;

  return (
    <Sheet onClose={onClose} label={`Edit ${meal.name}`}>
      <h2 className="font-display text-[22px] text-ink">Edit entry</h2>
      <div className="mt-5 space-y-4">
        <Field label="Name">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Calories">
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Protein g">
            <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Fibre g">
            <input value={fibre} onChange={(e) => setFibre(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Carbs g">
            <input value={carbs} onChange={(e) => setCarbs(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Fat g">
            <input value={fat} onChange={(e) => setFat(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
        </div>
      </div>
      <CtaButton
        className="mt-6"
        disabled={!valid}
        onClick={() => {
          onSave({
            name: name.trim(),
            calories: num(kcal, meal.calories),
            proteinG: num(protein, meal.proteinG),
            carbsG: num(carbs, meal.carbsG),
            fatG: num(fat, meal.fatG),
            fibreG: num(fibre, meal.fibreG),
          });
          onClose();
        }}
      >
        Save changes
      </CtaButton>
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="mt-3 w-full py-1 text-center text-[13px] font-semibold text-faint underline"
      >
        Delete entry
      </button>
    </Sheet>
  );
}

export function FoodTab({
  store,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
}: {
  store: JarvisStore;
  onAddMeal: (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; slot: MealSlot }) => void;
  onEditMeal: (meal: MealEntry, patch: Partial<MealEntry>) => void;
  onDeleteMeal: (meal: MealEntry) => void;
}) {
  const [addingSlot, setAddingSlot] = useState<MealSlot | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const today = todayStr();
  const p = store.profile;

  const meals = useMemo(() => store.meals.filter((m) => m.date === today), [store, today]);
  const kcal = meals.reduce((a, m) => a + m.calories, 0);
  const protein = meals.reduce((a, m) => a + m.proteinG, 0);
  const carbs = meals.reduce((a, m) => a + m.carbsG, 0);
  const fat = meals.reduce((a, m) => a + m.fatG, 0);
  const fibre = meals.reduce((a, m) => a + m.fibreG, 0);
  const remaining = Math.max(0, p.calorieTarget - kcal);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>Nutrition</Eyebrow>
          <h1 className="mt-1 font-display text-[30px] text-ink">Food</h1>
        </div>
        {store.meals.length > 0 && (
          <button onClick={() => setHistoryOpen(true)} className="mt-2 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-semibold text-muted">
            History
          </button>
        )}
      </div>

      {/* Today's totals */}
      <div className="mt-5 border-b border-line pb-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[40px] font-semibold leading-none tabular-nums text-ink">{remaining.toLocaleString()}</div>
            <div className="eyebrow mt-2">Calories left</div>
          </div>
          <div className="pb-1 text-right text-[12px] leading-snug text-faint">
            {Math.round(kcal).toLocaleString()} eaten
            <br />
            of {p.calorieTarget.toLocaleString()}
          </div>
        </div>
        <div className="mt-4">
          <Bar pct={p.calorieTarget > 0 ? (kcal / p.calorieTarget) * 100 : 0} h="h-1.5" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5">
          <MacroRow label="Protein" value={protein} target={p.proteinTargetG} />
          <MacroRow label="Fibre" value={fibre} target={p.fibreTargetG} />
          <MacroRow label="Carbs" value={carbs} target={p.carbsTargetG} />
          <MacroRow label="Fat" value={fat} target={p.fatTargetG} />
        </div>
      </div>

      {/* Meals */}
      <div className="mt-2">
        {SLOTS.map(({ id, label }) => {
          const slotMeals = meals.filter((m) => slotOf(m) === id);
          const slotKcal = slotMeals.reduce((a, m) => a + m.calories, 0);
          return (
            <div key={id} className="border-b border-line py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[15px] font-semibold text-ink">{label}</span>
                  {slotKcal > 0 && <span className="text-[13px] tabular-nums text-faint">{Math.round(slotKcal)} kcal</span>}
                </div>
                <button
                  onClick={() => setAddingSlot(addingSlot === id ? null : id)}
                  aria-label={`Add to ${label}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {slotMeals.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {slotMeals.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <button onClick={() => setEditingMeal(m)} className="min-w-0 flex-1 truncate text-left text-[14px] text-muted">
                        {m.name}
                      </button>
                      <span className="shrink-0 text-[13px] tabular-nums text-faint">{Math.round(m.calories)}</span>
                      <button onClick={() => onDeleteMeal(m)} aria-label={`Remove ${m.name}`} className="shrink-0 text-faint">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                addingSlot !== id && <div className="mt-1.5 text-[13px] text-faint">Nothing logged</div>
              )}
              {addingSlot === id && <AddMealForm slot={id} onAdd={onAddMeal} onClose={() => setAddingSlot(null)} />}
            </div>
          );
        })}
      </div>

      {editingMeal && (
        <EditMealSheet
          meal={editingMeal}
          onSave={(patch) => onEditMeal(editingMeal, patch)}
          onDelete={() => onDeleteMeal(editingMeal)}
          onClose={() => setEditingMeal(null)}
        />
      )}

      {historyOpen && <FoodHistory store={store} onDeleteMeal={onDeleteMeal} onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}
