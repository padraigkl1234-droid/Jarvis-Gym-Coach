'use client';

import React, { useEffect } from 'react';

/* Calm Cream shared primitives. */

export function Eyebrow({ children, clay = false, className = '' }: { children: React.ReactNode; clay?: boolean; className?: string }) {
  return <div className={`eyebrow ${clay ? '!text-clay' : ''} ${className}`}>{children}</div>;
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const cls = `rounded-2xl border border-line bg-card ${className}`;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`block w-full text-left ${cls}`}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

/** Horizontal progress bar. Heights and colors come from the caller. */
export function Bar({
  pct,
  fill,
  track = 'bg-track',
  h = 'h-[7px]',
}: {
  pct: number;
  fill: string;
  track?: string;
  h?: string;
}) {
  return (
    <div className={`${h} w-full overflow-hidden rounded-full ${track}`}>
      <div className={`bar-fill h-full rounded-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-clay' : 'bg-track'}`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[23px]' : 'left-[3px]'}`}
      />
    </button>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base = 'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-150';
  const look = active ? 'bg-clay-soft text-clay border border-clay-border' : 'bg-tint text-muted border border-transparent';
  if (!onClick) return <span className={`${base} ${look} ${className}`}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={`${base} ${look} ${className}`}>
      {children}
    </button>
  );
}

export const fieldCls =
  'w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-hairline focus:border-clay focus:outline-none';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1.5 !text-[10px]">{label}</div>
      {children}
    </div>
  );
}

/** Bottom sheet: backdrop + rising panel, sized to the app column. */
export function Sheet({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/30" />
      <div className="sheet-in relative w-full max-w-md rounded-t-3xl bg-canvas px-6 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-track" />
        <div className="max-h-[78dvh] overflow-y-auto overscroll-contain pb-2">{children}</div>
      </div>
    </div>
  );
}

/** Full-width clay call-to-action pill. */
export function CtaButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full bg-clay py-4 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-track disabled:text-hairline ${className}`}
    >
      {children}
    </button>
  );
}
