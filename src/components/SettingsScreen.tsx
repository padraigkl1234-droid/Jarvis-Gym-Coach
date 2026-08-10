'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ArrowLeft, ChevronRight, UserRound, Target, CalendarRange, Download, Upload, Bell, Ruler, Plus, Wand2 } from 'lucide-react';
import {
  MEMORY_CATEGORIES,
  computeTargets,
  downloadStore,
  parseImportedStore,
  type JarvisStore,
  type MemoryCategory,
  type MemoryEntry,
  type Profile,
} from '@/lib/store';
import { Card, Chip, CtaButton, Eyebrow, Field, fieldCls, Sheet, Toggle } from '@/components/ui';

export interface Prefs {
  reminders: boolean;
}

const GOALS = ['Build muscle', 'Lose fat', 'Get stronger', 'General fitness'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT = ['Full gym', 'Dumbbells', 'Barbell', 'Machines', 'Bands', 'Bodyweight'];

/** Category → badge palette. Injuries read clay, diet reads sage, the rest neutral. */
function badgeCls(cat: MemoryCategory): string {
  if (cat === 'injury') return 'bg-[#F0E1D8] text-clay';
  if (cat === 'nutrition') return 'bg-[#E9EFE3] text-sage';
  return 'bg-[#ECE8DC] text-muted';
}
function badgeLabel(cat: MemoryCategory): string {
  if (cat === 'nutrition') return 'DIET';
  if (cat === 'preference') return 'PREF';
  return cat.toUpperCase();
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
  right,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  const inner = (
    <>
      <Icon className="shrink-0 text-clay" size={19} />
      <span className="flex-1 text-[14px] font-medium text-ink">{label}</span>
      {value && <span className="text-[12px] text-faint">{value}</span>}
      {right ?? (onClick && <ChevronRight className="text-faintest" size={16} />)}
    </>
  );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
        {inner}
      </button>
    );
  return <div className="flex w-full items-center gap-3.5 px-4 py-3.5">{inner}</div>;
}

/* ---- Detail sheets ---- */

function AthleteProfileSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? '');
  const [weight, setWeight] = useState(profile.bodyweightKg?.toString() ?? '');
  const [sex, setSex] = useState(profile.sex ?? '');
  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  return (
    <Sheet onClose={onClose} label="Athlete profile">
      <h2 className="font-display text-[24px] text-ink">Athlete profile</h2>
      <div className="mt-5 space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Age">
            <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Height cm">
            <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Weight kg">
            <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={`${fieldCls} text-center`} />
          </Field>
        </div>
        <Field label="Sex">
          <div className="flex gap-2">
            {['Male', 'Female', 'Other'].map((s) => (
              <Chip key={s} active={sex === s} onClick={() => setSex(sex === s ? '' : s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
      {profile.targetsAuto !== false && (
        <p className="mt-4 text-[12px] leading-relaxed text-faint">
          Your calorie &amp; macro targets recalculate from these stats automatically.
        </p>
      )}
      <CtaButton
        className="mt-6 !py-3.5"
        onClick={() => {
          const patch: Partial<Profile> = {
            name: name.trim() || profile.name,
            age: num(age),
            heightCm: num(height),
            bodyweightKg: num(weight),
            sex: sex || undefined,
          };
          if (profile.targetsAuto !== false) {
            Object.assign(
              patch,
              computeTargets({
                name: patch.name!,
                goal: profile.goal,
                experience: profile.experience,
                daysPerWeek: profile.daysPerWeek,
                equipment: profile.equipment,
                bodyweightKg: patch.bodyweightKg,
                heightCm: patch.heightCm,
                age: patch.age,
                sex: patch.sex,
              })
            );
          }
          onSave(patch);
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}

function GoalsSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [goal, setGoal] = useState(profile.goal);
  const [cal, setCal] = useState(profile.calorieTarget.toString());
  const [protein, setProtein] = useState(profile.proteinTargetG.toString());
  const [carbs, setCarbs] = useState(profile.carbsTargetG.toString());
  const [fat, setFat] = useState(profile.fatTargetG.toString());
  const [water, setWater] = useState(profile.hydrationTargetMl.toString());
  const [recalculated, setRecalculated] = useState(false);
  const num = (s: string, fallback: number) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
  };
  const recalculate = () => {
    setRecalculated(true);
    const t = computeTargets({
      name: profile.name,
      goal: goal || profile.goal,
      experience: profile.experience,
      daysPerWeek: profile.daysPerWeek,
      equipment: profile.equipment,
      bodyweightKg: profile.bodyweightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
    });
    setCal(t.calorieTarget.toString());
    setProtein(t.proteinTargetG.toString());
    setCarbs(t.carbsTargetG.toString());
    setFat(t.fatTargetG.toString());
    setWater(t.hydrationTargetMl.toString());
  };

  return (
    <Sheet onClose={onClose} label="Goals and daily targets">
      <h2 className="font-display text-[24px] text-ink">Goals &amp; targets</h2>
      <div className="mt-5 space-y-4">
        <Field label="Primary goal">
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
                {g}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="flex items-center justify-between">
          <span className="eyebrow !text-[10px]">Daily targets</span>
          <button onClick={recalculate} className="text-[12px] font-bold text-clay">
            Recalculate from my stats
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories / day">
            <input
              value={cal}
              onChange={(e) => {
                setCal(e.target.value);
                setRecalculated(false);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
          <Field label="Protein g">
            <input
              value={protein}
              onChange={(e) => {
                setProtein(e.target.value);
                setRecalculated(false);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
          <Field label="Carbs g">
            <input
              value={carbs}
              onChange={(e) => {
                setCarbs(e.target.value);
                setRecalculated(false);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
          <Field label="Fat g">
            <input
              value={fat}
              onChange={(e) => {
                setFat(e.target.value);
                setRecalculated(false);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
        </div>
        <Field label="Water ml / day">
          <input
            value={water}
            onChange={(e) => {
              setWater(e.target.value);
              setRecalculated(false);
            }}
            inputMode="numeric"
            className={`${fieldCls} text-center`}
          />
        </Field>
        {profile.targetsAuto === false && (
          <p className="text-[12px] leading-relaxed text-faint">
            These are custom — editing your profile won&apos;t change them until you tap Recalculate.
          </p>
        )}
      </div>
      <CtaButton
        className="mt-6 !py-3.5"
        onClick={() => {
          const nextCal = num(cal, profile.calorieTarget);
          const nextProtein = num(protein, profile.proteinTargetG);
          const nextCarbs = num(carbs, profile.carbsTargetG);
          const nextFat = num(fat, profile.fatTargetG);
          const nextWater = num(water, profile.hydrationTargetMl);
          // Manually edited numbers lock in as a deliberate override; leaving
          // them untouched (goal-only change), or using Recalculate, keeps
          // auto-recalculation on.
          const unchanged =
            nextCal === profile.calorieTarget &&
            nextProtein === profile.proteinTargetG &&
            nextCarbs === profile.carbsTargetG &&
            nextFat === profile.fatTargetG &&
            nextWater === profile.hydrationTargetMl;
          // Recalculate always turns auto mode on; a genuine manual edit always
          // locks it off; leaving the numbers untouched preserves whatever the
          // lock state already was (opening and re-saving isn't a decision).
          const targetsAuto = recalculated ? true : unchanged ? profile.targetsAuto ?? true : false;
          onSave({
            goal: goal || profile.goal,
            calorieTarget: nextCal,
            proteinTargetG: nextProtein,
            carbsTargetG: nextCarbs,
            fatTargetG: nextFat,
            hydrationTargetMl: nextWater,
            targetsAuto,
          });
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}

function ScheduleSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [experience, setExperience] = useState(profile.experience ?? '');
  const [days, setDays] = useState<number | null>(profile.daysPerWeek ?? null);
  const [equipment, setEquipment] = useState<string[]>(profile.equipment ?? []);
  return (
    <Sheet onClose={onClose} label="Equipment and schedule">
      <h2 className="font-display text-[24px] text-ink">Equipment &amp; schedule</h2>
      <div className="mt-5 space-y-5">
        <Field label="Experience">
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE.map((e) => (
              <Chip key={e} active={experience === e} onClick={() => setExperience(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Days per week">
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((d) => (
              <Chip key={d} active={days === d} onClick={() => setDays(d)}>
                {d} days
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Equipment">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((eq) => (
              <Chip
                key={eq}
                active={equipment.includes(eq)}
                onClick={() => setEquipment((cur) => (cur.includes(eq) ? cur.filter((x) => x !== eq) : [...cur, eq]))}
              >
                {eq}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
      <CtaButton
        className="mt-6 !py-3.5"
        onClick={() => {
          const patch: Partial<Profile> = { experience: experience || undefined, daysPerWeek: days ?? undefined, equipment };
          if (profile.targetsAuto !== false) {
            Object.assign(
              patch,
              computeTargets({
                name: profile.name,
                goal: profile.goal,
                experience: patch.experience,
                daysPerWeek: patch.daysPerWeek,
                equipment: patch.equipment,
                bodyweightKg: profile.bodyweightKg,
                heightCm: profile.heightCm,
                age: profile.age,
                sex: profile.sex,
              })
            );
          }
          onSave(patch);
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}

function NoteComposer({ onAdd, onClose }: { onAdd: (note: string, category: MemoryCategory) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('general');
  return (
    <Sheet onClose={onClose} label="Add a coach note">
      <h2 className="font-display text-[24px] text-ink">Add a note</h2>
      <p className="mt-1.5 text-[13px] text-muted">Something VALORIS should keep in mind when coaching you.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {MEMORY_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {badgeLabel(c).toLowerCase()}
          </Chip>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder='e.g. "Left knee — avoid deep loaded flexion"'
        className={`${fieldCls} mt-4 resize-none`}
      />
      <CtaButton
        className="mt-5 !py-3.5"
        disabled={!text.trim()}
        onClick={() => {
          onAdd(text.trim(), category);
          onClose();
        }}
      >
        Save note
      </CtaButton>
    </Sheet>
  );
}

/* ---- Settings screen ---- */

export function SettingsScreen({
  store,
  prefs,
  onTogglePref,
  onProfileSave,
  onAddMemory,
  onRemoveMemory,
  onRestore,
  onSuggestPlan,
  onResetAll,
  onClose,
}: {
  store: JarvisStore;
  prefs: Prefs;
  onTogglePref: (key: keyof Prefs) => void;
  onProfileSave: (patch: Partial<Profile>) => void;
  onAddMemory: (note: string, category: MemoryCategory) => void;
  onRemoveMemory: (memory: MemoryEntry) => void;
  onRestore: (store: JarvisStore) => void;
  onSuggestPlan: () => void;
  onResetAll: () => void;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [googleReady, setGoogleReady] = useState(false);
  const [sheet, setSheet] = useState<'profile' | 'goals' | 'schedule' | 'note' | null>(null);
  const [armDelete, setArmDelete] = useState(false);
  const [restorePreview, setRestorePreview] = useState<JarvisStore | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportedStore(String(reader.result));
        setRestoreError(null);
        setRestorePreview(parsed);
      } catch {
        setRestoreError("That file couldn't be read as a VALORIS backup.");
      }
    };
    reader.onerror = () => setRestoreError("That file couldn't be read.");
    reader.readAsText(file);
  };

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((p: Record<string, unknown>) => setGoogleReady(Boolean(p && p.google)))
      .catch(() => setGoogleReady(false));
  }, []);

  const p = store.profile;
  const displayName = session?.user?.name ?? p.name;
  const email = session?.user?.email ?? null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-md px-6 pb-16 pt-5">
        {/* Header */}
        <button onClick={onClose} aria-label="Back" className="-ml-1 flex items-center gap-1.5 py-1 text-[13px] font-bold text-faint">
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow className="mt-5">Account</Eyebrow>
        <h1 className="mt-1 font-display text-[32px] text-ink">Settings</h1>

        {/* Profile card */}
        <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-ink p-[18px]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay text-[18px] font-bold text-white">
            {(displayName || 'A')[0].toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-bold text-white">{displayName}</span>
            <span className="block truncate text-[12px] text-ondark-label">{email ?? 'Data stays on this device'}</span>
          </span>
          <button
            onClick={() => setSheet('profile')}
            className="shrink-0 rounded-full border border-[#4A463C] px-4 py-1.5 text-[12px] font-bold text-white"
          >
            Edit
          </button>
        </div>

        {/* Your plan */}
        <Eyebrow className="mt-8">Your plan</Eyebrow>
        <Card className="mt-2 divide-y divide-divider rounded-2xl">
          <Row icon={UserRound} label="Athlete profile" onClick={() => setSheet('profile')} />
          <Row icon={Target} label="Goals & daily targets" value={p.goal || undefined} onClick={() => setSheet('goals')} />
          <Row icon={CalendarRange} label="Equipment & schedule" value={p.daysPerWeek ? `${p.daysPerWeek} days` : undefined} onClick={() => setSheet('schedule')} />
          <Row icon={Wand2} label="Suggest a plan for me" value="From your goal" onClick={onSuggestPlan} />
        </Card>
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-faintest">
          Builds a full week from your goal, equipment, and schedule above — you'll see a preview before anything changes.
        </p>

        {/* Coach notes */}
        <Eyebrow className="mt-8">Coach notes</Eyebrow>
        <Card className="mt-2 rounded-2xl p-4">
          <p className="text-[13px] leading-relaxed text-muted">Things VALORIS keeps in mind when shaping your training and nutrition.</p>
          <div className="mt-3 space-y-2">
            {store.memories.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-[#F5F1E8] p-3">
                <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${badgeCls(m.category)}`}>
                  {badgeLabel(m.category)}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{m.note}</span>
                <button onClick={() => onRemoveMemory(m)} aria-label="Remove note" className="shrink-0 text-[13px] font-bold text-hairline hover:text-clay">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSheet('note')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#D8D2C4] py-2.5 text-[13px] font-semibold text-faint transition-colors hover:border-clay hover:text-clay"
          >
            <Plus size={15} /> Add a note
          </button>
        </Card>

        {/* Preferences */}
        <Eyebrow className="mt-8">Preferences</Eyebrow>
        <Card className="mt-2 divide-y divide-divider rounded-2xl">
          <Row icon={Ruler} label="Units" value="Metric · kg" />
          <Row icon={Bell} label="Reminders" right={<Toggle on={prefs.reminders} onChange={() => onTogglePref('reminders')} label="Reminders" />} />
          <Row icon={Download} label="Back up my data" value="Download" onClick={() => downloadStore(store)} />
          <Row icon={Upload} label="Restore from backup" value="Import" onClick={() => fileRef.current?.click()} />
        </Card>
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-faintest">
          Your data lives only on this device. Back it up before uninstalling or switching phones, then Restore to bring it back.
        </p>
        {restoreError && <p className="mt-1 px-1 text-[12px] font-semibold text-clay">{restoreError}</p>}
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFilePicked} className="hidden" />

        {/* Account actions */}
        <div className="mt-8 space-y-4 text-center">
          {session ? (
            <button onClick={() => signOut()} className="w-full py-1 text-[14px] font-bold text-clay">
              Sign out
            </button>
          ) : googleReady ? (
            <button onClick={() => signIn('google')} className="w-full py-1 text-[14px] font-bold text-clay">
              Sign in with Google
            </button>
          ) : null}
          <div className="text-[11px] font-semibold tracking-wide text-faintest">VALORIS · v2.0</div>
          <button
            onClick={() => {
              if (!armDelete) return setArmDelete(true);
              onResetAll();
            }}
            onBlur={() => setArmDelete(false)}
            className={`text-[12px] font-semibold ${armDelete ? 'text-clay' : 'text-faintest'}`}
          >
            {armDelete ? 'Tap again to erase everything' : 'Delete all data'}
          </button>
          <div className="pt-1 text-[11px] text-faintest">
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
              Privacy
            </a>
            {' · '}
            <a href="/terms" target="_blank" rel="noreferrer" className="underline">
              Terms
            </a>
          </div>
        </div>
      </div>

      {sheet === 'profile' && <AthleteProfileSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}
      {sheet === 'goals' && <GoalsSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}
      {sheet === 'schedule' && <ScheduleSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}
      {sheet === 'note' && <NoteComposer onAdd={onAddMemory} onClose={() => setSheet(null)} />}

      {restorePreview && (
        <Sheet onClose={() => setRestorePreview(null)} label="Restore backup">
          <Eyebrow>Restore backup</Eyebrow>
          <h2 className="mt-1 font-display text-[24px] text-ink">Restore this backup?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            This replaces everything currently in the app with the backup below. Best used on a fresh install.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
            {(
              [
                ['Athlete', restorePreview.profile.name || '—'],
                ['Meals', String(restorePreview.meals.length)],
                ['Logged sets', String(restorePreview.sets.length)],
                ['Sessions', String(restorePreview.sessions.length)],
                ['Measurements', String(restorePreview.metrics.length)],
                ['Plan days', String(restorePreview.plan.length)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-card px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">{k}</div>
                <div className="mt-0.5 font-display text-[16px] text-ink">{v}</div>
              </div>
            ))}
          </div>
          <CtaButton
            className="mt-5 !py-3.5"
            onClick={() => {
              onRestore(restorePreview);
              setRestorePreview(null);
              onClose();
            }}
          >
            Restore &amp; replace
          </CtaButton>
          <button onClick={() => setRestorePreview(null)} className="mt-3 w-full py-1 text-center text-[13px] font-bold text-faint">
            Cancel
          </button>
        </Sheet>
      )}
    </div>
  );
}
