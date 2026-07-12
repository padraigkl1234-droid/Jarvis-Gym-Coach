'use client';

import { useEffect, useState } from 'react';

const LETTERS = 'VALORIS'.split('');

/**
 * Branded boot screen: the red mark stamps in, the wordmark rises letter by
 * letter from a baseline mask, a rule sweeps under it, and the whole sheet
 * lifts away to reveal the app. Pure CSS animations; JS only times the exit.
 */
export function SplashIntro({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exit = setTimeout(() => setExiting(true), 1750);
    const done = setTimeout(onDone, 2320);
    return () => {
      clearTimeout(exit);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white ${exiting ? 'splash-exit' : ''}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="splash-square h-6 w-6 bg-red-600 sm:h-8 sm:w-8" />
        <span className="flex overflow-hidden pb-1">
          {LETTERS.map((l, i) => (
            <span
              key={i}
              className="splash-letter font-display text-5xl uppercase leading-none tracking-[0.16em] text-black sm:text-6xl"
              style={{ animationDelay: `${200 + i * 55}ms` }}
            >
              {l}
            </span>
          ))}
        </span>
      </div>
      <div className="splash-rule mt-4 h-[3px] w-48 bg-black sm:w-64" />
      <div className="splash-sub mt-3 font-display text-[10px] uppercase tracking-[0.45em] text-neutral-400">
        Performance System
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-neutral-100">
        <div className="splash-progress h-full w-full bg-red-600" />
      </div>
    </div>
  );
}
