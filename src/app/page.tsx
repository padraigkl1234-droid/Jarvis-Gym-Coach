'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlanTab } from '@/components/PlanTab';
import { FoodTab } from '@/components/FoodTab';
import { ProfileScreen } from '@/components/ProfileScreen';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { generateSuggestedPlan } from '@/lib/planGenerator';
import { CtaButton, Eyebrow, Sheet } from '@/components/ui';
import {
  loadStore,
  saveStore,
  decodePlanParam,
  DEFAULT_STORE,
  newId,
  todayStr,
  timeStr,
  type JarvisStore,
  type MealEntry,
  type MealSlot,
  type PlanDay,
  type Profile,
  type WorkoutSession,
} from '@/lib/store';

type Tab = 'plan' | 'food' | 'profile';

const NAV: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'food', label: 'Food' },
  { id: 'profile', label: 'Profile' },
];

function NavIcon({ tab }: { tab: Tab }) {
  const paths: Record<Tab, React.ReactNode> = {
    plan: <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />,
    food: (
      <>
        <path d="M4 11h16a8 8 0 0 1-16 0z" />
        <path d="M12 3v3M9 4v2M15 4v2" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[tab]}
    </svg>
  );
}

export default function Page() {
  const [store, setStore] = useState<JarvisStore>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('plan');
  const [pendingPlan, setPendingPlan] = useState<PlanDay[] | null>(null);

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
    // A shared plan link (?plan=...) offers to load a whole week in one tap.
    // Nothing is applied until it's confirmed, and logged data is never touched.
    try {
      const param = new URL(window.location.href).searchParams.get('plan');
      if (param) {
        const decoded = decodePlanParam(param);
        if (decoded) setPendingPlan(decoded);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      /* malformed link — ignore */
    }
    setHydrated(true);
  }, []);

  const applyPendingPlan = useCallback(() => {
    if (!pendingPlan) return;
    commitStore({ ...storeRef.current, plan: pendingPlan });
    setPendingPlan(null);
    setTab('plan');
  }, [pendingPlan, commitStore]);

  const handleSuggestPlan = useCallback(() => {
    setPendingPlan(generateSuggestedPlan(storeRef.current.profile));
  }, []);

  /* ---- Training ---- */

  const ensureSession = useCallback((cur: JarvisStore): { sessions: WorkoutSession[]; session: WorkoutSession } => {
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

  const handleLogSet = useCallback(
    (exercise: string, weightKg?: number, reps?: number) => {
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
          { date, time: timeStr(now), exercise, setNumber, reps: reps ?? null, weightKg: weightKg ?? null, rpe: null, sessionId: session.id },
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

  const handleStartSession = useCallback(() => {
    const cur = storeRef.current;
    const { sessions } = ensureSession(cur);
    if (sessions !== cur.sessions) commitStore({ ...cur, sessions });
  }, [commitStore, ensureSession]);

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

  /* ---- Food ---- */

  const handleAddMeal = useCallback(
    (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; slot: MealSlot }) => {
      const cur = storeRef.current;
      const now = new Date();
      commitStore({ ...cur, meals: [...cur.meals, { date: todayStr(now), time: timeStr(now), ...meal }] });
    },
    [commitStore]
  );

  const handleEditMeal = useCallback(
    (meal: MealEntry, patch: Partial<MealEntry>) => {
      const cur = storeRef.current;
      commitStore({ ...cur, meals: cur.meals.map((m) => (m === meal ? { ...m, ...patch } : m)) });
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

  /* ---- Profile ---- */

  const handleProfileSave = useCallback(
    (patch: Partial<Profile>) => {
      const cur = storeRef.current;
      commitStore({ ...cur, profile: { ...cur.profile, ...patch } });
    },
    [commitStore]
  );

  const handleResetAll = useCallback(() => {
    commitStore(structuredClone(DEFAULT_STORE));
    setTab('plan');
  }, [commitStore]);

  /* ---- Render ---- */

  if (!hydrated) return <div className="min-h-[100dvh] bg-canvas" />;

  if (!store.profile.onboarded) {
    return <OnboardingFlow onComplete={handleProfileSave} onRestore={(restored) => commitStore(restored)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <main className="mx-auto max-w-md px-6 pb-[92px] pt-5">
        {tab === 'plan' && (
          <PlanTab
            store={store}
            onLogSet={handleLogSet}
            onUnlogSet={handleUnlogSet}
            onLogCardio={handleLogCardio}
            onStartSession={handleStartSession}
            onCompleteWorkout={handleCompleteWorkout}
            onSavePlanDay={handleSavePlanDay}
            onRemovePlanDay={handleRemovePlanDay}
            onSuggestPlan={handleSuggestPlan}
          />
        )}
        {tab === 'food' && <FoodTab store={store} onAddMeal={handleAddMeal} onEditMeal={handleEditMeal} onDeleteMeal={handleDeleteMeal} />}
        {tab === 'profile' && <ProfileScreen store={store} onProfileSave={handleProfileSave} onRestore={(r) => commitStore(r)} onResetAll={handleResetAll} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas" aria-label="Primary">
        <div className="mx-auto grid h-[72px] max-w-md grid-cols-3 items-start px-2 pt-3">
          {NAV.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-1 ${active ? 'text-ink' : 'text-faint'}`}
              >
                <NavIcon tab={item.id} />
                <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {pendingPlan && (
        <Sheet onClose={() => setPendingPlan(null)} label="Apply plan">
          <Eyebrow>New plan</Eyebrow>
          <h2 className="mt-1 font-display text-[24px] text-ink">Apply this plan?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            This replaces your weekly schedule. Logged workouts and meals are not touched.
          </p>
          <div className="mt-4 space-y-2">
            {pendingPlan.map((d) => (
              <div key={d.weekday} className="rounded-lg border border-line p-3">
                <div className="text-[13px] font-semibold text-ink">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.weekday]} · {d.label}
                </div>
                <div className="mt-0.5 text-[12px] text-faint">{d.exercises.map((e) => e.name).join(', ')}</div>
              </div>
            ))}
          </div>
          <CtaButton className="mt-5" onClick={applyPendingPlan}>
            Apply plan
          </CtaButton>
          <button onClick={() => setPendingPlan(null)} className="mt-3 w-full py-1 text-center text-[13px] font-semibold text-faint">
            Cancel
          </button>
        </Sheet>
      )}
    </div>
  );
}
