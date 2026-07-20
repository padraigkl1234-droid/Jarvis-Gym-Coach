'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HomeTab } from '@/components/HomeTab';
import { MoveTab } from '@/components/MoveTab';
import { FuelTab } from '@/components/FuelTab';
import { BodyTab } from '@/components/BodyTab';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { SettingsScreen, type Prefs } from '@/components/SettingsScreen';
import { CtaButton, Eyebrow, Field, fieldCls, Sheet } from '@/components/ui';
import {
  loadStore,
  saveStore,
  DEFAULT_STORE,
  newId,
  todayStr,
  timeStr,
  type JarvisStore,
  type MealEntry,
  type MealSlot,
  type MemoryCategory,
  type MemoryEntry,
  type MetricEntry,
  type PlanDay,
  type Profile,
  type WorkoutSession,
} from '@/lib/store';

type Tab = 'home' | 'move' | 'fuel' | 'body';

const PREFS_KEY = 'valoris.prefs.v1';

/* Nav icons — the design's exact line glyphs. */
function NavIcon({ tab, className }: { tab: Tab; className?: string }) {
  const paths: Record<Tab, React.ReactNode> = {
    home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
    move: <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />,
    fuel: (
      <>
        <path d="M4 11h16a8 8 0 0 1-16 0z" />
        <path d="M12 3v3M9 4v2M15 4v2" />
      </>
    ),
    body: <path d="M4 15l4-6 4 4 4-8 4 6" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={23} height={23} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[tab]}
    </svg>
  );
}

/** Log-measurement sheet shared by the FAB and the Body tab. */
function MeasureSheet({ onSave, onClose }: { onSave: (patch: Partial<MetricEntry> & { date: string }) => void; onClose: () => void }) {
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [sleep, setSleep] = useState('');
  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const valid = num(weight) != null || num(bodyFat) != null || num(restingHr) != null || num(sleep) != null;
  return (
    <Sheet onClose={onClose} label="Log a measurement">
      <h2 className="font-display text-[24px] text-ink">Log a measurement</h2>
      <div className="mt-5 space-y-4">
        <Field label="Date">
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight kg">
            <input autoFocus value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="—" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Body fat %">
            <input value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} inputMode="decimal" placeholder="—" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Resting HR">
            <input value={restingHr} onChange={(e) => setRestingHr(e.target.value)} inputMode="numeric" placeholder="—" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Sleep hrs">
            <input value={sleep} onChange={(e) => setSleep(e.target.value)} inputMode="decimal" placeholder="—" className={`${fieldCls} text-center`} />
          </Field>
        </div>
      </div>
      <CtaButton
        className="mt-6 !py-3.5"
        disabled={!valid}
        onClick={() => {
          onSave({ date, weightKg: num(weight), bodyFatPct: num(bodyFat), restingHr: num(restingHr), sleepHours: num(sleep) });
          onClose();
        }}
      >
        Save measurement
      </CtaButton>
    </Sheet>
  );
}

