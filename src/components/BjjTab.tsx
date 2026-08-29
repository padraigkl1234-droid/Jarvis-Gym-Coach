'use client';

import React, { useMemo, useState } from 'react';
import { Plus, X, Lightbulb } from 'lucide-react';
import { type JarvisStore, type BjjLogEntry, type BjjCategory, type BjjOutcome, type BjjContext, todayStr } from '@/lib/store';
import { Bar, Card, CtaButton, Eyebrow, Field, Sheet, fieldCls, Chip } from '@/components/ui';
import {
  BJJ_CATEGORIES,
  BJJ_CATEGORY_META,
  BJJ_LIBRARY,
  buildCategoryBreakdown,
  buildTechniqueStats,
  buildWeeklyTrend,
  buildMonthlyTrend,
  generateBjjSuggestions,
  type PeriodTrend,
} from '@/lib/bjj';
import { BjjInsight } from '@/components/BjjInsight';

type NewBjjLog = { category: BjjCategory; name: string; outcome: BjjOutcome; context: BjjContext; notes?: string };

function LogBjjSheet({ onAdd, onClose }: { onAdd: (log: NewBjjLog) => void; onClose: () => void }) {
  const [category, setCategory] = useState<BjjCategory>('submission');
  const [name, setName] = useState('');
  const [outcome, setOutcome] = useState<BjjOutcome>('landed');
  const [context, setContext] = useState<BjjContext>('gi');
  const [notes, setNotes] = useState('');

  const libraryNames = useMemo(() => BJJ_LIBRARY.filter((t) => t.category === category).map((t) => t.name), [category]);
  const valid = name.trim().length > 0;

  return (
    <Sheet onClose={onClose} label="Log a BJJ technique">
      <h2 className="font-display text-[24px] text-ink">Log a technique</h2>
      <div className="mt-5 space-y-4">
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {BJJ_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {BJJ_CATEGORY_META[c].label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Technique">
          <input
            autoFocus
            list="bjj-technique-options"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rear Naked Choke"
            className={fieldCls}
          />
          <datalist id="bjj-technique-options">
            {libraryNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <Field label="Outcome">
          <div className="flex gap-1.5">
            <Chip active={outcome === 'landed'} onClick={() => setOutcome('landed')}>
              Landed
            </Chip>
            <Chip active={outcome === 'attempted'} onClick={() => setOutcome('attempted')}>
              Attempted only
            </Chip>
          </div>
        </Field>
        <Field label="Context">
          <div className="flex gap-1.5">
            <Chip active={context === 'gi'} onClick={() => setContext('gi')}>
              Gi
            </Chip>
            <Chip active={context === 'no-gi'} onClick={() => setContext('no-gi')}>
              No-Gi
            </Chip>
          </div>
        </Field>
        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Who, what worked, what didn't…"
            rows={2}
            className={`${fieldCls} resize-none`}
          />
        </Field>
      </div>
      <CtaButton
        className="mt-6 !py-3.5"
        disabled={!valid}
        onClick={() => {
          onAdd({ category, name: name.trim(), outcome, context, notes: notes.trim() || undefined });
          onClose();
        }}
      >
        Log it
      </CtaButton>
    </Sheet>
  );
}

/** Small horizontal bar-pair chart for weekly/monthly attempted-vs-landed trend. */
function TrendBars({ periods }: { periods: PeriodTrend[] }) {
  if (periods.length === 0) {
    return (
      <div className="flex h-[90px] items-center justify-center rounded-xl bg-canvas text-[12px] font-semibold text-hairline">
        Not enough data yet
      </div>
    );
  }
  const maxAttempted = Math.max(1, ...periods.map((p) => p.attempted));
  return (
    <div className="flex items-end gap-2.5 overflow-x-auto pb-1">
      {periods.map((p) => (
        <div key={p.key} className="flex min-w-[38px] flex-1 flex-col items-center gap-1">
          <div className="flex h-[70px] w-full items-end justify-center gap-[3px]">
            <div
              className="w-[9px] rounded-t bg-track"
              style={{ height: `${Math.max(3, (p.attempted / maxAttempted) * 70)}px` }}
              title={`${p.attempted} attempted`}
            />
            <div
              className="w-[9px] rounded-t bg-clay"
              style={{ height: `${Math.max(p.landed > 0 ? 3 : 0, (p.landed / maxAttempted) * 70)}px` }}
              title={`${p.landed} landed`}
            />
          </div>
          <div className="text-[10px] font-semibold text-faint">{p.label}</div>
        </div>
      ))}
    </div>
  );
}

export function BjjTab({
  store,
  onAddLog,
  onDeleteLog,
}: {
  store: JarvisStore;
  onAddLog: (log: NewBjjLog) => void;
  onDeleteLog: (log: BjjLogEntry) => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
  const [historyOpen, setHistoryOpen] = useState(false);
  const logs = store.bjjLogs;

  const today = todayStr();
  const todayLogs = useMemo(() => logs.filter((l) => l.date === today), [logs, today]);
  const totalAttempted = logs.length;
  const totalLanded = logs.filter((l) => l.outcome === 'landed').length;

  const weekly = useMemo(() => buildWeeklyTrend(logs, 8), [logs]);
  const monthly = useMemo(() => buildMonthlyTrend(logs, 6), [logs]);
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(logs), [logs]);
  const topTechniques = useMemo(() => buildTechniqueStats(logs).slice(0, 8), [logs]);
  const suggestions = useMemo(() => generateBjjSuggestions(logs), [logs]);
  const recent = useMemo(() => [...logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, historyOpen ? 200 : 6), [logs, historyOpen]);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow className="pt-2">Jiu Jitsu</Eyebrow>
          <h1 className="mt-1 font-display text-[32px] text-ink">Progression</h1>
        </div>
        <button
          onClick={() => setLogOpen(true)}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-clay px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-clay-dark"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Log session
        </button>
      </div>

      {/* Hero card */}
      <div className="mt-5 rounded-3xl bg-ink p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display text-[44px] leading-none text-white">{totalAttempted > 0 ? Math.round((totalLanded / totalAttempted) * 100) : 0}%</div>
            <div className="eyebrow mt-2 !text-ondark-label">Land rate, all time</div>
          </div>
          <div className="pb-1 text-right text-[12px] leading-snug text-ondark-sub">
            {totalLanded} landed
            <br />
            of {totalAttempted} logged
          </div>
        </div>
        <div className="mt-4">
          <Bar pct={totalAttempted > 0 ? (totalLanded / totalAttempted) * 100 : 0} fill="bg-clay-bright" track="bg-ondark-track" />
        </div>
        {todayLogs.length > 0 && (
          <div className="mt-3 text-[12px] font-semibold text-ondark-sub">{todayLogs.length} logged today</div>
        )}
      </div>

      <BjjInsight store={store} />

      {/* Weekly / monthly breakdown */}
      <Card className="mt-3 rounded-[18px] px-[18px] py-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-ink">Breakdown</span>
          <div className="flex gap-1.5">
            <Chip active={range === 'weekly'} onClick={() => setRange('weekly')}>
              Weekly
            </Chip>
            <Chip active={range === 'monthly'} onClick={() => setRange('monthly')}>
              Monthly
            </Chip>
          </div>
        </div>
        <div className="mt-3">
          <TrendBars periods={range === 'weekly' ? weekly : monthly} />
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-faint">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-track" /> Attempted
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-clay" /> Landed
          </span>
        </div>
      </Card>

      {/* Category breakdown */}
      <Card className="mt-3 rounded-[18px] px-[18px] py-4">
        <span className="text-[15px] font-bold text-ink">By category</span>
        <div className="mt-3 space-y-3">
          {BJJ_CATEGORIES.filter((c) => categoryBreakdown[c].attempted > 0).map((c) => {
            const b = categoryBreakdown[c];
            return (
              <div key={c}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink">
                    {BJJ_CATEGORY_META[c].glyph} {BJJ_CATEGORY_META[c].plural}
                  </span>
                  <span className="text-faint">
                    {b.landed}/{b.attempted} landed
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar pct={b.attempted > 0 ? (b.landed / b.attempted) * 100 : 0} fill="bg-sage-bright" track="bg-sage-track" h="h-[6px]" />
                </div>
              </div>
            );
          })}
          {logs.length === 0 && <p className="text-[13px] text-hairline">Log a session to see your category breakdown.</p>}
        </div>
      </Card>

      {/* Top techniques */}
      {topTechniques.length > 0 && (
        <Card className="mt-3 rounded-[18px] px-[18px] py-4">
          <span className="text-[15px] font-bold text-ink">Your techniques</span>
          <ul className="mt-2 divide-y divide-divider">
            {topTechniques.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{t.name}</div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    {BJJ_CATEGORY_META[t.category].label} · {t.landed}/{t.attempted} landed
                  </div>
                </div>
                <div className="shrink-0 text-[15px] font-bold text-clay tabular-nums">{Math.round(t.landRate * 100)}%</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Suggestions */}
      <Card className="mt-3 rounded-[18px] px-[18px] py-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} className="text-clay" />
          <span className="text-[15px] font-bold text-ink">Suggestions</span>
        </div>
        <ul className="mt-2 space-y-3">
          {suggestions.map((s) => (
            <li key={s.id}>
              <div className="text-[13px] font-bold text-ink">{s.title}</div>
              <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{s.body}</div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Recent log history */}
      <Card className="mt-3 rounded-[18px] px-[18px] py-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-ink">Recent sessions</span>
          {logs.length > 6 && (
            <button onClick={() => setHistoryOpen((v) => !v)} className="text-[12px] font-bold text-clay">
              {historyOpen ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-[13px] text-hairline">Nothing logged yet — tap "Log session" to get started.</p>
        ) : (
          <ul className="mt-1.5 divide-y divide-divider">
            {recent.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink">
                    {BJJ_CATEGORY_META[l.category].glyph} {l.name}
                    <span className={`ml-1.5 text-[11px] font-bold ${l.outcome === 'landed' ? 'text-sage' : 'text-faint'}`}>
                      {l.outcome === 'landed' ? 'Landed' : 'Attempted'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-faint">
                    {l.date} · {l.context === 'gi' ? 'Gi' : 'No-Gi'}
                    {l.notes ? ` · ${l.notes}` : ''}
                  </div>
                </div>
                <button onClick={() => onDeleteLog(l)} aria-label={`Remove ${l.name} log`} className="shrink-0 text-hairline transition-colors hover:text-clay">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {logOpen && <LogBjjSheet onAdd={onAddLog} onClose={() => setLogOpen(false)} />}
    </div>
  );
}
