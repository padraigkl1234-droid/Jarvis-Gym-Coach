'use client';

import React, { useMemo } from 'react';
import { ArrowLeft, Award, Dumbbell, Flame, Footprints, Ruler, Trophy as TrophyIcon, Utensils } from 'lucide-react';
import { type JarvisStore } from '@/lib/store';
import { getTrophies, TROPHY_CATEGORY_LABEL, type Trophy, type TrophyCategory } from '@/lib/trophies';
import { Bar, Card, Eyebrow } from '@/components/ui';

const CATEGORY_ORDER: TrophyCategory[] = ['cardio', 'strength', 'consistency', 'nutrition', 'body'];

const CATEGORY_ICON: Record<TrophyCategory, React.ComponentType<{ className?: string; size?: number }>> = {
  cardio: Footprints,
  strength: Dumbbell,
  consistency: Flame,
  nutrition: Utensils,
  body: Ruler,
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(n: number): string {
  return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function TrophyCard({ trophy }: { trophy: Trophy }) {
  const Icon = CATEGORY_ICON[trophy.category];
  const earned = trophy.earnedDate != null;
  const pct = (Math.min(trophy.current, trophy.target) / trophy.target) * 100;
  return (
    <Card className={`rounded-2xl p-4 ${earned ? '' : 'opacity-90'}`}>
      <div className="flex items-start gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            earned ? 'bg-clay text-white' : 'bg-track text-faintest'
          }`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[14px] font-bold ${earned ? 'text-ink' : 'text-muted'}`}>{trophy.label}</span>
            {earned && <TrophyIcon size={13} className="shrink-0 text-clay" />}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-faint">{trophy.description}</p>
          {earned ? (
            <div className="mt-2 text-[11px] font-bold text-sage">Earned {formatDate(trophy.earnedDate!)}</div>
          ) : (
            <div className="mt-2.5">
              <Bar pct={pct} fill="bg-clay" h="h-[5px]" />
              <div className="mt-1.5 text-[11px] font-semibold text-faint">
                {formatAmount(trophy.current)} / {formatAmount(trophy.target)} {trophy.unit}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function TrophiesScreen({ store, onClose }: { store: JarvisStore; onClose: () => void }) {
  const trophies = useMemo(() => getTrophies(store), [store]);
  const earnedCount = trophies.filter((t) => t.earnedDate != null).length;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-bold text-faint">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Trophy cabinet</Eyebrow>
        <h1 className="mt-1 font-display text-[32px] text-ink">Trophies</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Earned automatically from what you log — nothing extra to do. Vacant ones show how close you are.
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-ink p-[18px]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay text-white">
            <Award size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[24px] text-white">
              {earnedCount} / {trophies.length}
            </span>
            <span className="block text-[12px] text-ondark-sub">trophies earned</span>
          </span>
        </div>

        {CATEGORY_ORDER.map((cat) => {
          const items = trophies.filter((t) => t.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mt-8">
              <Eyebrow>{TROPHY_CATEGORY_LABEL[cat]}</Eyebrow>
              <div className="mt-2 space-y-2.5">
                {items.map((t) => (
                  <TrophyCard key={t.id} trophy={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
