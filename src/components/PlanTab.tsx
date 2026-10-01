'use client';

import React, { useMemo, useState } from 'react';
import { Trash2, Plus, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { type ExerciseType, type ExtraDay, type JarvisStore, type PlanDay, type PlannedExercise, todayStr } from '@/lib/store';
import { type LibraryExercise } from '@/lib/exercises';
import { buildSessions } from '@/lib/stats';
import { Card, CtaButton, Eyebrow, fieldCls } from '@/components/ui';
import { ExercisePicker } from '@/components/ExercisePicker';
import { SessionLog } from '@/components/SessionLog';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Draft {
  name: string;
  type: ExerciseType;
  sets: string;
  reps: string;
  durationMin: string;
  distanceKm: string;
  notes: string;
}

const emptyRow = (): Draft => ({ name: '', type: 'strength', sets: '3', reps: '8-10', durationMin: '', distanceKm: '', notes: '' });

const toRows = (exercises: PlannedExercise[]): Draft[] =>
  exercises.map((e) => ({
    name: e.name,
    type: e.type ?? 'strength',
    sets: e.sets?.toString() ?? '',
    reps: e.reps ?? '',
    durationMin: e.durationMin?.toString() ?? '',
    distanceKm: e.distanceKm?.toString() ?? '',
    notes: e.notes ?? '',
  }));

const toExercises = (rows: Draft[]): PlannedExercise[] =>
  rows
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
          notes: r.notes.trim() || undefined,
        };
      }
      const sets = parseInt(r.sets, 10);
      return {
        name: r.name.trim(),
        type: 'strength' as const,
        sets: Number.isFinite(sets) && sets > 0 ? sets : undefined,
        reps: r.reps.trim() || undefined,
        notes: r.notes.trim() || undefined,
      };
    });

