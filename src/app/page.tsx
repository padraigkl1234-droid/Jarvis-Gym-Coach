'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Download,
  Upload,
  UserRound,
  Sparkles,
  X,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Dumbbell,
  Salad,
} from 'lucide-react';
import { Onboarding } from '@/components/Onboarding';
import { ProfilePanel } from '@/components/ProfilePanel';
import { Dashboard } from '@/components/Dashboard';
import { SplashIntro } from '@/components/SplashIntro';
import { PlanPage } from '@/components/PlanPage';
import { DietPage } from '@/components/DietPage';
import { detectInsights, wasSeenToday, markSeen } from '@/lib/insights';
import { useVoice } from '@/components/useVoice';
import {
  loadStore,
  saveStore,
  downloadStore,
  parseImportedStore,
  DEFAULT_STORE,
  type JarvisStore,
  type Profile,
  type MealEntry,
  type MealSlot,
  type MemoryCategory,
  type MemoryEntry,
  type PlanDay,
  type SetEntry,
  type WorkoutSession,
  newId,
  todayStr,
  timeStr,
} from '@/lib/store';

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface Caption {
  text: string;
  role: 'user' | 'jarvis';
}

type View = 'dashboard' | 'plan' | 'diet';

const NAV: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'plan', label: 'Fitness Plan', icon: Dumbbell },
  { id: 'diet', label: 'Diet Tracker', icon: Salad },
];

/* ------------------------------ Page ------------------------------ */

