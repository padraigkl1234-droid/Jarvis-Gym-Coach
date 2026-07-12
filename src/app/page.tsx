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
  Trash2,
} from 'lucide-react';
import { Onboarding } from '@/components/Onboarding';
import { ProfilePanel } from '@/components/ProfilePanel';
import { Dashboard } from '@/components/Dashboard';
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
  type SetEntry,
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---------- Placeholder views (full builds land in the next step) ---------- */

function PlaceholderCard({ title, note }: { title: string; note: string }) {
  return (
    <div className="border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
      <div className="font-display text-sm uppercase tracking-[0.25em] text-neutral-400">{title}</div>
      <div className="mx-auto mt-2 h-1 w-10 bg-red-600" />
      <p className="mt-3 text-xs font-medium text-neutral-500">{note}</p>
    </div>
  );
}

function PlanView({ store, onDeleteSet }: { store: JarvisStore; onDeleteSet: (s: SetEntry) => void }) {
  const weekday = new Date().getDay();
  const today = todayStr();
  const planToday = store.plan.find((p) => p.weekday === weekday);
  const todaySets = store.sets.filter((s) => s.date === today);

  return (
    <div className="space-y-6">
      <section className="border-2 border-black bg-white">
        <div className="border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Today · {WEEKDAYS[weekday]}</h2>
        </div>
        <div className="p-4">
          {planToday && planToday.exercises.length > 0 ? (
            <>
              <div className="font-display text-lg uppercase tracking-wide text-black">{planToday.label}</div>
              {planToday.focus && <div className="mt-0.5 text-xs font-medium text-neutral-500">{planToday.focus}</div>}
              <ul className="mt-3 divide-y divide-neutral-200 border-t border-neutral-200">
                {planToday.exercises.map((ex, i) => {
                  const done = todaySets.some((s) => s.exercise.toLowerCase() === ex.name.toLowerCase());
                  return (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <span className={`h-2.5 w-2.5 shrink-0 ${done ? 'bg-red-600' : 'border-2 border-neutral-300'}`} />
                      <span className={`flex-1 text-sm font-bold ${done ? 'text-neutral-400 line-through' : 'text-black'}`}>{ex.name}</span>
                      {(ex.sets || ex.reps) && (
                        <span className="font-display text-xs tabular-nums text-neutral-500">
                          {ex.sets ?? ''}
                          {ex.sets && ex.reps ? '×' : ''}
                          {ex.reps ?? ''}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm font-medium text-neutral-500">
              {store.plan.length === 0 ? 'No plan yet — ask VALORIS to build one.' : 'Rest day. Recover hard.'}
            </p>
          )}
        </div>
      </section>

      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Sets Logged Today</h2>
          <span className="font-display text-xs tabular-nums text-red-600">{todaySets.length}</span>
        </div>
        {todaySets.length > 0 ? (
          <ul className="divide-y divide-neutral-200">
            {todaySets.map((s, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-display text-[11px] tabular-nums text-neutral-400">{s.time}</span>
                <span className="flex-1 text-sm font-bold text-black">{s.exercise}</span>
                <span className="font-display text-xs tabular-nums text-neutral-600">
                  {s.reps ?? '–'}×{s.weightKg ?? '–'}kg{s.rpe ? ` @${s.rpe}` : ''}
                </span>
                <button onClick={() => onDeleteSet(s)} className="text-neutral-300 transition-colors hover:text-red-600" aria-label={`Delete ${s.exercise} set`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm font-medium text-neutral-500">Nothing logged yet — tell VALORIS as you lift.</p>
        )}
      </section>

      <PlaceholderCard title="Full Weekly Planner" note="Editable week grid, per-day sessions, and exercise progressions land here next." />
    </div>
  );
}

function DietView({ store, onDeleteMeal }: { store: JarvisStore; onDeleteMeal: (m: MealEntry) => void }) {
  const today = todayStr();
  const meals = store.meals.filter((m) => m.date === today);
  const water = store.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
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
  const rows: { label: string; value: number; target: number; unit: string }[] = [
    { label: 'Calories', value: Math.round(totals.calories), target: p.calorieTarget, unit: '' },
    { label: 'Protein', value: Math.round(totals.proteinG), target: p.proteinTargetG, unit: 'g' },
    { label: 'Carbs', value: Math.round(totals.carbsG), target: p.carbsTargetG, unit: 'g' },
    { label: 'Fat', value: Math.round(totals.fatG), target: p.fatTargetG, unit: 'g' },
    { label: 'Water', value: water, target: p.hydrationTargetMl, unit: 'ml' },
  ];

  return (
    <div className="space-y-6">
      <section className="border-2 border-black bg-white">
        <div className="border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Today&apos;s Intake</h2>
        </div>
        <div className="space-y-3 p-4">
          {rows.map((r) => {
            const pct = r.target > 0 ? Math.min(100, Math.round((r.value / r.target) * 100)) : 0;
            return (
              <div key={r.label}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-black">{r.label}</span>
                  <span className="font-display text-xs tabular-nums text-neutral-600">
                    {r.value}
                    <span className="text-neutral-400">
                      {' '}
                      / {r.target}
                      {r.unit}
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full border border-black bg-white">
                  <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-black">Meals</h2>
          <span className="font-display text-xs tabular-nums text-red-600">{meals.length}</span>
        </div>
        {meals.length > 0 ? (
          <ul className="divide-y divide-neutral-200">
            {meals.map((m, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-display text-[11px] tabular-nums text-neutral-400">{m.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-black">{m.name}</span>
                  <span className="block text-[11px] font-medium text-neutral-500">
                    {Math.round(m.calories)} kcal · P{Math.round(m.proteinG)} C{Math.round(m.carbsG)} F{Math.round(m.fatG)}
                  </span>
                </span>
                <button onClick={() => onDeleteMeal(m)} className="text-neutral-300 transition-colors hover:text-red-600" aria-label={`Delete ${m.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm font-medium text-neutral-500">No meals logged — tell VALORIS what you ate, or snap a photo.</p>
        )}
      </section>

      <PlaceholderCard title="Full Diet Command" note="Meal history, macro analytics, and food templates land here next." />
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function ValorisPage() {
  const [store, setStore] = useState<JarvisStore>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);
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

  // Avoid a flash of onboarding before localStorage has loaded.
  if (!hydrated) return <div className="h-[100dvh] w-full bg-white" />;

  // First run — require a profile before the app is accessible.
  if (!store.profile.onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

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
            {view === 'plan' && <PlanView store={store} onDeleteSet={handleDeleteSet} />}
            {view === 'diet' && <DietView store={store} onDeleteMeal={handleDeleteMeal} />}
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

      {profileOpen && <ProfilePanel profile={store.profile} onSave={handleProfileSave} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