export default function ValorisPage() {
  const [store, setStore] = useState<JarvisStore>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ reminders: false });

  const storeRef = useRef(store);

  const commitStore = useCallback((next: JarvisStore) => {
    storeRef.current = next;
    setStore(next);
    saveStore(next);
  }, []);

  useEffect(() => {
    const loaded = loadStore();
    storeRef.current = loaded;
    setStore(loaded);
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ reminders: false, ...JSON.parse(raw) });
    } catch {
      /* defaults stand */
    }
    setHydrated(true);
  }, []);

  const handleTogglePref = useCallback((key: keyof Prefs) => {
    setPrefs((cur) => {
      const next = { ...cur, [key]: !cur[key] };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  /* ---- Training ---- */

  const ensureSession = useCallback((cur: JarvisStore): { sessions: JarvisStore['sessions']; session: WorkoutSession } => {
    const now = new Date();
    const date = todayStr(now);
    let sessions = cur.sessions;
    let session = sessions.find((s) => s.date === date && s.status === 'in_progress') ?? sessions.find((s) => s.date === date);
    if (!session) {
      const weekday = now.getDay();
      const planDay = cur.plan.find((x) => x.weekday === weekday);
      const fresh: WorkoutSession = {
        id: newId(),
        date,
        weekday,
        label: planDay?.label ?? 'Workout',
        focus: planDay?.focus,
        startedAt: timeStr(now),
        completedAt: null,
        status: 'in_progress',
      };
      session = fresh;
      sessions = [...sessions, fresh];
    }
    return { sessions, session };
  }, []);

  const handleStartSession = useCallback(() => {
    const cur = storeRef.current;
    const { sessions } = ensureSession(cur);
    if (sessions !== cur.sessions) commitStore({ ...cur, sessions });
    setTab('move');
  }, [commitStore, ensureSession]);

  const handleQuickLogSet = useCallback(
    (exercise: string, weightKg?: number) => {
      const cur = storeRef.current;
      const now = new Date();
      const date = todayStr(now);
      const { sessions, session } = ensureSession(cur);
      const setNumber = cur.sets.filter((s) => s.date === date && s.exercise.toLowerCase() === exercise.toLowerCase()).length + 1;
      commitStore({
        ...cur,
        sessions,
        sets: [
          ...cur.sets,
          { date, time: timeStr(now), exercise, setNumber, reps: null, weightKg: weightKg ?? null, rpe: null, sessionId: session.id },
        ],
      });
    },
    [commitStore, ensureSession]
  );

  const handleUnlogSet = useCallback(
    (exercise: string) => {
      const cur = storeRef.current;
      const date = todayStr();
      let target = -1;
      for (let i = 0; i < cur.sets.length; i++) {
        const s = cur.sets[i];
        if (s.date === date && s.exercise.toLowerCase() === exercise.toLowerCase()) target = i;
      }
      if (target < 0) return;
      commitStore({ ...cur, sets: cur.sets.filter((_, i) => i !== target) });
    },
    [commitStore]
  );

  const handleLogCardio = useCallback(
    (exercise: string, durationMin?: number, distanceKm?: number) => {
      const cur = storeRef.current;
      const now = new Date();
      const date = todayStr(now);
      const { sessions, session } = ensureSession(cur);
      const setNumber = cur.sets.filter((s) => s.date === date && s.exercise.toLowerCase() === exercise.toLowerCase()).length + 1;
      commitStore({
        ...cur,
        sessions,
        sets: [
          ...cur.sets,
          {
            date,
            time: timeStr(now),
            exercise,
            setNumber,
            reps: null,
            weightKg: null,
            rpe: null,
            durationMin: durationMin ?? null,
            distanceKm: distanceKm ?? null,
            sessionId: session.id,
          },
        ],
      });
    },
    [commitStore, ensureSession]
  );

  const handleCompleteWorkout = useCallback(() => {
    const cur = storeRef.current;
    const date = todayStr();
    const open = cur.sessions.find((s) => s.date === date && s.status === 'in_progress');
    if (!open) return;
    commitStore({
      ...cur,
      sessions: cur.sessions.map((s) => (s === open ? { ...s, status: 'completed' as const, completedAt: timeStr() } : s)),
    });
  }, [commitStore]);

  const handleSavePlanDay = useCallback(
    (day: PlanDay) => {
      const cur = storeRef.current;
      const plan = cur.plan.filter((p) => p.weekday !== day.weekday);
      plan.push(day);
      plan.sort((a, b) => a.weekday - b.weekday);
      commitStore({ ...cur, plan });
    },
    [commitStore]
  );

  const handleRemovePlanDay = useCallback(
    (weekday: number) => {
      const cur = storeRef.current;
      commitStore({ ...cur, plan: cur.plan.filter((p) => p.weekday !== weekday) });
    },
    [commitStore]
  );

  /* ---- Nutrition ---- */

  const handleAddMeal = useCallback(
    (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; slot: MealSlot }) => {
      const cur = storeRef.current;
      const now = new Date();
      commitStore({ ...cur, meals: [...cur.meals, { date: todayStr(now), time: timeStr(now), ...meal }] });
    },
    [commitStore]
  );

  const handleDeleteMeal = useCallback(
    (meal: MealEntry) => {
      const cur = storeRef.current;
      commitStore({ ...cur, meals: cur.meals.filter((m) => m !== meal) });
    },
    [commitStore]
  );

  const handleSetWater = useCallback(
    (ml: number) => {
      const cur = storeRef.current;
      const date = todayStr();
      commitStore({ ...cur, water: [...cur.water.filter((w) => w.date !== date), ...(ml > 0 ? [{ date, ml }] : [])] });
    },
    [commitStore]
  );

  /* ---- Body ---- */

  const handleLogMetric = useCallback(
    (patch: Partial<MetricEntry> & { date: string }) => {
      const cur = storeRef.current;
      const idx = cur.metrics.findIndex((m) => m.date === patch.date);
      const metrics = idx >= 0 ? cur.metrics.map((m, i) => (i === idx ? { ...m, ...patch } : m)) : [...cur.metrics, patch as MetricEntry];
      commitStore({ ...cur, metrics });
    },
    [commitStore]
  );

  const handleDeleteMetric = useCallback(
    (entry: MetricEntry) => {
      const cur = storeRef.current;
      commitStore({ ...cur, metrics: cur.metrics.filter((m) => m !== entry) });
    },
    [commitStore]
  );

  /* ---- Profile, notes, prefs ---- */

  const handleProfileSave = useCallback(
    (patch: Partial<Profile>) => {
      const cur = storeRef.current;
      commitStore({ ...cur, profile: { ...cur.profile, ...patch } });
    },
    [commitStore]
  );

  const handleAddMemory = useCallback(
    (note: string, category: MemoryCategory) => {
      const cur = storeRef.current;
      commitStore({ ...cur, memories: [...cur.memories, { date: todayStr(), note, category }] });
    },
    [commitStore]
  );

  const handleRemoveMemory = useCallback(
    (memory: MemoryEntry) => {
      const cur = storeRef.current;
      commitStore({ ...cur, memories: cur.memories.filter((m) => m !== memory) });
    },
    [commitStore]
  );

  const handleResetAll = useCallback(() => {
    commitStore(structuredClone(DEFAULT_STORE));
    setSettingsOpen(false);
    setTab('home');
  }, [commitStore]);

  /* ---- Render ---- */

  if (!hydrated) return <div className="min-h-[100dvh] bg-canvas" />;

  if (!store.profile.onboarded) {
    return <OnboardingFlow onComplete={(profile) => handleProfileSave(profile)} />;
  }

  const NAV: { id: Tab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'move', label: 'Move' },
    { id: 'fuel', label: 'Fuel' },
    { id: 'body', label: 'Body' },
  ];

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <main className="mx-auto max-w-md px-6 pb-[108px] pt-4">
        <div key={tab} className="view-in">
          {tab === 'home' && <HomeTab store={store} onStartSession={handleStartSession} onOpenSettings={() => setSettingsOpen(true)} />}
          {tab === 'move' && (
            <MoveTab
              store={store}
              onLogSet={handleQuickLogSet}
              onUnlogSet={handleUnlogSet}
              onLogCardio={handleLogCardio}
              onStartSession={handleStartSession}
              onCompleteWorkout={handleCompleteWorkout}
              onSavePlanDay={handleSavePlanDay}
              onRemovePlanDay={handleRemovePlanDay}
            />
          )}
          {tab === 'fuel' && <FuelTab store={store} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} onSetWater={handleSetWater} />}
          {tab === 'body' && <BodyTab store={store} onOpenLog={() => setMeasureOpen(true)} onDeleteMetric={handleDeleteMetric} />}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E4E0D4] bg-[rgba(245,244,238,.94)] [backdrop-filter:blur(10px)]"
        aria-label="Primary"
      >
        <div className="mx-auto grid h-[90px] max-w-md grid-cols-5 items-start px-2 pt-2.5">
          {NAV.slice(0, 2).map((item) => {
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-1 py-1">
                <NavIcon tab={item.id} className={active ? 'text-clay' : 'text-hairline'} />
                <span className={`text-[10px] ${active ? 'font-bold text-clay' : 'font-semibold text-hairline'}`}>{item.label}</span>
              </button>
            );
          })}
          <div className="flex justify-center">
            <button
              onClick={() => setQuickAddOpen(true)}
              aria-label="Quick add"
              className="-mt-[26px] flex h-14 w-14 items-center justify-center rounded-full bg-clay text-white shadow-fab transition-colors hover:bg-clay-dark"
            >
              <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {NAV.slice(2).map((item) => {
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-1 py-1">
                <NavIcon tab={item.id} className={active ? 'text-clay' : 'text-hairline'} />
                <span className={`text-[10px] ${active ? 'font-bold text-clay' : 'font-semibold text-hairline'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Overlays */}
      {settingsOpen && (
        <SettingsScreen
          store={store}
          prefs={prefs}
          onTogglePref={handleTogglePref}
          onProfileSave={handleProfileSave}
          onAddMemory={handleAddMemory}
          onRemoveMemory={handleRemoveMemory}
          onResetAll={handleResetAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {quickAddOpen && (
        <Sheet onClose={() => setQuickAddOpen(false)} label="Quick add">
          <Eyebrow>Quick add</Eyebrow>
          <div className="mt-3 space-y-2">
            <button
              onClick={() => {
                setQuickAddOpen(false);
                setTab('fuel');
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-clay-soft text-clay">
                <NavIcon tab="fuel" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">Log food</span>
                <span className="block text-[12px] text-faint">Add a meal to today</span>
              </span>
            </button>
            <button
              onClick={() => {
                setQuickAddOpen(false);
                setMeasureOpen(true);
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-clay-soft text-clay">
                <NavIcon tab="body" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">Log a measurement</span>
                <span className="block text-[12px] text-faint">Weight, body fat, HR, sleep</span>
              </span>
            </button>
            <button
              onClick={() => {
                setQuickAddOpen(false);
                setTab('move');
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-clay-soft text-clay">
                <NavIcon tab="move" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">Log a set</span>
                <span className="block text-[12px] text-faint">Jump into today&apos;s session</span>
              </span>
            </button>
          </div>
        </Sheet>
      )}

      {measureOpen && <MeasureSheet onSave={handleLogMetric} onClose={() => setMeasureOpen(false)} />}
    </div>
  );
}
