'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, Download, Upload, PanelLeftOpen, PanelRightOpen, UserRound, BarChart3, Sparkles, X, FileText, ImagePlus } from 'lucide-react';
import { Orb, type OrbState } from '@/components/Orb';
import { Clock } from '@/components/Clock';
import { TrainingHud } from '@/components/TrainingHud';
import { NutritionHud } from '@/components/NutritionHud';
import { Onboarding } from '@/components/Onboarding';
import { ProfilePanel } from '@/components/ProfilePanel';
import { ProgressPanel } from '@/components/ProgressPanel';
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

export default function JarvisPage() {
  const [store, setStore] = useState<JarvisStore>(DEFAULT_STORE);
  const [hydrated, setHydrated] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingAmp, setThinkingAmp] = useState(0);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
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
  const thinkingRafRef = useRef<number | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Photo meal logging: downscale, send to vision, then ask before logging.
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // console is open, and whenever the app returns to the foreground. Each
  // insight kind notifies at most once per day.
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
        console.error('JARVIS chat failed:', err);
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

  // Keep the orb alive with a synthetic pulse while waiting on the model.
  useEffect(() => {
    if (!isThinking) {
      if (thinkingRafRef.current) cancelAnimationFrame(thinkingRafRef.current);
      thinkingRafRef.current = null;
      setThinkingAmp(0);
      return;
    }
    const start = performance.now();
    const loop = (t: number) => {
      setThinkingAmp(0.22 + 0.18 * Math.sin(((t - start) / 1000) * 5));
      thinkingRafRef.current = requestAnimationFrame(loop);
    };
    thinkingRafRef.current = requestAnimationFrame(loop);
    return () => {
      if (thinkingRafRef.current) cancelAnimationFrame(thinkingRafRef.current);
    };
  }, [isThinking]);

  useEffect(() => () => {
    if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
  }, []);

  const flashNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  }, []);

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

  const orbState: OrbState =
    voice.state === 'speaking' ? 'speaking' : voice.state === 'listening' || isThinking ? 'listening' : 'idle';

  const orbAmplitude =
    voice.state === 'listening' || voice.state === 'speaking' ? voice.amplitude : isThinking ? thinkingAmp : 0;

  const statusLabel = isThinking
    ? 'PROCESSING'
    : voice.state === 'listening'
    ? 'LISTENING'
    : voice.state === 'speaking'
    ? 'SPEAKING'
    : 'STANDBY';

  const statusColor = isThinking
    ? 'bg-violet-400 text-violet-300'
    : voice.state === 'listening'
    ? 'bg-sky-400 text-sky-300'
    : voice.state === 'speaking'
    ? 'bg-amber-400 text-amber-300'
    : 'bg-emerald-400 text-emerald-300';

  const handleMicToggle = () => {
    if (voice.state === 'listening') return voice.stopListening();
    if (voice.state === 'speaking') return voice.cancelSpeech();
    if (isThinking) return;
    if (!voice.sttSupported) {
      flashNotice('Voice input is not supported in this browser — use the text box below.');
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

  const liveCaptionText =
    voice.state === 'listening' ? voice.interimTranscript || 'Listening…' : caption?.text ?? null;
  const liveCaptionRole = voice.state === 'listening' ? 'user' : caption?.role ?? 'user';

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/60 backdrop-blur-md transition-colors hover:border-sky-400/40 hover:text-sky-300';

  // Avoid a flash of onboarding before localStorage has loaded.
  if (!hydrated) return <div className="h-[100dvh] w-full bg-black" />;

  // First run — require a profile before the console is accessible.
  if (!store.profile.onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black font-sans">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden hud-grid-3d">
        <div className="hud-grid hud-grid-plane" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_62%)]" />
      {/* Deep nebula glows in the far corners */}
      <div className="hud-nebula-indigo pointer-events-none absolute -left-52 -top-52 h-[34rem] w-[34rem] rounded-full blur-3xl" />
      <div className="hud-nebula-teal pointer-events-none absolute -bottom-52 -right-52 h-[34rem] w-[34rem] rounded-full blur-3xl" />
      <div className="hud-nebula-teal pointer-events-none absolute -bottom-44 -left-44 h-[26rem] w-[26rem] rounded-full blur-3xl" />
      <div className="hud-nebula-indigo pointer-events-none absolute -right-44 -top-44 h-[26rem] w-[26rem] rounded-full blur-3xl" />
      <div className="pointer-events-none absolute inset-0 z-40 hud-scanlines opacity-60" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3">
        <button className={`${iconBtn} xl:hidden`} onClick={() => setLeftOpen((v) => !v)} aria-label="Toggle training panel">
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <button className={iconBtn} onClick={() => setProfileOpen(true)} title="Edit profile" aria-label="Edit profile">
            <UserRound className="h-4 w-4" />
          </button>
          <button className={iconBtn} onClick={() => setProgressOpen(true)} title="Progress & stats" aria-label="Progress and stats">
            <BarChart3 className="h-4 w-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
          <button className={iconBtn} onClick={() => fileInputRef.current?.click()} title="Restore backup" aria-label="Import backup">
            <Upload className="h-4 w-4" />
          </button>
          <button className={iconBtn} onClick={() => downloadStore(storeRef.current)} title="Download backup" aria-label="Download backup">
            <Download className="h-4 w-4" />
          </button>
          <button className={iconBtn} onClick={handleExportBlueprint} title="Export weekly blueprint (PDF)" aria-label="Export weekly blueprint">
            <FileText className="h-4 w-4" />
          </button>
          <button className={`${iconBtn} xl:hidden`} onClick={() => setRightOpen((v) => !v)} aria-label="Toggle nutrition panel">
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
      </div>

      {profileOpen && (
        <ProfilePanel profile={store.profile} onSave={handleProfileSave} onClose={() => setProfileOpen(false)} />
      )}

      {progressOpen && <ProgressPanel store={store} onClose={() => setProgressOpen(false)} />}

      {/* Left HUD */}
      <aside
        className={`fixed bottom-4 left-3 top-16 z-20 w-[260px] transition-transform duration-300 xl:translate-x-0 ${
          leftOpen ? 'translate-x-0' : '-translate-x-[130%]'
        }`}
      >
        <TrainingHud store={store} onClose={() => setLeftOpen(false)} onDeleteSet={handleDeleteSet} />
      </aside>

      {/* Right HUD */}
      <aside
        className={`fixed bottom-4 right-3 top-16 z-20 w-[260px] transition-transform duration-300 xl:translate-x-0 ${
          rightOpen ? 'translate-x-0' : 'translate-x-[130%]'
        }`}
      >
        <NutritionHud store={store} onClose={() => setRightOpen(false)} onDeleteMeal={handleDeleteMeal} />
      </aside>

      {/* Center column */}
      <div className="relative z-10 flex h-full flex-col items-center">
        {/* Orb — centred in the upper space */}
        <div className="flex flex-1 items-center justify-center px-4">
          <button
            type="button"
            onClick={() => {
              setPulse((p) => p + 1);
              handleMicToggle();
            }}
            aria-label={voice.state === 'listening' ? 'Stop listening' : 'Activate VALORIS'}
            className="hud-flicker relative flex items-center justify-center rounded-full focus:outline-none"
            style={{ width: 280, height: 280 }}
          >
            {/* Greeny-blue ripple confirming a tap */}
            {pulse > 0 && (
              <span
                key={pulse}
                className="orb-click-glow pointer-events-none absolute inset-0 rounded-full"
              />
            )}
            {/* Breathing core glow — gentle organic pulse while in standby */}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className={`h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_66%)] blur-2xl ${
                  orbState === 'idle' ? 'hud-breathe' : 'opacity-70'
                }`}
              />
            </span>
            {/* Layered glass radar rings, counter-rotating behind the core */}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="hud-ring hud-ring-1" />
              <span className="hud-ring hud-ring-2" />
              <span className="hud-ring hud-ring-3" />
            </span>
            <span className="relative z-10">
              <Orb state={orbState} amplitude={orbAmplitude} size={280} />
            </span>
          </button>
        </div>

        {/* Clock + status — dropped toward the bottom of the screen */}
        <div className="flex flex-col items-center gap-3 px-4">
          <Clock />
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md">
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${statusColor.split(' ')[0]}`} />
            <span className={`font-display text-[11px] font-semibold tracking-[0.3em] ${statusColor.split(' ')[1]}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Input row. Transient elements (caption, notice, undo) are floated
            above it as overlays so accessing the mic never shifts the console. */}
        <div className="relative flex w-full flex-col items-center px-4 pb-6 pt-6">
          <div className="pointer-events-none absolute inset-x-0 bottom-full flex flex-col items-center gap-2 px-4 pb-3">
            {foodConfirm && (
              <div className="pointer-events-auto flex max-w-xl flex-col gap-2 rounded-lg border border-amber-400/35 bg-black/85 px-4 py-3 backdrop-blur-md shadow-[0_0_24px_rgba(251,191,36,0.12)]">
                <div className="font-display text-[9px] uppercase tracking-[0.25em] text-amber-300/90">
                  Vision · Meal detected
                </div>
                <div className="text-sm text-white/90">
                  I detected <span className="font-medium text-amber-200">{foodConfirm.name}</span> (~{foodConfirm.calories} kcal
                  <span className="text-white/55"> · P{foodConfirm.proteinG} C{foodConfirm.carbsG} F{foodConfirm.fatG}</span>). Log this?
                </div>
                {foodConfirm.note && <div className="text-[11px] text-white/45">{foodConfirm.note}</div>}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={handleLogDetectedMeal}
                    className="rounded-full border border-amber-400/60 bg-amber-400/15 px-4 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-amber-200 transition-colors hover:bg-amber-400/25"
                  >
                    Log it
                  </button>
                  <button
                    onClick={() => setFoodConfirm(null)}
                    className="rounded-full border border-white/15 px-4 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white/80"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {insight && (
              <div className="pointer-events-auto flex max-w-xl items-start gap-2.5 rounded-lg border border-teal-400/30 bg-black/80 px-4 py-2.5 backdrop-blur-md shadow-[0_0_24px_rgba(45,212,191,0.15)]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />
                <div className="min-w-0">
                  <div className="font-display text-[9px] uppercase tracking-[0.25em] text-teal-300/90">
                    Insight · {insight.title}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-white/85">{insight.message}</div>
                </div>
                <button
                  onClick={() => setInsight(null)}
                  className="ml-1 shrink-0 text-white/35 transition-colors hover:text-white/80"
                  aria-label="Dismiss insight"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {undo && (
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 backdrop-blur-md">
                <span className="text-xs text-white/70">{undo.label}</span>
                <button
                  onClick={handleUndo}
                  className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-300 transition-colors hover:text-emerald-200"
                >
                  Undo
                </button>
              </div>
            )}
            {liveCaptionText && (
              <div
                className={`max-w-xl text-center text-sm transition-opacity duration-300 ${
                  liveCaptionRole === 'jarvis' ? 'text-sky-200' : 'text-white/70'
                }`}
              >
                {liveCaptionRole === 'jarvis' && <Volume2 className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-0.5" />}
                {liveCaptionText}
              </div>
            )}
            {notice && <div className="max-w-xl text-center text-xs text-amber-300">{notice}</div>}
          </div>

          <form onSubmit={handleSubmitText} className="flex w-full max-w-xl items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-sky-400/20 bg-white/[0.03] px-4 py-2.5 backdrop-blur-md focus-within:border-sky-400/50">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask VALORIS…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isThinking}
                className="text-sky-300 transition-opacity disabled:opacity-30"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={analysingPhoto}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                analysingPhoto
                  ? 'animate-pulse border-amber-400/60 bg-amber-400/10 text-amber-300'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-amber-300'
              }`}
              aria-label="Log a meal from a photo"
              title="Snap or upload a meal photo"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleMicToggle}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                voice.state === 'listening'
                  ? 'border-sky-400/70 bg-sky-400/10 text-sky-300'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-sky-300'
              }`}
              aria-label="Toggle microphone"
            >
              {voice.state === 'listening' ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
