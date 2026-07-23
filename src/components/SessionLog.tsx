'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { type CompletedSession } from '@/lib/stats';
import { Card, Eyebrow } from '@/components/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`;
}

export function SessionLog({ sessions, rangeLabel, onClose }: { sessions: CompletedSession[]; rangeLabel: string; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(sessions[0]?.id ?? null);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-bold text-faint">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Session log · {rangeLabel}</Eyebrow>
        <h1 className="mt-1 font-display text-[32px] text-ink">Completed Sessions</h1>

        {sessions.length === 0 ? (
          <p className="mt-5 text-[14px] leading-relaxed text-muted">
            No completed sessions in this range yet. Finish a workout on the Move tab and it&apos;ll show up here.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {sessions.map((s) => {
              const isOpen = open === s.id;
              return (
                <Card key={s.id} className="overflow-hidden rounded-[18px]">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-[18px] py-4 text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-ink">{s.label}</div>
                      <div className="mt-0.5 text-[12px] text-faint">
                        {fmtDate(s.date)} · {s.totalSets} set{s.totalSets === 1 ? '' : 's'}
                        {s.totalVolumeKg > 0 ? ` · ${s.totalVolumeKg.toLocaleString()}kg` : ''}
                      </div>
                    </div>
                    <ChevronDown size={18} className={`shrink-0 text-faintest transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-divider px-[18px] py-2">
                      {s.exercises.length === 0 ? (
                        <p className="py-2 text-[13px] text-faint">No exercises recorded for this session.</p>
                      ) : (
                        <ul className="divide-y divide-divider">
                          {s.exercises.map((ex, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                              <div className="min-w-0">
                                <div className="text-[14px] font-semibold text-ink">{ex.name}</div>
                                <div className="mt-0.5 text-[12px] text-faint">
                                  {ex.sets} set{ex.sets === 1 ? '' : 's'}
                                  {ex.volumeKg > 0 ? ` · ${ex.volumeKg.toLocaleString()}kg volume` : ''}
                                </div>
                              </div>
                              {ex.topWeightKg != null && <div className="shrink-0 font-display text-[16px] text-ink">{ex.topWeightKg}kg</div>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.completedAt && (
                        <div className="border-t border-divider py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faintest">
                          {s.startedAt} – {s.completedAt}
                        </div>
                      )}
                      {s.notes && <div className="pb-2.5 text-[13px] italic text-muted">&ldquo;{s.notes}&rdquo;</div>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
