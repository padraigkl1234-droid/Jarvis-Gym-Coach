'use client';

import React, { useEffect } from 'react';

/* Shared primitives. Monochrome, flat, no decoration beyond a hairline border. */

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const cls = `rounded-xl border border-line bg-card ${className}`;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`block w-full text-left ${cls}`}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

/** Horizontal progress bar. Black fill on a light track. */
export function Bar({ pct, h = 'h-1.5' }: { pct: number; h?: string }) {
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-track`}>
      <div className="bar-fill h-full rounded-full bg-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
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
  const base = 'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors';
  const look = active ? 'border-ink bg-ink text-white' : 'border-line bg-card text-muted';
  if (!onClick) return <span className={`${base} ${look} ${className}`}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={`${base} ${look} ${className}`}>
      {children}
    </button>
  );
}

export const fieldCls =
  'w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none';

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
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="sheet-in relative w-full max-w-md rounded-t-2xl border-t border-line bg-canvas px-6 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
        <div className="max-h-[78dvh] overflow-y-auto overscroll-contain pb-2">{children}</div>
      </div>
    </div>
  );
}

/** Full-width primary action. */
export function CtaButton({
  children,
  onClick,
  disabled,
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:bg-track disabled:text-faint ${className}`}
    >
      {children}
    </button>
  );
}

/** Secondary action — outlined rather than filled. */
export function GhostButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-full border border-line py-3.5 text-[15px] font-semibold text-ink ${className}`}>
      {children}
    </button>
  );
}