/** The repeated exercise-row editor, shared by the weekly plan and one-offs. */
function ExerciseRows({
  rows,
  setRows,
  equipment,
}: {
  rows: Draft[];
  setRows: React.Dispatch<React.SetStateAction<Draft[]>>;
  equipment: string[] | undefined;
}) {
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const setRow = (i: number, patch: Partial<Draft>) => setRows((cur) => cur.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2">
              <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Exercise" className={`${fieldCls} flex-1`} />
              <button onClick={() => setPickerRow(i)} aria-label={`Browse exercises for row ${i + 1}`} className="p-2 text-faint">
                <Search className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((_, k) => k !== i) : cur))}
                aria-label={`Remove exercise ${i + 1}`}
                className="p-2 text-faint"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex overflow-hidden rounded-full border border-line text-[12px] font-semibold">
                <button type="button" onClick={() => setRow(i, { type: 'strength' })} className={`px-3 py-1.5 ${r.type === 'cardio' ? 'text-faint' : 'bg-ink text-white'}`}>
                  Strength
                </button>
                <button type="button" onClick={() => setRow(i, { type: 'cardio' })} className={`px-3 py-1.5 ${r.type === 'cardio' ? 'bg-ink text-white' : 'text-faint'}`}>
                  Cardio
                </button>
              </div>
              {r.type === 'cardio' ? (
                <>
                  <input value={r.durationMin} onChange={(e) => setRow(i, { durationMin: e.target.value })} inputMode="decimal" placeholder="min" className={`${fieldCls} !w-20 text-center`} />
                  <input value={r.distanceKm} onChange={(e) => setRow(i, { distanceKm: e.target.value })} inputMode="decimal" placeholder="km" className={`${fieldCls} !w-20 text-center`} />
                </>
              ) : (
                <>
                  <input value={r.sets} onChange={(e) => setRow(i, { sets: e.target.value })} inputMode="numeric" placeholder="sets" className={`${fieldCls} !w-16 text-center`} />
                  <input value={r.reps} onChange={(e) => setRow(i, { reps: e.target.value })} placeholder="reps" className={`${fieldCls} !w-20 text-center`} />
                </>
              )}
            </div>
            <input value={r.notes} onChange={(e) => setRow(i, { notes: e.target.value })} placeholder="Note (optional)" className={`${fieldCls} mt-2 !text-[13px]`} />
          </Card>
        ))}
      </div>
      <button
        onClick={() => setRows((cur) => [...cur, emptyRow()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-[13px] font-semibold text-faint"
      >
        <Plus className="h-4 w-4" /> Add exercise
      </button>
      {pickerRow !== null && (
        <ExercisePicker
          equipment={equipment}
          onClose={() => setPickerRow(null)}
          onPick={(ex: LibraryExercise) =>
            setRow(pickerRow, {
              name: ex.name,
              type: ex.type,
              sets: ex.sets?.toString() ?? '3',
              reps: ex.reps ?? '',
              durationMin: ex.durationMin?.toString() ?? '',
              distanceKm: ex.distanceKm?.toString() ?? '',
            })
          }
        />
      )}
    </>
  );
}


/**
 * The tickable exercise list, used for both the recurring plan and one-off
 * workouts. Keeps its own expanded row and weight/reps drafts, so the two
 * blocks on a day behave independently.
 */
function ExerciseList({
  exercises,
  store,
  selectedDate,
  canLog,
  onLogSet,
  onUnlogSet,
  onLogCardio,
}: {
  exercises: PlannedExercise[];
  store: JarvisStore;
  selectedDate: string;
  canLog: boolean;
  onLogSet: (exercise: string, weightKg: number | undefined, reps: number | undefined, date: string) => void;
  onUnlogSet: (exercise: string, date: string) => void;
  onLogCardio: (exercise: string, durationMin: number | undefined, distanceKm: number | undefined, date: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState<Record<string, string>>({});
  const [repsDraft, setRepsDraft] = useState<Record<string, string>>({});
  const [cardioDraft, setCardioDraft] = useState<Record<string, { min: string; km: string }>>({});

  const daySets = useMemo(() => store.sets.filter((s) => s.date === selectedDate), [store, selectedDate]);
  const loggedCount = (exercise: string) => daySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase()).length;
  const cardioLogsFor = (exercise: string) =>
    daySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && (s.durationMin != null || s.distanceKm != null));
  const lastWeightFor = (exercise: string) => {
    const m = store.sets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && s.weightKg != null);
    return m.length ? m[m.length - 1].weightKg! : null;
  };
  const lastRepsFor = (exercise: string) => {
    const m = store.sets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && s.reps != null);
    return m.length ? m[m.length - 1].reps! : null;
  };

  return (
    <ul className="mt-1">
      {exercises.map((ex, i) => {
        const isCardio = ex.type === 'cardio';
        const isOpen = expanded === ex.name;

          if (isCardio) {
            const target = [ex.durationMin ? `${ex.durationMin} min` : null, ex.distanceKm ? `${ex.distanceKm} km` : null].filter(Boolean).join(' · ');
            const logs = canLog ? cardioLogsFor(ex.name) : [];
            const draft = cardioDraft[ex.name] ?? { min: '', km: '' };
            const done = logs.length > 0;
            return (
              <li key={i} className={`py-4 ${i > 0 ? 'border-t border-line' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-[15px] font-medium ${done ? 'text-faint line-through' : 'text-ink'}`}>{ex.name}</div>
                    <div className="mt-0.5 text-[12px] text-faint">
                      {target || 'Cardio'}
                      {done &&
                        ` · ${logs
                          .map((s) => [s.durationMin ? `${s.durationMin} min` : null, s.distanceKm ? `${s.distanceKm} km` : null].filter(Boolean).join(' / '))
                          .join(', ')}`}
                    </div>
                    {ex.notes && <div className="mt-1 text-[12px] leading-snug text-faint">{ex.notes}</div>}
                  </div>
                  {canLog && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : ex.name)}
                      className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-semibold text-ink"
                    >
                      {isOpen ? 'Close' : 'Log'}
                    </button>
                  )}
                </div>
                {isOpen && canLog && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={draft.min}
                      onChange={(e) => setCardioDraft((c) => ({ ...c, [ex.name]: { ...draft, min: e.target.value } }))}
                      inputMode="decimal"
                      placeholder="min"
                      className={`${fieldCls} !w-24 text-center`}
                    />
                    <input
                      value={draft.km}
                      onChange={(e) => setCardioDraft((c) => ({ ...c, [ex.name]: { ...draft, km: e.target.value } }))}
                      inputMode="decimal"
                      placeholder="km"
                      className={`${fieldCls} !w-24 text-center`}
                    />
                    <button
                      onClick={() => {
                        const min = parseFloat(draft.min);
                        const km = parseFloat(draft.km);
                        onLogCardio(ex.name, Number.isFinite(min) && min > 0 ? min : undefined, Number.isFinite(km) && km > 0 ? km : undefined, selectedDate);
                        setCardioDraft((c) => ({ ...c, [ex.name]: { min: '', km: '' } }));
                        setExpanded(null);
                      }}
                      disabled={!draft.min.trim() && !draft.km.trim()}
                      className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white disabled:bg-track disabled:text-faint"
                    >
                      Save
                    </button>
                  </div>
                )}
              </li>
            );
          }

          const targetSets = ex.sets ?? 3;
          const logged = canLog ? loggedCount(ex.name) : 0;
          const complete = logged >= targetSets;
          const last = lastWeightFor(ex.name);
          const lastReps = lastRepsFor(ex.name);
          const weightVal = weightDraft[ex.name] ?? (last != null ? String(last) : '');
          const weightNum = parseFloat(weightVal);
          const nextWeight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : undefined;
          const repsVal = repsDraft[ex.name] ?? (lastReps != null ? String(lastReps) : '');
          const repsNum = parseInt(repsVal, 10);
          const nextReps = Number.isFinite(repsNum) && repsNum > 0 ? repsNum : undefined;

          return (
            <li key={i} className={`py-4 ${i > 0 ? 'border-t border-line' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => canLog && setExpanded(isOpen ? null : ex.name)} className="min-w-0 flex-1 text-left">
                  <div className={`text-[15px] font-medium ${complete ? 'text-faint line-through' : 'text-ink'}`}>{ex.name}</div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    {targetSets} × {ex.reps ?? '—'}
                    {last != null && ` · last ${last}kg${lastReps != null ? ` × ${lastReps}` : ''}`}
                  </div>
                  {ex.notes && <div className="mt-1 text-[12px] leading-snug text-faint">{ex.notes}</div>}
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  {Array.from({ length: targetSets }, (_, k) => {
                    const filled = k < logged;
                    const actionable = canLog && (filled ? k === logged - 1 : k === logged);
                    return (
                      <button
                        key={k}
                        onClick={() =>
                          canLog
                            ? filled && k === logged - 1
                              ? onUnlogSet(ex.name, selectedDate)
                              : !filled && k === logged
                              ? onLogSet(ex.name, nextWeight, nextReps, selectedDate)
                              : undefined
                            : undefined
                        }
                        disabled={!actionable}
                        aria-label={`${ex.name} set ${k + 1}${filled ? ' logged' : ''}`}
                        className="flex h-7 w-7 items-center justify-center"
                      >
                        <span className={`h-[11px] w-[11px] rounded-full border ${filled ? 'border-ink bg-ink' : 'border-line'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              {isOpen && canLog && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span className="text-[12px] text-faint">Weight</span>
                  <input
                    value={weightVal}
                    onChange={(e) => setWeightDraft((c) => ({ ...c, [ex.name]: e.target.value }))}
                    inputMode="decimal"
                    placeholder="kg"
                    className={`${fieldCls} !w-20 text-center`}
                  />
                  <span className="text-[12px] text-faint">Reps</span>
                  <input
                    value={repsVal}
                    onChange={(e) => setRepsDraft((c) => ({ ...c, [ex.name]: e.target.value }))}
                    inputMode="numeric"
                    placeholder="reps"
                    className={`${fieldCls} !w-20 text-center`}
                  />
                  <span className="text-[12px] text-faint">applies to the next set you tick</span>
                </div>
              )}
            </li>
          );
      })}
    </ul>
  );
}

