'use client';

import React, { useMemo, useState } from 'react';
import { Play, Trash2, Plus } from 'lucide-react';
import { type ExerciseType, type JarvisStore, type PlanDay, todayStr } from '@/lib/store';
import { Card, Chip, CtaButton, Eyebrow, fieldCls } from '@/components/ui';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Draft {
  name: string;
  type: ExerciseType;
  sets: string;
  reps: string;
  durationMin: string;
  distanceKm: string;
}

const emptyRow = (): Draft => ({ name: '', type: 'strength', sets: '3', reps: '8-10', durationMin: '', distanceKm: '' });

/** Inline day editor, Calm Cream edition. */
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
  const [rows, setRows] = useState<Draft[]>(
    initial && initial.exercises.length > 0
      ? initial.exercises.map((e) => ({
          name: e.name,
          type: e.type ?? 'strength',
          sets: e.sets?.toString() ?? '',
          reps: e.reps ?? '',
          durationMin: e.durationMin?.toString() ?? '',
          distanceKm: e.distanceKm?.toString() ?? '',
        }))
      : [emptyRow()]
  );
  const setRow = (i: number, patch: Partial<Draft>) => setRows((cur) => cur.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const valid = label.trim().length > 0 && rows.some((r) => r.name.trim().length > 0);

  const save = () => {
    if (!valid) return;
    onSave({
      weekday,
      label: label.trim(),
      focus: initial?.focus ?? '',
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

  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="eyebrow mb-1.5 !text-[10px]">Session name</div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "Upper A"' className={fieldCls} />
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2">
              <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Exercise" className={`${fieldCls} flex-1 !bg-canvas`} />
              <button
                onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((_, k) => k !== i) : cur))}
                aria-label={`Remove exercise ${i + 1}`}
                className="p-2 text-hairline transition-colors hover:text-clay"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex overflow-hidden rounded-full border border-line text-[12px] font-bold">
                <button
                  type="button"
                  onClick={() => setRow(i, { type: 'strength' })}
                  className={`px-3 py-1.5 ${r.type === 'cardio' ? 'bg-transparent text-faint' : 'bg-ink text-white'}`}
                >
                  Strength
                </button>
                <button
                  type="button"
                  onClick={() => setRow(i, { type: 'cardio' })}
                  className={`px-3 py-1.5 ${r.type === 'cardio' ? 'bg-clay text-white' : 'bg-transparent text-faint'}`}
                >
                  Cardio
                </button>
              </div>
              {r.type === 'cardio' ? (
                <>
                  <input value={r.durationMin} onChange={(e) => setRow(i, { durationMin: e.target.value })} inputMode="decimal" placeholder="min" className={`${fieldCls} !w-20 !bg-canvas text-center`} />
                  <input value={r.distanceKm} onChange={(e) => setRow(i, { distanceKm: e.target.value })} inputMode="decimal" placeholder="km" className={`${fieldCls} !w-20 !bg-canvas text-center`} />
                </>
              ) : (
                <>
                  <input value={r.sets} onChange={(e) => setRow(i, { sets: e.target.value })} inputMode="numeric" placeholder="sets" className={`${fieldCls} !w-16 !bg-canvas text-center`} />
                  <input value={r.reps} onChange={(e) => setRow(i, { reps: e.target.value })} placeholder="reps" className={`${fieldCls} !w-20 !bg-canvas text-center`} />
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
      <button
        onClick={() => setRows((cur) => [...cur, emptyRow()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[#D8D2C4] py-3 text-[13px] font-semibold text-faint transition-colors hover:border-clay hover:text-clay"
      >
        <Plus className="h-4 w-4" /> Add exercise
      </button>
      <div className="flex items-center gap-3">
        <CtaButton onClick={save} disabled={!valid} className="!py-3">
          Save {DAY_LABELS[weekday]}
        </CtaButton>
        <button onClick={onClose} className="shrink-0 rounded-full border border-line px-5 py-3 text-[14px] font-bold text-muted">
          Cancel
        </button>
      </div>
      {initial && (
        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="w-full py-1 text-center text-[13px] font-bold text-clay"
        >
          Make this a rest day
        </button>
      )}
    </div>
  );
}

export function MoveTab({
  store,
  onLogSet,
  onUnlogSet,
  onLogCardio,
  onStartSession,
  onCompleteWorkout,
  onSavePlanDay,
  onRemovePlanDay,
}: {
  store: JarvisStore;
  onLogSet: (exercise: string, weightKg?: number) => void;
  onUnlogSet: (exercise: string) => void;
  onLogCardio: (exercise: string, durationMin?: number, distanceKm?: number) => void;
  onStartSession: () => void;
  onCompleteWorkout: () => void;
  onSavePlanDay: (day: PlanDay) => void;
  onRemovePlanDay: (weekday: number) => void;
}) {
  const now = new Date();
  const todayWd = now.getDay();
  const [selectedWd, setSelectedWd] = useState(todayWd);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState<Record<string, string>>({});
  const [cardioDraft, setCardioDraft] = useState<Record<string, { min: string; km: string }>>({});
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

  const dayPlan = store.plan.find((p) => p.weekday === selectedWd);
  const isToday = selectedWd === todayWd;
  const todaySets = useMemo(() => store.sets.filter((s) => s.date === today), [store, today]);
  const sessionOpen = store.sessions.some((s) => s.date === today && s.status === 'in_progress');
  const sessionDone = store.sessions.some((s) => s.date === today && s.status === 'completed');

  const loggedCount = (exercise: string) => todaySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase()).length;
  const cardioLogsFor = (exercise: string) =>
    todaySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && (s.durationMin != null || s.distanceKm != null));
  const lastWeightFor = (exercise: string) => {
    const matches = store.sets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase() && s.weightKg != null);
    return matches.length ? matches[matches.length - 1].weightKg! : null;
  };

  const p = store.profile;
  const equipSummary =
    p.equipment && p.equipment.length > 0 ? (p.equipment.length > 2 ? 'Full gym' : p.equipment.join(' · ')) : null;

  return (
    <div>
      <Eyebrow className="pt-2">Fitness plan</Eyebrow>
      <h1 className="mt-1 font-display text-[32px] text-ink">Move</h1>

      {/* Week strip */}
      <div className="mt-5 flex gap-1.5">
        {weekDates.map((d, wd) => {
          const plan = store.plan.find((x) => x.weekday === wd);
          const training = !!plan && plan.exercises.length > 0;
          const selected = wd === selectedWd;
          const isTodayCol = wd === todayWd;
          return (
            <button
              key={wd}
              onClick={() => {
                setSelectedWd(wd);
                setEditing(false);
                setExpanded(null);
              }}
              aria-current={selected ? 'date' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[14px] py-2.5 transition-colors duration-150 ${
                selected ? 'bg-ink' : ''
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wide ${selected ? 'text-ondark-sub' : training ? 'text-faint' : 'text-faintest'}`}>
                {DAY_LABELS[wd].slice(0, 3)}
              </span>
              <span className={`font-display text-[18px] ${selected ? 'text-white' : training ? 'text-ink' : 'text-faintest'}`}>
                {d.getDate()}
              </span>
              <span
                className={`h-[5px] w-[5px] rounded-full ${
                  isTodayCol && selected ? 'bg-clay-bright' : training ? (selected ? 'bg-clay-bright' : 'bg-[#D8CFBE]') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Session header */}
      <div className="mt-7 flex items-end justify-between">
        <div>
          <Eyebrow clay>{isToday ? 'Today' : DAY_NAMES[selectedWd]}</Eyebrow>
          <h2 className="mt-1 font-display text-[26px] text-ink">
            {dayPlan && dayPlan.exercises.length > 0 ? dayPlan.label : 'Rest day'}
          </h2>
        </div>
        {isToday && dayPlan && dayPlan.exercises.length > 0 && !editing && (
          sessionDone ? (
            <span className="rounded-full bg-sage-soft px-4 py-2 text-[13px] font-bold text-sage">Done ✓</span>
          ) : sessionOpen ? (
            <button onClick={onCompleteWorkout} className="rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white">
              Finish
            </button>
          ) : (
            <button onClick={onStartSession} className="flex items-center gap-1.5 rounded-full bg-clay px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-clay-dark">
              Start <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          )
        )}
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
        <ul className="mt-2">
          {dayPlan.exercises.map((ex, i) => {
            const isCardio = ex.type === 'cardio';
            const isOpen = expanded === ex.name;
            if (isCardio) {
              const target = [ex.durationMin ? `${ex.durationMin} min` : null, ex.distanceKm ? `${ex.distanceKm} km` : null]
                .filter(Boolean)
                .join(' · ');
              const logs = isToday ? cardioLogsFor(ex.name) : [];
              const draft = cardioDraft[ex.name] ?? { min: '', km: '' };
              const done = logs.length > 0;
              return (
                <li key={i} className={`py-[15px] ${i > 0 ? 'border-t border-line' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-[15px] font-semibold ${done ? 'text-hairline' : 'text-ink'}`}>{ex.name}</div>
                      <div className="mt-0.5 text-[12px] text-faint">
                        {target || 'Cardio'}
                        {done && (
                          <span className="text-sage">
                            {' '}
                            · {logs
                              .map((s) =>
                                [s.durationMin ? `${s.durationMin} min` : null, s.distanceKm ? `${s.distanceKm} km` : null]
                                  .filter(Boolean)
                                  .join(' / ')
                              )
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isToday && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : ex.name)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold ${done ? 'bg-sage-soft text-sage' : 'bg-clay-soft text-clay'}`}
                      >
                        {isOpen ? 'Close' : 'Log'}
                      </button>
                    )}
                  </div>
                  {isOpen && isToday && (
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
                          onLogCardio(
                            ex.name,
                            Number.isFinite(min) && min > 0 ? min : undefined,
                            Number.isFinite(km) && km > 0 ? km : undefined
                          );
                          setCardioDraft((c) => ({ ...c, [ex.name]: { min: '', km: '' } }));
                          setExpanded(null);
                        }}
                        disabled={!draft.min.trim() && !draft.km.trim()}
                        className="rounded-full bg-clay px-4 py-2.5 text-[13px] font-bold text-white disabled:bg-track disabled:text-hairline"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </li>
              );
            }

            const targetSets = ex.sets ?? 3;
            const logged = isToday ? loggedCount(ex.name) : 0;
            const complete = logged >= targetSets;
            const last = lastWeightFor(ex.name);
            const weightVal = weightDraft[ex.name] ?? (last != null ? String(last) : '');
            const weightNum = parseFloat(weightVal);
            const nextWeight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : undefined;
            return (
              <li key={i} className={`py-[15px] ${i > 0 ? 'border-t border-line' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => isToday && setExpanded(isOpen ? null : ex.name)} className="min-w-0 flex-1 text-left">
                    <div className={`text-[15px] font-semibold ${complete ? 'text-hairline' : 'text-ink'}`}>{ex.name}</div>
                    <div className="mt-0.5 text-[12px] text-faint">
                      {targetSets} × {ex.reps ?? '—'}
                      {last != null && ` · ${last} kg last`}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {Array.from({ length: targetSets }, (_, k) => {
                      const filled = k < logged;
                      const actionable = isToday && (filled ? k === logged - 1 : k === logged);
                      return (
                        <button
                          key={k}
                          onClick={() =>
                            isToday
                              ? filled && k === logged - 1
                                ? onUnlogSet(ex.name)
                                : !filled && k === logged
                                ? onLogSet(ex.name, nextWeight)
                                : undefined
                              : undefined
                          }
                          disabled={!actionable}
                          aria-label={`${ex.name} set ${k + 1}${filled ? ' logged' : ''}`}
                          className="flex h-7 w-7 items-center justify-center"
                        >
                          <span
                            className={`h-[9px] w-[9px] rounded-full transition-colors duration-150 ${
                              filled ? 'bg-sage' : 'border-[1.5px] border-[#D8D2C4]'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                {isOpen && isToday && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="text-[12px] font-semibold text-faint">Weight</span>
                    <input
                      value={weightVal}
                      onChange={(e) => setWeightDraft((c) => ({ ...c, [ex.name]: e.target.value }))}
                      inputMode="decimal"
                      placeholder="kg"
                      className={`${fieldCls} !w-24 text-center`}
                    />
                    <span className="text-[12px] text-hairline">applies to the next set you tick</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {store.plan.length === 0
            ? 'No plan yet — build your first session below.'
            : 'Nothing scheduled. Rest, eat well, and come back stronger.'}
        </p>
      )}

      {!editing && (
        <button onClick={() => setEditing(true)} className="mt-3 text-[13px] font-bold text-faint transition-colors hover:text-clay">
          {dayPlan ? 'Edit this day' : 'Build this day'} →
        </button>
      )}

      {/* Training parameters */}
      <Card className="mt-8 p-[18px]">
        <Eyebrow>Training parameters</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.goal && <Chip active>{p.goal}</Chip>}
          {p.experience && <Chip>{p.experience}</Chip>}
          {p.daysPerWeek && <Chip>{p.daysPerWeek} days / wk</Chip>}
          {equipSummary && <Chip>{equipSummary}</Chip>}
          {!p.goal && !p.experience && <span className="text-[13px] text-faint">Set your goal and schedule in Settings.</span>}
        </div>
      </Card>
    </div>
  );
}
