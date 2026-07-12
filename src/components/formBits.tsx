'use client';

import React from 'react';

/** Shared form primitives used by the onboarding screen and the profile editor. */

export const inputClass =
  'w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium text-black placeholder:text-neutral-400 focus:border-red-600 focus:outline-none';

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
        active
          ? 'border-red-600 bg-red-600 text-white'
          : 'border-black bg-white text-black hover:border-red-600 hover:text-red-600'
      }`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-display text-[10px] uppercase tracking-[0.25em] text-neutral-500">{label}</div>
      {children}
    </div>
  );
}

export const GOALS = ['Build muscle', 'Lose fat', 'Get stronger', 'Improve endurance', 'General fitness'];
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
export const DAYS = [2, 3, 4, 5, 6];
export const EQUIPMENT = ['Full gym', 'Barbell', 'Dumbbells', 'Kettlebells', 'Resistance bands', 'Bodyweight only'];
export const SEXES = ['Male', 'Female', 'Other'];