/** Inline editor for one weekday of the recurring plan. */
function DayEditor({
  weekday,
  initial,
  equipment,
  onSave,
  onClear,
  onClose,
}: {
  weekday: number;
  initial: PlanDay | undefined;
  equipment: string[] | undefined;
  onSave: (day: PlanDay) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [rows, setRows] = useState<Draft[]>(initial && initial.exercises.length > 0 ? toRows(initial.exercises) : [emptyRow()]);
  const valid = label.trim().length > 0 && rows.some((r) => r.name.trim().length > 0);

  return (
    <div className="mt-4 space-y-4">
      <p className="text-[12px] leading-snug text-faint">Repeats every {DAY_NAMES[weekday]}, every week.</p>
      <div>
        <div className="eyebrow mb-1.5 !text-[10px]">Session name</div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "Upper A"' className={fieldCls} />
      </div>
      <ExerciseRows rows={rows} setRows={setRows} equipment={equipment} />
      <div className="flex items-center gap-3">
        <CtaButton
          onClick={() => {
            if (!valid) return;
            onSave({ weekday, label: label.trim(), focus: initial?.focus ?? '', exercises: toExercises(rows) });
            onClose();
          }}
          disabled={!valid}
        >
          Save {DAY_LABELS[weekday]}
        </CtaButton>
        <button onClick={onClose} className="shrink-0 rounded-full border border-line px-5 py-3.5 text-[14px] font-semibold text-muted">
          Cancel
        </button>
      </div>
      {initial && (
        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="w-full py-1 text-center text-[13px] font-semibold text-faint underline"
        >
          Make this a rest day
        </button>
      )}
    </div>
  );
}

/** Inline editor for a one-off workout on a single date. No session name. */
function ExtraEditor({
  dateLabel,
  initial,
  equipment,
  onSave,
  onClose,
}: {
  dateLabel: string;
  initial: ExtraDay | undefined;
  equipment: string[] | undefined;
  onSave: (exercises: PlannedExercise[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Draft[]>(initial && initial.exercises.length > 0 ? toRows(initial.exercises) : [emptyRow()]);
  const valid = rows.some((r) => r.name.trim().length > 0);

  return (
    <div className="mt-4 space-y-4">
      <p className="text-[12px] leading-snug text-faint">{dateLabel} only. This one will not repeat next week.</p>
      <ExerciseRows rows={rows} setRows={setRows} equipment={equipment} />
      <div className="flex items-center gap-3">
        <CtaButton
          onClick={() => {
            if (!valid) return;
            onSave(toExercises(rows));
            onClose();
          }}
          disabled={!valid}
        >
          Save
        </CtaButton>
        <button onClick={onClose} className="shrink-0 rounded-full border border-line px-5 py-3.5 text-[14px] font-semibold text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function PlanTab({
  store,
  onLogSet,
  onUnlogSet,
  onLogCardio,
  onStartSession,
  onCompleteWorkout,
  onSavePlanDay,
  onRemovePlanDay,
  onSuggestPlan,
  onSaveExtra,
  onRemoveExtra,
  onPromoteExtra,
}: {
  store: JarvisStore;
  onLogSet: (exercise: string, weightKg: number | undefined, reps: number | undefined, date: string) => void;
  onUnlogSet: (exercise: string, date: string) => void;
  onLogCardio: (exercise: string, durationMin: number | undefined, distanceKm: number | undefined, date: string) => void;
  onStartSession: () => void;
  onCompleteWorkout: () => void;
  onSavePlanDay: (day: PlanDay) => void;
  onRemovePlanDay: (weekday: number) => void;
  onSuggestPlan: () => void;
  onSaveExtra: (date: string, exercises: PlannedExercise[]) => void;
  onRemoveExtra: (date: string) => void;
  onPromoteExtra: (date: string, weekday: number) => void;
}) {
  const todayWd = new Date().getDay();
  const [selectedWd, setSelectedWd] = useState(todayWd);
  const [editing, setEditing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(false);
  const today = todayStr();

  // Current week's dates, Sunday-first.
  const weekDates = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const sessions = useMemo(() => buildSessions(store).filter((s) => s.status === 'completed'), [store]);
  const dayPlan = store.plan.find((p) => p.weekday === selectedWd);
  const isToday = selectedWd === todayWd;
  // The actual calendar date of the selected column, so one-offs and logging
  // can attach to a real day rather than a repeating weekday.
  const selectedDate = useMemo(() => {
    const d = weekDates[selectedWd];
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [weekDates, selectedWd]);
  const extra = store.extras.find((e) => e.date === selectedDate);
  // You can log on today or backfill a past day, but not the future.
  const canLog = selectedDate <= today;
  const sessionOpen = store.sessions.some((s) => s.date === today && s.status === 'in_progress');
  const sessionDone = store.sessions.some((s) => s.date === today && s.status === 'completed');

  const moveExercise = (i: number, dir: -1 | 1) => {
    if (!dayPlan) return;
    const j = i + dir;
    if (j < 0 || j >= dayPlan.exercises.length) return;
    const exercises = [...dayPlan.exercises];
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
    onSavePlanDay({ ...dayPlan, exercises });
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>Training</Eyebrow>
          <h1 className="mt-1 font-display text-[30px] text-ink">Plan</h1>
        </div>
        {sessions.length > 0 && (
          <button onClick={() => setHistoryOpen(true)} className="mt-2 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-semibold text-muted">
            History
          </button>
        )}
      </div>

      {/* Week strip */}
      <div className="mt-5 flex gap-1">
        {weekDates.map((d, wd) => {
          const plan = store.plan.find((x) => x.weekday === wd);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const hasExtra = store.extras.some((e) => e.date === iso && e.exercises.length > 0);
          const training = (!!plan && plan.exercises.length > 0) || hasExtra;
          const selected = wd === selectedWd;
          return (
            <button
              key={wd}
              onClick={() => {
                setSelectedWd(wd);
                setEditing(false);
                setReordering(false);
                setExpanded(null);
              }}
              aria-current={selected ? 'date' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-2.5 ${
                selected ? 'border-ink bg-ink text-white' : 'border-transparent text-ink'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${selected ? 'text-white/70' : 'text-faint'}`}>
                {DAY_LABELS[wd].slice(0, 3)}
              </span>
              <span className={`text-[16px] font-semibold ${selected ? 'text-white' : training ? 'text-ink' : 'text-faint'}`}>{d.getDate()}</span>
              <span className={`h-[4px] w-[4px] rounded-full ${training ? (selected ? 'bg-white' : 'bg-ink') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {/* Session header */}
      <div className="mt-7 flex items-end justify-between border-b border-line pb-4">
        <div className="min-w-0 pr-3">
          <Eyebrow>{isToday ? 'Today' : DAY_NAMES[selectedWd]}</Eyebrow>
          <h2 className="mt-1 text-[22px] font-semibold text-ink">{dayPlan && dayPlan.exercises.length > 0 ? dayPlan.label : 'Rest day'}</h2>
          {dayPlan?.focus && dayPlan.exercises.length > 0 && <p className="mt-1 text-[12px] leading-snug text-faint">{dayPlan.focus}</p>}
        </div>
        {isToday &&
          dayPlan &&
          dayPlan.exercises.length > 0 &&
          !editing &&
          (sessionDone ? (
            <span className="text-[13px] font-semibold text-faint">Done</span>
          ) : sessionOpen ? (
            <button onClick={onCompleteWorkout} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white">
              Finish
            </button>
          ) : (
            <button onClick={onStartSession} className="rounded-full border border-ink px-4 py-2 text-[13px] font-semibold text-ink">
              Start
            </button>
          ))}
      </div>

      {editing ? (
        <DayEditor
          weekday={selectedWd}
          initial={dayPlan}
          equipment={store.profile.equipment}
          onSave={onSavePlanDay}
          onClear={() => onRemovePlanDay(selectedWd)}
          onClose={() => setEditing(false)}
        />
      ) : dayPlan && dayPlan.exercises.length > 0 ? (
        <>
          {dayPlan.exercises.length > 1 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setReordering((r) => !r);
                  setExpanded(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${reordering ? 'border-ink bg-ink text-white' : 'border-line text-muted'}`}
              >
                {reordering ? 'Done' : 'Reorder'}
              </button>
            </div>
          )}
          {reordering ? (
            <ul className="mt-1">
              {dayPlan.exercises.map((ex, i) => {
                const isCardio = ex.type === 'cardio';
                return (
                  <li key={i} className={`flex items-center justify-between gap-3 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium text-ink">{ex.name}</div>
                      <div className="mt-0.5 text-[12px] text-faint">
                        {isCardio
                          ? [ex.durationMin ? `${ex.durationMin} min` : null, ex.distanceKm ? `${ex.distanceKm} km` : null].filter(Boolean).join(' · ') || 'Cardio'
                          : `${ex.sets ?? 3} × ${ex.reps ?? '—'}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => moveExercise(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move ${ex.name} up`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink disabled:opacity-30"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        onClick={() => moveExercise(i, 1)}
                        disabled={i === dayPlan.exercises.length - 1}
                        aria-label={`Move ${ex.name} down`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink disabled:opacity-30"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ExerciseList
              exercises={dayPlan.exercises}
              store={store}
              selectedDate={selectedDate}
              canLog={canLog}
              onLogSet={onLogSet}
              onUnlogSet={onUnlogSet}
              onLogCardio={onLogCardio}
            />
          )}
        </>
      ) : extra && extra.exercises.length > 0 ? null : (
        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          {store.plan.length === 0 ? 'No plan yet — build your first session below.' : 'Nothing scheduled. Rest up.'}
        </p>
      )}


      {/* One-off workout — pinned to this date, never repeats */}
      {editingExtra ? (
        <ExtraEditor
          dateLabel={isToday ? 'Today' : DAY_NAMES[selectedWd]}
          initial={extra}
          equipment={store.profile.equipment}
          onSave={(exercises) => onSaveExtra(selectedDate, exercises)}
          onClose={() => setEditingExtra(false)}
        />
      ) : extra && extra.exercises.length > 0 ? (
        <div className="mt-7">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <Eyebrow>One-off</Eyebrow>
              <h3 className="mt-1 text-[17px] font-semibold text-ink">{extra.label}</h3>
            </div>
            <button onClick={() => onRemoveExtra(selectedDate)} aria-label="Remove one-off workout" className="shrink-0 p-1 text-faint">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ExerciseList
            exercises={extra.exercises}
            store={store}
            selectedDate={selectedDate}
            canLog={canLog}
            onLogSet={onLogSet}
            onUnlogSet={onUnlogSet}
            onLogCardio={onLogCardio}
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button onClick={() => setEditingExtra(true)} className="text-[13px] font-semibold text-ink underline">
              Edit
            </button>
            <button onClick={() => onPromoteExtra(selectedDate, selectedWd)} className="text-[13px] font-semibold text-muted underline">
              Repeat this weekly
            </button>
          </div>
        </div>
      ) : null}

      {!editing && !reordering && !editingExtra && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            onClick={() => {
              setReordering(false);
              setEditing(true);
            }}
            className="text-[13px] font-semibold text-ink underline"
          >
            {dayPlan ? 'Edit this day' : 'Build this day'}
          </button>
          {!extra && (
            <button onClick={() => setEditingExtra(true)} className="text-[13px] font-semibold text-muted underline">
              Add a one-off workout
            </button>
          )}
          {store.plan.length === 0 && (
            <button onClick={onSuggestPlan} className="text-[13px] font-semibold text-muted underline">
              Suggest a plan for me
            </button>
          )}
        </div>
      )}

      {historyOpen && <SessionLog sessions={sessions} onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}
