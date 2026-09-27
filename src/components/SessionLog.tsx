'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { type CompletedSession } from '@/lib/stats';
import { Eyebrow } from '@/components/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`;
}

/** Past completed workouts, newest first. */
export function SessionLog({ sessions, onClose }: { sessions: CompletedSession[]; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(sessions[0]?.id ?? null);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-semibold text-muted">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Training</Eyebrow>
        <h1 className="mt-1 font-display text-[30px] text-ink">History</h1>

        {sessions.length === 0 ? (
          <p className="mt-4 text-[14px] leading-relaxed text-muted">No finished workouts yet.</p>
        ) : (
          <div className="mt-5">
            {sessions.map((s) => {
              const isOpen = open === s.id;
              return (
                <div key={s.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-ink">{s.label}</div>
                      <div className="mt-0.5 text-[12px] text-faint">
                        {fmtDate(s.date)} · {s.totalSets} set{s.totalSets === 1 ? '' : 's'}
                        {s.totalVolumeKg > 0 ? ` · ${s.totalVolumeKg.toLocaleString()}kg` : ''}
                      </div>
                    </div>
                    <ChevronDown size={18} className={`shrink-0 text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="pb-3">
                      {s.exercises.length === 0 ? (
                        <p className="pb-2 text-[13px] text-faint">No exercises recorded.</p>
                      ) : (
                        <ul className="space-y-2">
                          {s.exercises.map((ex, i) => (
                            <li key={i} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[14px] text-ink">{ex.name}</div>
                                <div className="text-[12px] text-faint">
                                  {ex.sets} set{ex.sets === 1 ? '' : 's'}
                                  {ex.volumeKg > 0 ? ` · ${ex.volumeKg.toLocaleString()}kg volume` : ''}
                                </div>
                              </div>
                              {ex.topWeightKg != null && <div className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{ex.topWeightKg}kg</div>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.completedAt && <div className="mt-3 text-[11px] uppercase tracking-wide text-faint">{s.startedAt} – {s.completedAt}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
