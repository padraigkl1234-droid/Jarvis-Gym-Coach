'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { type JarvisStore, todayStr } from '@/lib/store';
import { buildStats } from '@/lib/stats';

const CACHE_KEY = 'valoris.coachInsight.v1';

interface Cached {
  date: string;
  message: string;
}

function readCache(): Cached | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.date === todayStr() ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(message: string) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), message }));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Home-screen card that actually uses goal / experience / equipment / coach
 * notes for something: one short AI coaching message a day, grounded in
 * those fields plus a compact 7-day activity summary. Cached per day so it
 * doesn't re-fire on every app open; Premium-gated same as the rest of the
 * AI features (server 403s otherwise).
 */
export function CoachInsight({ store }: { store: JarvisStore }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const cached = readCache();
    if (cached) setMessage(cached.message);
  }, []);

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);
    setLocked(false);
    try {
      const p = store.profile;
      const stats = buildStats(store, { days: 7 });
      const notes = [...store.memories]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10)
        .map((m) => m.note);

      const res = await fetch('/api/coach-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionTier: p.subscriptionTier,
          name: p.name,
          goal: p.goal,
          experience: p.experience,
          equipment: p.equipment,
          notes,
          summary: stats.summary,
        }),
      });

      if (res.status === 403) {
        setLocked(true);
        return;
      }
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      if (!data.message) throw new Error('empty message');
      setMessage(data.message);
      writeCache(data.message);
    } catch {
      setError("Couldn't reach your coach right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 rounded-[20px] border border-clay-border bg-clay-soft p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-clay" />
        <span className="text-[12px] font-bold uppercase tracking-wide text-clay">Coach insight</span>
      </div>

      {locked ? (
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
          Personalized coaching insights are a Premium feature.
        </p>
      ) : message ? (
        <>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink">{message}</p>
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-clay disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            A short, personalized note from your coach — built from your goal, equipment, and coach notes.
          </p>
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="mt-3 rounded-full bg-clay px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-clay-dark disabled:opacity-60"
          >
            {loading ? 'Thinking…' : "Get today's insight"}
          </button>
          {error && <p className="mt-2 text-[12px] font-semibold text-clay">{error}</p>}
        </>
      )}
    </div>
  );
}
