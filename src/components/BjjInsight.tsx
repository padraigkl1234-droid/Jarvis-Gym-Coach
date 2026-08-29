'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { type JarvisStore, todayStr } from '@/lib/store';
import { buildCategoryBreakdown, buildTechniqueStats, generateBjjSuggestions } from '@/lib/bjj';

const CACHE_KEY = 'valoris.bjjInsight.v1';

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
 * BJJ tab card: one short AI coaching message a day, grounded in the
 * athlete's actual logged technique stats. The rule-based suggestions in
 * lib/bjj.ts remain the primary "brain" — this just adds a narrative layer.
 * Cached per day so it doesn't re-fire on every app open.
 */
export function BjjInsight({ store }: { store: JarvisStore }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = readCache();
    if (cached) setMessage(cached.message);
  }, []);

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = store.profile;
      const logs = store.bjjLogs;
      const topTechniques = buildTechniqueStats(logs).slice(0, 8);
      const categoryBreakdown = buildCategoryBreakdown(logs);
      const ruleSuggestions = generateBjjSuggestions(logs).map((s) => s.title);

      const res = await fetch('/api/bjj-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.name,
          experience: p.experience,
          topTechniques,
          categoryBreakdown,
          ruleSuggestions,
        }),
      });

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
        <span className="text-[12px] font-bold uppercase tracking-wide text-clay">BJJ coach insight</span>
      </div>

      {message ? (
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
            A short, personalized note from your BJJ coach — built from what you've actually logged.
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
