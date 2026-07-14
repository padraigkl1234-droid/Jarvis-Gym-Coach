'use client';

import React, { useMemo, useState } from 'react';
import { Check, Trash2, Flag, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { type ExerciseType, type JarvisStore, type PlanDay, type SetEntry, todayStr } from '@/lib/store';

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ExerciseDraft {
  name: string;
  type: ExerciseType;
  sets: string;
  reps: string;
  durationMin: string;
  distanceKm: string;
}

/** Inline editor for one weekday's session — build, rewrite, or clear it. */
function DayEditor({
  weekday,
  initial,
  onSave,
  onClear,
  onClose,
}: {
  weekday: number;
  initial: PlanDay | undefined;
  onSave: (day: PlanDay) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [focus, setFocus] = useState(initial?.focus ?? '');
  const [rows, setRows] = useState<ExerciseDraft[]>(
    initial && initial.exercises.length > 0
      ? initial.exercises.map((e) => ({
          name: e.name,
          type: e.type ?? 'strength',
          sets: e.sets?.toString() ?? '',
          reps: e.reps ?? '',
          durationMin: e.durationMin?.toString() ?? '',
          distanceKm: e.distanceKm?.toString() ?? '',
        }))
      : [{ name: '', type: 'strength', sets: '3', reps: '8-10', durationMin: '', distanceKm: '' }]
  );

  const setRow = (i: number, patch: Partial<ExerciseDraft>) =>
    setRows((cur) => cur.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const valid = label.trim().length > 0 && rows.some((r) => r.name.trim().length > 0);

  const save = () => {
    if (!valid) return;
    onSave({
      weekday,
      label: label.trim(),
      focus: focus.trim(),
      exercises: rows
        .filter((r) => r.name.trim())
        .map((r) => {
          if (r.type === 'cardio') {
            const durationMin = parseFloat(r.durationMin);
            const distanceKm = parseFloat(r.distanceKm);
            return {
              name: r.name.trim(),
              type: 'cardio' as const,
              durationMin: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : undefined,
              distanceKm: Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : undefined,
            };
          }
          const sets = parseInt(r.sets, 10);
          return {
            name: r.name.trim(),
            type: 'strength' as const,
            sets: Number.isFinite(sets) && sets > 0 ? sets : undefined,
            reps: r.reps.trim() || undefined,
          };
        }),
    });
    onClose();
  };

  const fieldCls =
    'border-2 border-black bg-white px-2.5 py-2 text-sm font-medium text-black placeholder:text-neutral-400 focus:border-red-600 focus:outline-none';

  return (
    <div className="space-y-3 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Session name</div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "Push Day A"' className={`${fieldCls} w-full`} />
        </div>
        <div>
          <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Focus (optional)</div>
          <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder='e.g. "Hypertrophy"' className={`${fieldCls} w-full`} />
        </div>
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Exercises</div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="space-y-1.5 border-2 border-neutral-200 p-2">
              <div className="flex items-center gap-2">
                <input
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  placeholder="Exercise name"
                  className={`${fieldCls} w-full flex-1`}
                />
                <div className="flex shrink-0 border-2 border-black font-display text-[9px] uppercase tracking-[0.1em]">
                  <button
                    type="button"
                    onClick={() => setRow(i, { type: 'strength' })}
                    className={`px-2 py-2 transition-colors ${r.type === 'cardio' ? 'bg-white text-neutral-400 hover:text-black' : 'bg-black text-white'}`}
                  >
                    Strength
                  </button>
                  <button
                    type="button"
                    onClick={() => setRow(i, { type: 'cardio' })}
                    className={`border-l-2 border-black px-2 py-2 transition-colors ${r.type === 'cardio' ? 'bg-red-600 text-white' : 'bg-white text-neutral-400 hover:text-black'}`}
                  >
                    Cardio
                  </button>
                </div>
                <button
                  onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((_, k) => k !== i) : cur))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-neutral-300 transition-colors hover:text-red-600"
                  aria-label={`Remove exercise ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {r.type === 'cardio' ? (
                <div className="flex gap-2">
                  <input
                    value={r.durationMin}
                    onChange={(e) => setRow(i, { durationMin: e.target.value })}
                    inputMode="decimal"
                    placeholder="Minutes"
                    className={`${fieldCls} w-full text-center`}
                  />
                  <input
                    value={r.distanceKm}
                    onChange={(e) => setRow(i, { distanceKm: e.target.value })}
                    inputMode="decimal"
                    placeholder="Km"
                    className={`${fieldCls} w-full text-center`}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={r.sets} onChange={(e) => setRow(i, { sets: e.target.value })} inputMode="numeric" placeholder="Sets" className={`${fieldCls} w-full text-center`} />
                  <input value={r.reps} onChange={(e) => setRow(i, { reps: e.target.value })} placeholder="Reps, e.g. 8-10" className={`${fieldCls} w-full text-center`} />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setRows((cur) => [...cur, { name: '', type: 'strength', sets: '3', reps: '8-10', durationMin: '', distanceKm: '' }])}
          className="mt-2 flex w-full items-center justify-center gap-1.5 border-2 border-dashed border-neutral-300 py-2 font-display text-[10px] uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:border-red-600 hover:text-red-600"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add exercise
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t-2 border-black pt-3">
        <button
          onClick={save}
          disabled={!valid}
          className="bg-red-600 px-5 py-2.5 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          Save {DAYS_SHORT[weekday]}
        </button>
        <button
          onClick={onClose}
          className="border-2 border-black px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-100"
        >
          Cancel
        </button>
        {initial && (
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="ml-auto border-2 border-red-600 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.15em] text-red-600 transition-colors hover:bg-red-600 hover:text-white"
          >
            Make Rest Day
          </button>
        )}
      </div>
    </div>
  );
}

export function PlanPage({
  store,
  onLogSet,
  onUnlogSet,
  onLogCardio,
  onDeleteSet,
  onCompleteWorkout,
  onEditProfile,
  onSavePlanDay,
  onRemovePlanDay,
}: {
  store: JarvisStore;
  onLogSet: (exercise: string, weightKg?: number) => void;
  onUnlogSet: (exercise: string) => void;
  onLogCardio: (exercise: string, durationMin?: number, distanceKm?: number) => void;
  onDeleteSet: (set: SetEntry) => void;
  onCompleteWorkout: () => void;
  onEditProfile: () => void;
  onSavePlanDay: (day: PlanDay) => void;
  onRemovePlanDay: (weekday: number) => void;
}) {
  const todayWd = new Date().getDay();
  const [selectedWd, setSelectedWd] = useState(todayWd);
  const [editing, setEditing] = useState(false);
  const [cardioDraft, setCardioDraft] = useState<Record<string, { min: string; km: string }>>({});
  const [weightDraft, setWeightDraft] = useState<Record<string, string>>({});
  const today = todayStr();

  const dayPlan = store.plan.find((p) => p.weekday === selectedWd);
  const isToday = selectedWd === todayWd;
  const todaySets = useMemo(() => store.sets.filter((s) => s.date === today), [store, today]);
  const sessionOpen = store.sessions.some((s) => s.date === today && s.status === 'in_progress');
  const sessionDone = store.sessions.some((s) => s.date === today && s.status === 'completed');

  const loggedCount = (exercise: string) =>
    todaySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase()).length;
  const cardioLogsFor = (exercise: string) =>
    todaySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && (s.durationMin != null || s.distanceKm != null));
  // Prefills the weight box with whatever was last lifted for this exercise (today, or any past session).
  const lastWeightFor = (exercise: string) => {
    const matches = store.sets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && s.weightKg != null);
    return matches.length ? String(matches[matches.length - 1].weightKg) : '';
  };

  const p = store.profile;

  return (
    <div className="space-y-6">
      {/* 1 · Weekly cycle strip */}
      <section className="border-2 border-black bg-white">
        <div className="grid grid-cols-7 divide-x-2 divide-black">
          {DAYS_SHORT.map((d, wd) => {
            const plan = store.plan.find((x) => x.weekday === wd);
            const training = !!plan && plan.exercises.length > 0;
            const selected = wd === selectedWd;
            const isTodayCell = wd === todayWd;
            return (
              <button
                key={wd}
                onClick={() => {
                  setSelectedWd(wd);
                  setEditing(false);
                }}
                aria-current={selected ? 'true' : undefined}
                className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 px-1 py-2.5 transition-colors ${
                  selected ? 'bg-black text-white' : 'bg-white hover:bg-neutral-50'
                }`}
              >
                {isTodayCell && (
                  <span className={`absolute left-1 top-1 font-display text-[7px] uppercase tracking-widest ${selected ? 'text-red-500' : 'text-red-600'}`}>
                    Today
                  </span>
                )}
                <span className={`font-display text-[11px] tracking-[0.15em] ${selected ? 'text-white' : training ? 'text-black' : 'text-neutral-400'}`}>
                  {d}
                </span>
                {training ? (
                  <span className={`h-2.5 w-2.5 ${selected ? 'bg-red-500' : 'bg-red-600'}`} />
                ) : (
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${selected ? 'text-neutral-400' : 'text-neutral-300'}`}>Rest</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 · Active workout interface */}
      <section className="border-2 border-black bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black px-4 py-3">
          <div>
            <h2 className="font-display text-lg uppercase leading-tight tracking-[0.06em] text-black">
              {dayPlan && dayPlan.exercises.length > 0
                ? `${dayPlan.label}${dayPlan.focus ? ` — ${dayPlan.focus}` : ''}`
                : `${DAYS_LONG[selectedWd]} — Rest & Recover`}
            </h2>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              {isToday ? "Today's session" : `${DAYS_LONG[selectedWd]} session`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 font-display text-[11px] uppercase tracking-[0.15em] text-black transition-colors hover:border-red-600 hover:text-red-600"
              >
                <Pencil className="h-3.5 w-3.5" /> {dayPlan ? 'Edit Day' : 'Build Day'}
              </button>
            )}
            {isToday && !editing && dayPlan && dayPlan.exercises.length > 0 && (
              sessionDone ? (
                <span className="flex items-center gap-1.5 bg-black px-3 py-2 font-display text-[10px] uppercase tracking-[0.2em] text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 text-red-500" /> Complete
                </span>
              ) : (
                <button
                  onClick={onCompleteWorkout}
                  disabled={!sessionOpen && todaySets.length === 0}
                  className="flex items-center gap-1.5 bg-red-600 px-4 py-2 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <Flag className="h-3.5 w-3.5" /> Finish Session
                </button>
              )
            )}
          </div>
        </div>

        {editing ? (
          <DayEditor
            weekday={selectedWd}
            initial={dayPlan}
            onSave={onSavePlanDay}
            onClear={() => onRemovePlanDay(selectedWd)}
            onClose={() => setEditing(false)}
          />
        ) : dayPlan && dayPlan.exercises.length > 0 ? (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 sm:grid-cols-[1fr_90px_auto]">
              <span className="font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Exercise</span>
              <span className="hidden text-right font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500 sm:block">Target</span>
              <span className="text-right font-display text-[9px] uppercase tracking-[0.2em] text-neutral-500">Logged</span>
            </div>
            <ul className="divide-y divide-neutral-200">
              {dayPlan.exercises.map((ex, i) => {
                if (ex.type === 'cardio') {
                  const target = [ex.durationMin ? `${ex.durationMin} min` : null, ex.distanceKm ? `${ex.distanceKm} km` : null]
                    .filter(Boolean)
                    .join(' · ');
                  const logs = isToday ? cardioLogsFor(ex.name) : [];
                  const draft = cardioDraft[ex.name] ?? { min: '', km: '' };
                  return (
                    <li key={i} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold uppercase tracking-wide text-black">{ex.name}</div>
                        {ex.notes && <div className="text-[11px] font-medium text-neutral-500">{ex.notes}</div>}
                        <div className="mt-0.5 font-display text-[11px] tabular-nums text-neutral-500">
                          Target: {target || '—'}
                          {logs.length > 0 && (
                            <span className="ml-2 text-red-600">
                              · Logged: {logs.map((s) => [s.durationMin ? `${s.durationMin}min` : null, s.distanceKm ? `${s.distanceKm}km` : null].filter(Boolean).join('/')).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      {isToday ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <input
                            value={draft.min}
                            onChange={(e) => setCardioDraft((cur) => ({ ...cur, [ex.name]: { ...draft, min: e.target.value } }))}
                            inputMode="decimal"
                            placeholder="Min"
                            className="w-14 border-2 border-black px-1.5 py-2 text-center text-sm font-medium text-black focus:border-red-600 focus:outline-none"
                          />
                          <input
                            value={draft.km}
                            onChange={(e) => setCardioDraft((cur) => ({ ...cur, [ex.name]: { ...draft, km: e.target.value } }))}
                            inputMode="decimal"
                            placeholder="Km"
                            className="w-14 border-2 border-black px-1.5 py-2 text-center text-sm font-medium text-black focus:border-red-600 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const min = parseFloat(draft.min);
                              const km = parseFloat(draft.km);
                              onLogCardio(ex.name, Number.isFinite(min) && min > 0 ? min : undefined, Number.isFinite(km) && km > 0 ? km : undefined);
                              setCardioDraft((cur) => ({ ...cur, [ex.name]: { min: '', km: '' } }));
                            }}
                            disabled={!draft.min.trim() && !draft.km.trim()}
                            className="flex h-9 items-center gap-1 bg-red-600 px-3 font-display text-[10px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> Log
                          </button>
                        </div>
                      ) : (
                        <span className="font-display text-[10px] uppercase tracking-[0.15em] text-neutral-300">Opens on the day</span>
                      )}
                    </li>
                  );
                }
                const targetSets = ex.sets ?? 3;
                const logged = isToday ? loggedCount(ex.name) : 0;
                const complete = logged >= targetSets;
                const todayExSets = isToday ? todaySets.filter((s) => s.exercise.toLowerCase() === ex.name.toLowerCase()) : [];
                const weightVal = weightDraft[ex.name] ?? lastWeightFor(ex.name);
                const weightNum = parseFloat(weightVal);
                const nextWeightKg = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : undefined;
                return (
                  <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_90px_auto]">
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-bold uppercase tracking-wide ${complete ? 'text-neutral-400 line-through' : 'text-black'}`}>
                        {ex.name}
                      </div>
                      {ex.notes && <div className="text-[11px] font-medium text-neutral-500">{ex.notes}</div>}
                      <div className="mt-0.5 font-display text-[11px] tabular-nums text-neutral-500 sm:hidden">
                        {targetSets}×{ex.reps ?? '—'}
                      </div>
                      {todayExSets.length > 0 && (
                        <div className="mt-0.5 font-display text-[11px] tabular-nums text-red-600">
                          Logged: {todayExSets.map((s) => (s.weightKg != null ? `${s.weightKg}kg` : '—')).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="hidden text-right font-display text-sm tabular-nums text-neutral-600 sm:block">
                      {targetSets}×{ex.reps ?? '—'}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      {isToday && logged < targetSets && (
                        <input
                          value={weightVal}
                          onChange={(e) => setWeightDraft((cur) => ({ ...cur, [ex.name]: e.target.value }))}
                          inputMode="decimal"
                          placeholder="Kg"
                          aria-label={`${ex.name} weight in kg`}
                          className="mr-1 w-14 border-2 border-black px-1.5 py-2 text-center text-sm font-medium text-black focus:border-red-600 focus:outline-none"
                        />
                      )}
                      {Array.from({ length: targetSets }, (_, k) => {
                        const filled = k < logged;
                        return (
                          <button
                            key={k}
                            title={filled && todayExSets[k]?.weightKg != null ? `${todayExSets[k].weightKg}kg` : undefined}
                            onClick={() =>
                              isToday
                                ? filled && k === logged - 1
                                  ? onUnlogSet(ex.name)
                                  : !filled && k === logged
                                  ? onLogSet(ex.name, nextWeightKg)
                                  : undefined
                                : undefined
                            }
                            disabled={!isToday || (filled ? k !== logged - 1 : k !== logged)}
                            aria-label={`${ex.name} set ${k + 1}${filled ? ' logged' : ''}`}
                            className={`flex h-10 w-10 items-center justify-center border-2 transition-colors ${
                              filled
                                ? 'border-red-600 bg-red-600 text-white'
                                : isToday && k === logged
                                ? 'border-black bg-white text-transparent hover:border-red-600'
                                : 'border-neutral-200 bg-white text-transparent'
                            } ${!isToday ? 'opacity-40' : ''}`}
                          >
                            <Check className="h-5 w-5" strokeWidth={3.5} />
                          </button>
                        );
                      })}
                      {logged > targetSets && (
                        <span className="font-display text-[10px] tabular-nums text-red-600">+{logged - targetSets}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {!isToday && (
              <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Set logging opens on the day
              </div>
            )}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm font-medium text-neutral-500">
            {store.plan.length === 0
              ? 'No plan yet — ask VALORIS to build your weekly split.'
              : 'No session scheduled. Recovery is part of the program.'}
          </p>
        )}
      </section>

      {/* Sets logged today (with weights from voice logging) */}
      {isToday && todaySets.length > 0 && (
        <section className="border-2 border-black bg-white">
          <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Set Log</h2>
            <span className="font-display text-xs tabular-nums text-red-600">{todaySets.length}</span>
          </div>
          <ul className="divide-y divide-neutral-200">
            {todaySets.map((s, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-display text-[11px] tabular-nums text-neutral-400">{s.time}</span>
                <span className="flex-1 truncate text-sm font-bold text-black">{s.exercise}</span>
                <span className="font-display text-xs tabular-nums text-neutral-600">
                  {s.durationMin != null || s.distanceKm != null
                    ? [s.durationMin != null ? `${s.durationMin} min` : null, s.distanceKm != null ? `${s.distanceKm} km` : null].filter(Boolean).join(' · ')
                    : s.reps != null || s.weightKg != null
                    ? `${s.reps ?? '–'}×${s.weightKg ?? '–'}kg${s.rpe ? ` @${s.rpe}` : ''}`
                    : `set ${s.setNumber}`}
                </span>
                <button onClick={() => onDeleteSet(s)} className="p-1 text-neutral-300 transition-colors hover:text-red-600" aria-label={`Delete ${s.exercise} set`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3 · Training parameters */}
      <div>
        <section className="border-2 border-black bg-white">
          <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Training Parameters</h2>
            <button onClick={onEditProfile} className="font-display text-[10px] uppercase tracking-[0.15em] text-red-600 hover:text-red-700">
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-neutral-200 border-b border-neutral-200">
            <div className="p-4">
              <div className="font-display text-[9px] uppercase tracking-[0.2em] text-neutral-400">Primary Goal</div>
              <div className="mt-1 text-sm font-bold uppercase text-black">{p.goal || '—'}</div>
            </div>
            <div className="p-4">
              <div className="font-display text-[9px] uppercase tracking-[0.2em] text-neutral-400">Experience</div>
              <div className="mt-1 text-sm font-bold uppercase text-black">{p.experience || '—'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-neutral-200 border-b border-neutral-200">
            <div className="p-4">
              <div className="font-display text-[9px] uppercase tracking-[0.2em] text-neutral-400">Schedule</div>
              <div className="mt-1 text-sm font-bold uppercase text-black">{p.daysPerWeek ? `${p.daysPerWeek} days / week` : '—'}</div>
            </div>
            <div className="p-4">
              <div className="font-display text-[9px] uppercase tracking-[0.2em] text-neutral-400">Bodyweight</div>
              <div className="mt-1 text-sm font-bold uppercase text-black">{p.bodyweightKg ? `${p.bodyweightKg}kg` : '—'}</div>
            </div>
          </div>
          <div className="p-4">
            <div className="font-display text-[9px] uppercase tracking-[0.2em] text-neutral-400">Equipment Available</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(p.equipment && p.equipment.length ? p.equipment : ['Not set']).map((e) => (
                <span key={e} className="border-2 border-black px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-black">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
