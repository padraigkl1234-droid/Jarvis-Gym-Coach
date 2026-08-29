'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import {
  BJJ_CATEGORIES,
  BJJ_CATEGORY_META,
  BJJ_LIBRARY,
  BJJ_SEQUENCES,
  findTechniqueRef,
  type BjjTechniqueRef,
  type BjjSequence,
} from '@/lib/bjj';
import type { BjjCategory } from '@/lib/store';
import { Card, Chip, Eyebrow, Sheet } from '@/components/ui';
import { TechniqueDiagram } from '@/components/BjjDiagrams';

function TechniqueDetail({ tech, onClose, onOpenTechnique }: { tech: BjjTechniqueRef; onClose: () => void; onOpenTechnique: (name: string) => void }) {
  return (
    <Sheet onClose={onClose} label={tech.name}>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-clay-soft px-2.5 py-1 text-[11px] font-bold text-clay">
          {BJJ_CATEGORY_META[tech.category].glyph} {BJJ_CATEGORY_META[tech.category].label}
        </span>
      </div>
      <h2 className="mt-2 font-display text-[26px] leading-tight text-ink">{tech.name}</h2>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line">
        <TechniqueDiagram scene={tech.scene} highlight={tech.highlight} className="w-full" />
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-ink">{tech.description}</p>

      {tech.cue && (
        <div className="mt-4 rounded-2xl border border-clay-border bg-clay-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-clay">Coaching cue</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink">{tech.cue}</p>
        </div>
      )}

      {!!tech.from?.length && (
        <div className="mt-4">
          <div className="eyebrow !text-[10px]">Attempted from</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tech.from.map((f) => {
              const ref = findTechniqueRef(f);
              return ref ? (
                <button
                  key={f}
                  onClick={() => onOpenTechnique(f)}
                  className="rounded-full bg-tint px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-clay"
                >
                  {f}
                </button>
              ) : (
                <span key={f} className="rounded-full bg-tint px-3 py-1.5 text-[12px] font-semibold text-muted">
                  {f}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!!tech.variants?.length && (
        <div className="mt-4">
          <div className="eyebrow !text-[10px]">Variants worth learning</div>
          <ul className="mt-1.5 space-y-1">
            {tech.variants.map((v) => (
              <li key={v} className="flex items-start gap-2 text-[13px] text-ink">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-clay" />
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function SequenceCard({ seq, onOpenTechnique }: { seq: BjjSequence; onOpenTechnique: (name: string) => void }) {
  return (
    <Card className="rounded-[18px] px-[18px] py-4">
      <div className="text-[14px] font-bold text-ink">{seq.title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-faint">{seq.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {seq.steps.map((step, i) => {
          const ref = findTechniqueRef(step);
          return (
            <React.Fragment key={i}>
              <button
                onClick={() => ref && onOpenTechnique(step)}
                className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-clay-border hover:text-clay"
              >
                {ref ? `${BJJ_CATEGORY_META[ref.category].glyph} ` : ''}
                {step}
              </button>
              {i < seq.steps.length - 1 && <ChevronRight size={14} className="shrink-0 text-hairline" />}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}

export function BjjLibrary({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<'techniques' | 'sequences'>('techniques');
  const [category, setCategory] = useState<BjjCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openTechnique, setOpenTechnique] = useState<BjjTechniqueRef | null>(null);

  const techniques = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BJJ_LIBRARY.filter((t) => (category === 'all' || t.category === category) && (!q || t.name.toLowerCase().includes(q)));
  }, [category, query]);

  const openByName = (name: string) => {
    const ref = findTechniqueRef(name);
    if (ref) setOpenTechnique(ref);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-bold text-faint">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Reference</Eyebrow>
        <h1 className="mt-1 font-display text-[32px] text-ink">Library</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {BJJ_LIBRARY.length} techniques and {BJJ_SEQUENCES.length} sequences to research and learn — tap anything for a diagram, description, and cue.
        </p>

        <div className="mt-4 flex gap-1.5">
          <Chip active={view === 'techniques'} onClick={() => setView('techniques')}>
            Techniques
          </Chip>
          <Chip active={view === 'sequences'} onClick={() => setView('sequences')}>
            Sequences
          </Chip>
        </div>

        {view === 'techniques' ? (
          <>
            <div className="relative mt-4">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-hairline" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search techniques…"
                className="w-full rounded-xl border border-line bg-card py-2.5 pl-10 pr-3.5 text-[15px] font-medium text-ink placeholder:text-hairline focus:border-clay focus:outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip active={category === 'all'} onClick={() => setCategory('all')}>
                All
              </Chip>
              {BJJ_CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {BJJ_CATEGORY_META[c].label}
                </Chip>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              {techniques.map((t) => (
                <Card key={t.name} onClick={() => setOpenTechnique(t)} className="rounded-2xl px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-soft text-[15px] text-clay">
                      {BJJ_CATEGORY_META[t.category].glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold text-ink">{t.name}</div>
                      <p className="mt-0.5 truncate text-[12px] text-faint">{t.description}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-hairline" />
                  </div>
                </Card>
              ))}
              {techniques.length === 0 && <p className="py-6 text-center text-[13px] text-hairline">No techniques match that search.</p>}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-2.5">
            {BJJ_SEQUENCES.map((seq) => (
              <SequenceCard key={seq.id} seq={seq} onOpenTechnique={openByName} />
            ))}
          </div>
        )}
      </div>

      {openTechnique && <TechniqueDetail tech={openTechnique} onClose={() => setOpenTechnique(null)} onOpenTechnique={openByName} />}
    </div>
  );
}
