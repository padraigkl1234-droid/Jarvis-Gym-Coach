'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { HudFrame, HudSection } from '@/components/HudFrame';
import { type JarvisStore, type PlanDay, type SetEntry, MEMORY_META, todayStr } from '@/lib/store';

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The exercise checklist for a single planned day. Done ticks only apply to today. */
function PlanExercises({ plan, todaySets }: { plan: PlanDay; todaySets: SetEntry[] | null }) {
  return (
    <div className="space-y-1.5">
      {plan.exercises.map((ex, i) => {
        const done = todaySets?.some((s) => s.exercise.toLowerCase() === ex.name.toLowerCase()) ?? false;
        return (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[9px] ${
                done ? 'border-sky-400/60 bg-sky-400/15 text-sky-300' : 'border-white/15 text-transparent'
              }`}
            >
              ✓
            </span>
            <span className={done ? 'text-white/95' : 'text-white/80'}>{ex.name}</span>
            {(ex.sets || ex.reps) && (
              <span className="ml-auto font-display text-[10px] tabular-nums text-white/55">
                {ex.sets ?? ''}
                {ex.sets && ex.reps ? '×' : ''}
                {ex.reps ?? ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TrainingHud({
  store,
  onClose,
  onDeleteSet,
}: {
  store: JarvisStore;
  onClose?: () => void;
  onDeleteSet?: (set: SetEntry) => void;
}) {
  const [showFull, setShowFull] = useState(false);
  const now = new Date();
  const weekday = now.getDay();
  const today = todayStr(now);
  const todayPlan = store.plan.find((p) => p.weekday === weekday);
  const todaySets = store.sets.filter((s) => s.date === today);
  const plannedWeekdays = new Set(store.plan.map((p) => p.weekday));
  const fullPlan = [...store.plan].sort((a, b) => a.weekday - b.weekday);

  return (
    <HudFrame title="Training Log" side="left" accent="sky" onClose={onClose}>
      {/* Week strip */}
      <HudSection label="Week Cycle">
        <div className="flex justify-between">
          {WEEKDAYS_SHORT.map((d, i) => {
            const isToday = i === weekday;
            const planned = plannedWeekdays.has(i);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] ${isToday ? 'text-sky-300' : 'text-white/60'}`}>{d}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isToday
                      ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]'
                      : planned
                      ? 'bg-white/40'
                      : 'bg-white/10'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </HudSection>

      {/* Session plan — today by default, full week on toggle */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[9px] font-medium uppercase tracking-[0.25em] text-white/55">
            {showFull ? 'Full Plan' : `Today · ${WEEKDAYS[weekday]}`}
          </span>
          {store.plan.length > 0 && (
            <div className="flex overflow-hidden rounded-sm border border-sky-400/20">
              {(['Today', 'Week'] as const).map((mode) => {
                const active = (mode === 'Week') === showFull;
                return (
                  <button
                    key={mode}
                    onClick={() => setShowFull(mode === 'Week')}
                    className={`px-2 py-0.5 font-display text-[9px] font-medium uppercase tracking-[0.15em] transition-colors ${
                      active ? 'bg-sky-400/20 text-sky-200' : 'text-white/55 hover:text-white/85'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {store.plan.length === 0 ? (
          <div className="text-[12px] italic text-white/35">No plan yet. Ask VALORIS to build one.</div>
        ) : showFull ? (
          <div className="space-y-4">
            {fullPlan.map((day) => {
              const isToday = day.weekday === weekday;
              return (
                <div
                  key={day.weekday}
                  className={`rounded-sm border-l-2 pl-2.5 ${isToday ? 'border-sky-400/70' : 'border-white/10'}`}
                >
                  <div className="mb-0.5 flex items-baseline justify-between">
                    <span className="font-display text-sm text-sky-200">{day.label}</span>
                    <span className={`text-[9px] uppercase tracking-widest ${isToday ? 'text-sky-300' : 'text-white/55'}`}>
                      {WEEKDAYS[day.weekday]}
                    </span>
                  </div>
                  {day.focus && <div className="mb-2 text-[11px] leading-relaxed text-white/70">{day.focus}</div>}
                  <PlanExercises plan={day} todaySets={isToday ? todaySets : null} />
                </div>
              );
            })}
          </div>
        ) : todayPlan ? (
          <div>
            <div className="mb-1 font-display text-sm text-sky-200">{todayPlan.label}</div>
            <div className="mb-3 text-[11px] leading-relaxed text-white/70">{todayPlan.focus}</div>
            <PlanExercises plan={todayPlan} todaySets={todaySets} />
          </div>
        ) : (
          <div className="text-[12px] italic text-white/35">Rest day — no session scheduled.</div>
        )}
      </div>

      {/* Sets logged today */}
      <HudSection label={`Sets Logged · ${todaySets.length}`}>
        {todaySets.length > 0 ? (
          <div className="space-y-1">
            {todaySets.map((s, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[11px]">
                <span className="font-display text-white/50">{s.time}</span>
                <span className="text-white/75">{s.exercise}</span>
                <span className="ml-auto font-display tabular-nums text-sky-200/80">
                  {s.reps ?? '–'}×{s.weightKg ?? '–'}kg
                  {s.rpe ? <span className="text-white/30"> @{s.rpe}</span> : null}
                </span>
                {onDeleteSet && (
                  <button
                    onClick={() => onDeleteSet(s)}
                    className="shrink-0 text-white/25 transition-colors hover:text-red-400"
                    aria-label={`Delete ${s.exercise} set`}
                    title="Delete set"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] italic text-white/35">Nothing logged yet today.</div>
        )}
      </HudSection>

      {/* Memory bank — grouped by category, injuries surfaced first */}
      <HudSection label={`Memory Bank · ${store.memories.length}`}>
        {store.memories.length > 0 ? (
          <div className="space-y-1.5">
            {[...store.memories]
              .sort((a, b) => {
                // Injuries and records float to the top; otherwise newest-first.
                const rank = (c: string) => (c === 'injury' ? 0 : c === 'record' ? 1 : 2);
                return rank(a.category) - rank(b.category);
              })
              .map((m, i) => {
                const meta = MEMORY_META[m.category] ?? MEMORY_META.general;
                const isWarn = m.category === 'injury';
                return (
                  <div key={i} className="flex gap-1.5 text-[11px] leading-snug">
                    <span
                      className={isWarn ? 'text-amber-400/80' : 'text-sky-400/60'}
                      title={meta.label}
                    >
                      {meta.glyph}
                    </span>
                    <span className={isWarn ? 'text-amber-100/90' : 'text-white/80'}>{m.note}</span>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-[12px] italic text-white/35">
            Tell VALORIS about yourself — injuries, PRs, preferences — and it&rsquo;ll remember.
          </div>
        )}
      </HudSection>
    </HudFrame>
  );
}
