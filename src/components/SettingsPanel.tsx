'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { X, Trash2, FileText, Download, Upload, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { type MemoryEntry, type MemoryCategory, MEMORY_CATEGORIES } from '@/lib/store';
import { Chip, Field, inputClass } from '@/components/formBits';

export interface Prefs {
  voiceReplies: boolean;
  bootAnimation: boolean;
}

/** Google account block: sign in / signed-in identity / not-configured note. */
function AccountSection() {
  const { data: session, status } = useSession();
  const [googleReady, setGoogleReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((p: Record<string, unknown>) => setGoogleReady(Boolean(p && p.google)))
      .catch(() => setGoogleReady(false));
  }, []);

  return (
    <section className="border-2 border-black">
      <div className="flex items-center justify-between border-b-2 border-black bg-neutral-50 px-4 py-2">
        <span className="font-display text-[10px] uppercase tracking-[0.25em] text-black">Account</span>
        {session?.user && <span className="h-2 w-2 bg-red-600" />}
      </div>
      {session?.user ? (
        <div className="flex items-center gap-3 px-4 py-3">
          {session.user.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={session.user.image} alt="" className="h-10 w-10 shrink-0 border-2 border-black object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-red-600 font-display text-white">
              {(session.user.name ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-black">{session.user.name}</div>
            <div className="truncate text-[11px] font-medium text-neutral-500">{session.user.email}</div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex shrink-0 items-center gap-1.5 border-2 border-black px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:border-red-600 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      ) : googleReady ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold uppercase tracking-wide text-black">Google account</div>
            <div className="text-[11px] font-medium text-neutral-500">Sign in with your own Google profile</div>
          </div>
          <button
            onClick={() => signIn('google')}
            disabled={status === 'loading'}
            className="flex shrink-0 items-center gap-1.5 bg-red-600 px-4 py-2 font-display text-[10px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:bg-neutral-300"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in with Google
          </button>
        </div>
      ) : googleReady === false ? (
        <div className="px-4 py-3">
          <div className="text-sm font-bold uppercase tracking-wide text-black">Google sign-in — not configured</div>
          <div className="mt-1 text-[11px] font-medium leading-relaxed text-neutral-500">
            Add <span className="font-bold text-black">GOOGLE_CLIENT_ID</span>, <span className="font-bold text-black">GOOGLE_CLIENT_SECRET</span> and{' '}
            <span className="font-bold text-black">AUTH_SECRET</span> in Vercel project settings, redeploy, and the sign-in button appears here.
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-[11px] font-medium text-neutral-400">Checking sign-in availability…</div>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  detail,
  on,
  onToggle,
}: {
  label: string;
  detail: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold uppercase tracking-wide text-black">{label}</div>
        <div className="text-[11px] font-medium text-neutral-500">{detail}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-7 w-14 shrink-0 border-2 transition-colors ${on ? 'border-red-600 bg-red-600' : 'border-black bg-white'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 transition-all ${on ? 'right-0.5 bg-white' : 'left-0.5 bg-black'}`}
        />
      </button>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  detail,
  buttonLabel,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold uppercase tracking-wide text-black">{label}</div>
        <div className="text-[11px] font-medium text-neutral-500">{detail}</div>
      </div>
      <button
        onClick={onClick}
        className="shrink-0 border-2 border-black px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:border-red-600 hover:text-red-600"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-black bg-neutral-50 px-4 py-2">
      <span className="font-display text-[10px] uppercase tracking-[0.25em] text-black">{label}</span>
      {count !== undefined && <span className="font-display text-xs tabular-nums text-red-600">{count}</span>}
    </div>
  );
}

export function SettingsPanel({
  memories,
  prefs,
  subscriptionTier,
  onTogglePref,
  onAddMemory,
  onRemoveMemory,
  onExportBlueprint,
  onDownloadBackup,
  onRestoreBackup,
  onResetAll,
  onClose,
}: {
  memories: MemoryEntry[];
  prefs: Prefs;
  subscriptionTier: string;
  onTogglePref: (key: keyof Prefs) => void;
  onAddMemory: (note: string, category: MemoryCategory) => void;
  onRemoveMemory: (memory: MemoryEntry) => void;
  onExportBlueprint: () => void;
  onDownloadBackup: () => void;
  onRestoreBackup: () => void;
  onResetAll: () => void;
  onClose: () => void;
}) {
  const [memNote, setMemNote] = useState('');
  const [memCat, setMemCat] = useState<MemoryCategory>('injury');
  const [armReset, setArmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="relative w-full max-w-lg border-2 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-6 py-5 sm:px-7">
          <div>
            <div className="font-display text-lg uppercase tracking-[0.15em] text-black">Settings</div>
            <div className="mt-0.5 font-display text-[9px] uppercase tracking-[0.3em] text-red-600">System configuration</div>
          </div>
          <button onClick={onClose} className="border-2 border-black p-1.5 text-black transition-colors hover:bg-black hover:text-white" aria-label="Close settings">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5 sm:px-7">
          <AccountSection />

          {/* Preferences */}
          <section className="border-2 border-black">
            <SectionHeader label="Preferences" />
            <div className="divide-y divide-neutral-200">
              <ToggleRow
                label="Voice replies"
                detail="VALORIS reads its answers aloud"
                on={prefs.voiceReplies}
                onToggle={() => onTogglePref('voiceReplies')}
              />
              <ToggleRow
                label="Boot animation"
                detail="Play the intro on launch"
                on={prefs.bootAnimation}
                onToggle={() => onTogglePref('bootAnimation')}
              />
            </div>
          </section>

          {/* Memory bank */}
          <section className="border-2 border-black">
            <SectionHeader label="Memory Bank" count={memories.length} />
            <div className="space-y-3 p-4">
              <Field label="Add a memory">
                <textarea
                  value={memNote}
                  onChange={(e) => setMemNote(e.target.value)}
                  rows={2}
                  placeholder='e.g. "Left knee — avoid deep loaded flexion"'
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {MEMORY_CATEGORIES.map((c) => (
                    <Chip key={c} active={memCat === c} onClick={() => setMemCat(c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const note = memNote.trim();
                    if (!note) return;
                    onAddMemory(note, memCat);
                    setMemNote('');
                  }}
                  disabled={!memNote.trim()}
                  className="mt-2 w-full bg-red-600 py-2.5 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  Add Memory
                </button>
              </Field>
              {memories.length > 0 ? (
                <ul className="max-h-52 divide-y divide-neutral-200 overflow-y-auto border-t-2 border-black pt-1">
                  {[...memories]
                    .sort((a, b) => {
                      const rank = (c: string) => (c === 'injury' ? 0 : c === 'record' ? 1 : 2);
                      return rank(a.category) - rank(b.category);
                    })
                    .map((m, i) => (
                      <li key={`${m.note}-${i}`} className="flex items-start gap-2.5 py-2.5">
                        <span
                          className={`mt-0.5 shrink-0 px-1.5 py-0.5 font-display text-[8px] uppercase tracking-widest ${
                            m.category === 'injury' ? 'bg-red-600 text-white' : 'border border-black text-black'
                          }`}
                        >
                          {m.category}
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-neutral-800">{m.note}</span>
                        <button
                          onClick={() => onRemoveMemory(m)}
                          className="shrink-0 p-1 text-neutral-300 transition-colors hover:text-red-600"
                          aria-label={`Remove memory: ${m.note.slice(0, 40)}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs font-medium text-neutral-400">Nothing stored yet — add facts here or just tell VALORIS in chat.</p>
              )}
            </div>
          </section>

          {/* Data */}
          <section className="border-2 border-black">
            <SectionHeader label="Data" />
            <div className="divide-y divide-neutral-200">
              <ActionRow icon={FileText} label="Weekly blueprint" detail="Branded PDF report of your week" buttonLabel="Export" onClick={onExportBlueprint} />
              <ActionRow icon={Download} label="Backup" detail="Download everything as JSON" buttonLabel="Download" onClick={onDownloadBackup} />
              <ActionRow icon={Upload} label="Restore" detail="Import a previous backup file" buttonLabel="Restore" onClick={onRestoreBackup} />
            </div>
          </section>

          {/* Danger zone */}
          <section className="border-2 border-red-600">
            <div className="flex items-center justify-between border-b-2 border-red-600 bg-red-50 px-4 py-2">
              <span className="font-display text-[10px] uppercase tracking-[0.25em] text-red-600">Danger Zone</span>
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold uppercase tracking-wide text-black">Reset all data</div>
                <div className="text-[11px] font-medium text-neutral-500">Wipes profile, plan, logs and memories from this device</div>
              </div>
              <button
                onClick={() => {
                  if (!armReset) return setArmReset(true);
                  onResetAll();
                }}
                onBlur={() => setArmReset(false)}
                className={`shrink-0 border-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] transition-colors ${
                  armReset ? 'border-red-600 bg-red-600 text-white' : 'border-red-600 text-red-600 hover:bg-red-50'
                }`}
              >
                {armReset ? 'Tap to confirm' : 'Reset'}
              </button>
            </div>
          </section>

          {/* About */}
          <div className="flex items-center justify-between pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            <span>Valoris · Performance System</span>
            <span className={subscriptionTier === 'premium' ? 'text-red-600' : ''}>{subscriptionTier} tier</span>
          </div>
          <p className="-mt-4 pb-2 text-[10px] font-medium text-neutral-400">All data stays on this device.</p>
        </div>
      </div>
    </div>
  );
}