export default function ValorisPage() {
  const [store, setStore] = useState<JarvisStore>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [isThinking, setIsThinking] = useState(false);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [undo, setUndo] = useState<{ store: JarvisStore; label: string } | null>(null);
  const [insight, setInsight] = useState<{ title: string; message: string } | null>(null);
  const [foodConfirm, setFoodConfirm] = useState<{
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    note: string;
  } | null>(null);
  const [analysingPhoto, setAnalysingPhoto] = useState(false);

  const storeRef = useRef<JarvisStore>(DEFAULT_STORE);
  const historyRef = useRef<ChatTurn[]>([]);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const commitStore = useCallback((next: JarvisStore) => {
    storeRef.current = next;
    setStore(next);
    saveStore(next);
  }, []);

  const dismissSplash = useCallback(() => setShowSplash(false), []);

  // Offer a brief window to undo a deletion by snapshotting the prior store.
  const offerUndo = useCallback((prev: JarvisStore, label: string) => {
    setUndo({ store: prev, label });
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setUndo(null), 6000);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndo((u) => {
      if (u) commitStore(u.store);
      return null;
    });
  }, [commitStore]);

  const handleDeleteMeal = useCallback(
    (meal: MealEntry) => {
      const cur = storeRef.current;
      commitStore({ ...cur, meals: cur.meals.filter((m) => m !== meal) });
      offerUndo(cur, 'Meal removed');
    },
    [commitStore, offerUndo]
  );

  const handleDeleteSet = useCallback(
    (set: SetEntry) => {
      const cur = storeRef.current;
      commitStore({ ...cur, sets: cur.sets.filter((s) => s !== set) });
      offerUndo(cur, 'Set removed');
    },
    [commitStore, offerUndo]
  );

  // One tap on a set box in the Fitness Plan logs a set (and opens today's
  // session if none exists), mirroring what the voice tools do server-side.
  const handleQuickLogSet = useCallback(
    (exercise: string) => {
      const cur = storeRef.current;
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
      const setNumber = cur.sets.filter((s) => s.date === date && s.exercise.toLowerCase() === exercise.toLowerCase()).length + 1;
      commitStore({
        ...cur,
        sessions,
        sets: [
          ...cur.sets,
          { date, time: timeStr(now), exercise, setNumber, reps: null, weightKg: null, rpe: null, sessionId: session.id },
        ],
      });
    },
    [commitStore]
  );

  // Un-ticking a set box removes the most recent set of that exercise today.
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

  const handleCompleteWorkout = useCallback(() => {
    const cur = storeRef.current;
    const date = todayStr();
    const open = cur.sessions.find((s) => s.date === date && s.status === 'in_progress');
    if (!open) return;
    commitStore({
      ...cur,
      sessions: cur.sessions.map((s) =>
        s === open ? { ...s, status: 'completed' as const, completedAt: timeStr() } : s
      ),
    });
  }, [commitStore]);

  // Hand-editing the weekly plan from the Fitness Plan page.
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
      offerUndo(cur, 'Day cleared');
    },
    [commitStore, offerUndo]
  );

  // Memory bank editing from the profile/settings panel — applies immediately.
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
      offerUndo(cur, 'Memory removed');
    },
    [commitStore, offerUndo]
  );

  const handleAddMeal = useCallback(
    (meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; slot: MealSlot }) => {
      const cur = storeRef.current;
      const now = new Date();
      commitStore({
        ...cur,
        meals: [...cur.meals, { date: todayStr(now), time: timeStr(now), ...meal }],
      });
    },
    [commitStore]
  );

  const handleSetWater = useCallback(
    (ml: number) => {
      const cur = storeRef.current;
      const date = todayStr();
      commitStore({
        ...cur,
        water: [...cur.water.filter((w) => w.date !== date), ...(ml > 0 ? [{ date, ml }] : [])],
      });
    },
    [commitStore]
  );

  const flashNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  }, []);

  // Weekly Blueprint PDF: server aggregates the week + writes the debrief.
  const handleExportBlueprint = useCallback(async () => {
    try {
      const res = await fetch('/api/export-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: storeRef.current }),
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valoris-blueprint-${todayStr()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      flashNotice('Could not generate the weekly blueprint right now.');
    }
  }, [flashNotice]);

  // Photo meal logging: downscale, send to vision, then ask before logging.
  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setAnalysingPhoto(true);
      try {
        // Preferred path: decode + downscale to a small JPEG.
        const downscale = () =>
          new Promise<string>((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
              try {
                const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', 0.8));
              } catch (err) {
                reject(err);
              } finally {
                URL.revokeObjectURL(url);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error('undecodable'));
            };
            img.src = url;
          });
        // Fallback for formats the browser can't decode (e.g. HEIC from an
        // iPhone): send the original bytes — the vision model reads HEIC fine.
        const rawDataUrl = () =>
          new Promise<string>((resolve, reject) => {
            if (!file.type.startsWith('image/')) return reject(new Error('not an image'));
            if (file.size > 3_000_000) return reject(new Error('image too large to send un-compressed'));
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error('unreadable file'));
            r.readAsDataURL(file);
          });

        let image: string;
        try {
          image = await downscale();
        } catch {
          image = await rawDataUrl();
        }

        const res = await fetch('/api/vision-food', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, subscriptionTier: storeRef.current.profile.subscriptionTier }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          flashNotice('Photo meal logging is a Premium feature — upgrade to unlock it.');
        } else if (!res.ok) {
          flashNotice(`Photo analysis failed (${res.status})${data?.error ? `: ${data.error}` : ''}`);
        } else if (!data.found) {
          flashNotice(data.note || 'No food detected in that photo.');
        } else {
          setFoodConfirm(data);
        }
      } catch (err) {
        flashNotice(`That image could not be read${err instanceof Error && err.message ? ` (${err.message})` : ''}.`);
      } finally {
        setAnalysingPhoto(false);
      }
    },
    [flashNotice]
  );

  const handleLogDetectedMeal = useCallback(() => {
    const meal = foodConfirm;
    if (!meal) return;
    const cur = storeRef.current;
    const now = new Date();
    commitStore({
      ...cur,
      meals: [
        ...cur.meals,
        {
          date: todayStr(now),
          time: timeStr(now),
          name: meal.name,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
        },
      ],
    });
    setFoodConfirm(null);
    voice.speak(`Logged ${meal.name}, about ${meal.calories} calories.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodConfirm, commitStore]);

  useEffect(() => {
    const loaded = loadStore();
    storeRef.current = loaded;
    setStore(loaded);
    setHydrated(true);
  }, []);

  // Background insight worker: cron-style analysis of the last few days of
  // structured data. Runs shortly after launch, every 30 minutes while the
  // app is open, and whenever it returns to the foreground. Each insight kind
  // notifies at most once per day.
  useEffect(() => {
    if (!hydrated) return;

    const check = async () => {
      if (!storeRef.current.profile.onboarded) return;
      const candidate = detectInsights(storeRef.current).find((i) => !wasSeenToday(i.kind));
      if (!candidate) return;
      markSeen(candidate.kind);

      // Let VALORIS phrase the nudge; fall back to the deterministic message.
      let message = candidate.fallback;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch('/api/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            name: storeRef.current.profile.name,
            goal: storeRef.current.profile.goal,
            subscriptionTier: storeRef.current.profile.subscriptionTier,
            kind: candidate.kind,
            facts: candidate.facts,
          }),
        });
        clearTimeout(timer);
        const data = await res.json();
        if (res.status === 403) {
          setInsight({
            title: 'Premium',
            message: 'VALORIS spotted a pattern in your week. Proactive coaching insights are a Premium feature — upgrade to unlock them.',
          });
          return;
        }
        if (res.ok && typeof data.message === 'string' && data.message) message = data.message;
      } catch {
        // Offline or API unavailable — the deterministic message stands.
      }
      setInsight({ title: candidate.title, message });
    };

    const initial = setTimeout(check, 2500);
    const interval = setInterval(check, 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hydrated]);

  const handleOnboardingComplete = useCallback(
    (patch: Partial<JarvisStore>) => {
      const cur = storeRef.current;
      commitStore({
        ...cur,
        ...patch,
        profile: { ...cur.profile, ...(patch.profile ?? {}) },
        memories: [...cur.memories, ...(patch.memories ?? [])],
      });
    },
    [commitStore]
  );

  const handleProfileSave = useCallback(
    (patch: Partial<Profile>) => {
      const cur = storeRef.current;
      commitStore({ ...cur, profile: { ...cur.profile, ...patch } });
    },
    [commitStore]
  );

  const showCaption = useCallback((next: Caption, holdMs = 9000) => {
    if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    setCaption(next);
    captionTimeoutRef.current = setTimeout(() => setCaption(null), holdMs);
  }, []);

  const sendToJarvis = useCallback(
    async (text: string) => {
      const priorHistory = historyRef.current.slice(-16);
      setIsThinking(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: priorHistory, store: storeRef.current }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Request failed');

        if (data.store) commitStore(data.store);
        historyRef.current = [...priorHistory, { role: 'user', text }, { role: 'model', text: data.reply }];
        setIsThinking(false);
        showCaption({ text: data.reply, role: 'jarvis' }, Math.max(6000, data.reply.length * 90));
        voice.speak(data.reply);
      } catch (err) {
        console.error('VALORIS chat failed:', err);
        setIsThinking(false);
        const fallback = 'Apologies — I hit a snag processing that. Give me a moment and try again.';
        showCaption({ text: fallback, role: 'jarvis' });
        voice.speak(fallback);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showCaption, commitStore]
  );

  const handleUserMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      showCaption({ text, role: 'user' }, 4000);
      sendToJarvis(text.trim());
    },
    [sendToJarvis, showCaption]
  );

  const voice = useVoice({ onFinalTranscript: handleUserMessage });

  useEffect(
    () => () => {
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    },
    []
  );

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          commitStore(parseImportedStore(String(reader.result)));
          flashNotice('Backup restored.');
        } catch {
          flashNotice('That file could not be read as a VALORIS backup.');
        }
      };
      reader.readAsText(file);
    },
    [commitStore, flashNotice]
  );

  const statusLabel = isThinking
    ? 'PROCESSING'
    : voice.state === 'listening'
    ? 'LISTENING'
    : voice.state === 'speaking'
    ? 'SPEAKING'
    : 'READY';

  const statusActive = isThinking || voice.state === 'listening' || voice.state === 'speaking';

  const handleMicToggle = () => {
    if (voice.state === 'listening') return voice.stopListening();
    if (voice.state === 'speaking') return voice.cancelSpeech();
    if (isThinking) return;
    if (!voice.sttSupported) {
      flashNotice('Voice input is not supported in this browser — use the text box.');
      return;
    }
    voice.startListening();
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isThinking) return;
    setInputValue('');
    handleUserMessage(text);
  };

  const liveCaptionText = voice.state === 'listening' ? voice.interimTranscript || 'Listening…' : caption?.text ?? null;
  const liveCaptionRole = voice.state === 'listening' ? 'user' : caption?.role ?? 'user';

  const utilityBtn =
    'flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-black transition-colors hover:bg-red-600 hover:border-red-600 hover:text-white';

  // Branded boot animation overlays everything, then lifts away.
  const splashEl = showSplash ? <SplashIntro onDone={dismissSplash} /> : null;

  // Avoid a flash of onboarding before localStorage has loaded.
  if (!hydrated)
    return (
      <>
        {splashEl}
        <div className="h-[100dvh] w-full bg-white" />
      </>
    );

  // First run — require a profile before the app is accessible.
  if (!store.profile.onboarded)
    return (
      <>
        {splashEl}
        <Onboarding onComplete={handleOnboardingComplete} />
      </>
    );

  const activeNav = NAV.find((n) => n.id === view)!;

  const utilities = (
    <>
      <button className={utilityBtn} onClick={() => setProfileOpen(true)} title="Edit profile" aria-label="Edit profile">
        <UserRound className="h-4 w-4" />
      </button>
      <button className={utilityBtn} onClick={handleExportBlueprint} title="Export weekly blueprint (PDF)" aria-label="Export weekly blueprint">
        <FileText className="h-4 w-4" />
      </button>
      <button className={utilityBtn} onClick={() => fileInputRef.current?.click()} title="Restore backup" aria-label="Import backup">
        <Upload className="h-4 w-4" />
      </button>
      <button className={utilityBtn} onClick={() => downloadStore(storeRef.current)} title="Download backup" aria-label="Download backup">
        <Download className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-white font-sans text-black">
      {splashEl}
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r-2 border-black bg-white lg:flex">
        <div className="border-b-2 border-black px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-red-600" />
            <span className="font-display text-xl uppercase tracking-[0.2em] text-black">Valoris</span>
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Performance System</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex w-full items-center gap-3 border-l-4 px-5 py-3.5 text-left transition-colors ${
                  active ? 'border-red-600 bg-neutral-50 text-black' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-black'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-red-600' : ''}`} />
                <span className="font-display text-xs uppercase tracking-[0.18em]">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t-2 border-black p-4">
          <div className="mb-3 flex items-center gap-2">{utilities}</div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            <span className={`h-2 w-2 ${statusActive ? 'animate-pulse bg-red-600' : 'bg-neutral-300'}`} />
            {statusLabel}
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-black bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-red-600" />
          <span className="font-display text-base uppercase tracking-[0.2em] text-black">Valoris</span>
        </div>
        <div className="flex items-center gap-1.5">{utilities}</div>
      </header>

      {/* Main content */}
      <main className="px-4 pb-64 pt-5 lg:ml-60 lg:px-8 lg:pb-40 lg:pt-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="font-display text-2xl uppercase tracking-[0.08em] text-black lg:text-3xl">{activeNav.label}</h1>
            <span className="hidden border-2 border-black px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-black sm:block">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div key={view} className="view-in">
            {view === 'dashboard' && <Dashboard store={store} />}
            {view === 'plan' && (
              <PlanPage
                store={store}
                onLogSet={handleQuickLogSet}
                onUnlogSet={handleUnlogSet}
                onDeleteSet={handleDeleteSet}
                onCompleteWorkout={handleCompleteWorkout}
                onEditProfile={() => setProfileOpen(true)}
                onSavePlanDay={handleSavePlanDay}
                onRemovePlanDay={handleRemovePlanDay}
              />
            )}
            {view === 'diet' && (
              <DietPage store={store} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} onSetWater={handleSetWater} />
            )}
          </div>
        </div>
      </main>

      {/* Coach bar — fixed above the bottom nav on mobile, bottom of content on desktop */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t-2 border-black bg-white lg:bottom-0 lg:left-60">
        {/* Transient overlays float above the bar so nothing shifts */}
        <div className="pointer-events-none absolute inset-x-0 bottom-full flex flex-col items-center gap-2 px-4 pb-2">
          {foodConfirm && (
            <div className="pointer-events-auto w-full max-w-xl border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
              <div className="font-display text-[10px] uppercase tracking-[0.2em] text-red-600">Vision · Meal Detected</div>
              <div className="mt-1 text-sm font-medium text-black">
                I detected <span className="font-bold">{foodConfirm.name}</span> (~{foodConfirm.calories} kcal
                <span className="text-neutral-500">
                  {' '}
                  · P{foodConfirm.proteinG} C{foodConfirm.carbsG} F{foodConfirm.fatG}
                </span>
                ). Log this?
              </div>
              {foodConfirm.note && <div className="mt-1 text-[11px] font-medium text-neutral-500">{foodConfirm.note}</div>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleLogDetectedMeal}
                  className="bg-red-600 px-5 py-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700"
                >
                  Log it
                </button>
                <button
                  onClick={() => setFoodConfirm(null)}
                  className="border-2 border-black px-5 py-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {insight && (
            <div className="pointer-events-auto flex w-full max-w-xl items-start gap-2.5 border-2 border-black bg-black p-3.5 text-white shadow-[6px_6px_0_0_rgba(220,38,38,0.35)]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="min-w-0">
                <div className="font-display text-[10px] uppercase tracking-[0.2em] text-red-500">Insight · {insight.title}</div>
                <div className="mt-0.5 text-xs font-medium leading-relaxed text-neutral-100">{insight.message}</div>
              </div>
              <button onClick={() => setInsight(null)} className="ml-1 shrink-0 text-neutral-400 transition-colors hover:text-white" aria-label="Dismiss insight">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {undo && (
            <div className="pointer-events-auto flex items-center gap-3 border-2 border-black bg-white px-4 py-1.5 shadow-[4px_4px_0_0_rgba(0,0,0,0.12)]">
              <span className="text-xs font-bold text-black">{undo.label}</span>
              <button onClick={handleUndo} className="font-display text-[11px] uppercase tracking-[0.15em] text-red-600 transition-colors hover:text-red-700">
                Undo
              </button>
            </div>
          )}
          {liveCaptionText && (
            <div className="pointer-events-auto w-full max-w-xl border-2 border-black bg-white px-4 py-2 text-center shadow-[4px_4px_0_0_rgba(0,0,0,0.12)]">
              <span className={`text-sm font-medium ${liveCaptionRole === 'jarvis' ? 'text-black' : 'text-neutral-500'}`}>
                {liveCaptionRole === 'jarvis' && <Volume2 className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-0.5 text-red-600" />}
                {liveCaptionText}
              </span>
            </div>
          )}
          {notice && (
            <div className="pointer-events-auto max-w-xl border-2 border-red-600 bg-white px-4 py-1.5 text-center text-xs font-bold text-red-600">{notice}</div>
          )}
        </div>

        <form onSubmit={handleSubmitText} className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2.5 lg:px-8">
          <div className="flex h-10 flex-1 items-center border-2 border-black bg-white px-3 focus-within:border-red-600">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask VALORIS — log food, sets, anything…"
              className="w-full bg-transparent text-sm font-medium text-black placeholder:text-neutral-400 focus:outline-none"
            />
            <button type="submit" disabled={!inputValue.trim() || isThinking} className="text-red-600 transition-opacity disabled:opacity-30" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={analysingPhoto}
            className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 transition-colors ${
              analysingPhoto ? 'animate-pulse border-red-600 bg-red-50 text-red-600' : 'border-black bg-white text-black hover:border-red-600 hover:text-red-600'
            }`}
            aria-label="Log a meal from a photo"
            title="Snap or upload a meal photo"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleMicToggle}
            className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 transition-colors ${
              voice.state === 'listening'
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-black bg-white text-black hover:border-red-600 hover:text-red-600'
            }`}
            aria-label="Toggle microphone"
          >
            {voice.state === 'listening' ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
        </form>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[64px] grid-cols-3 border-t-2 border-black bg-white lg:hidden" aria-label="Primary">
        {NAV.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="relative flex flex-col items-center justify-center gap-1"
              aria-current={active ? 'page' : undefined}
            >
              {active && <span className="absolute inset-x-4 top-0 h-1 bg-red-600" />}
              <item.icon className={`h-5 w-5 ${active ? 'text-red-600' : 'text-neutral-400'}`} />
              <span className={`font-display text-[9px] uppercase tracking-[0.12em] ${active ? 'text-black' : 'text-neutral-400'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {profileOpen && (
        <ProfilePanel
          profile={store.profile}
          memories={store.memories}
          onSave={handleProfileSave}
          onAddMemory={handleAddMemory}
          onRemoveMemory={handleRemoveMemory}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
