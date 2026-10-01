'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';
import {
  computeTargets,
  downloadStore,
  parseImportedStore,
  type JarvisStore,
  type Profile,
} from '@/lib/store';
import { CtaButton, Chip, Eyebrow, Field, Sheet, fieldCls } from '@/components/ui';

const GOALS = ['Lose fat', 'Build muscle', 'Get stronger', 'Stay healthy'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const SEXES = ['Male', 'Female', 'Other'];
const EQUIPMENT = ['Full gym', 'Dumbbells', 'Barbell', 'Kettlebell', 'Bands', 'Bodyweight only', 'Pull-up bar', 'Cardio machines'];

function Row({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between border-b border-line py-3.5 text-left">
      <span className="text-[15px] text-ink">{label}</span>
      <span className="flex items-center gap-1.5 text-[13px] text-faint">
        {value}
        {onClick && <ChevronRight size={15} />}
      </span>
    </button>
  );
}

/** Name, body stats and sex — the inputs behind the calorie maths. */
function DetailsSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(profile.heightCm?.toString() ?? '');
  const [bodyweightKg, setBodyweightKg] = useState(profile.bodyweightKg?.toString() ?? '');
  const [sex, setSex] = useState(profile.sex ?? '');
  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return (
    <Sheet onClose={onClose} label="Your details">
      <h2 className="font-display text-[22px] text-ink">Your details</h2>
      <div className="mt-5 space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Age">
            <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Height cm">
            <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} inputMode="numeric" className={`${fieldCls} text-center`} />
          </Field>
          <Field label="Weight kg">
            <input value={bodyweightKg} onChange={(e) => setBodyweightKg(e.target.value)} inputMode="decimal" className={`${fieldCls} text-center`} />
          </Field>
        </div>
        <Field label="Sex">
          <div className="flex flex-wrap gap-1.5">
            {SEXES.map((s) => (
              <Chip key={s} active={sex === s} onClick={() => setSex(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
      <CtaButton
        className="mt-6"
        onClick={() => {
          onSave({ name: name.trim() || 'Athlete', age: num(age), heightCm: num(heightCm), bodyweightKg: num(bodyweightKg), sex: sex || undefined });
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}

/** Goal plus the daily calorie and macro targets. */
function TargetsSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [goal, setGoal] = useState(profile.goal);
  const [calorieTarget, setCalorieTarget] = useState(String(profile.calorieTarget));
  const [proteinTargetG, setProteinTargetG] = useState(String(profile.proteinTargetG));
  const [carbsTargetG, setCarbsTargetG] = useState(String(profile.carbsTargetG));
  const [fatTargetG, setFatTargetG] = useState(String(profile.fatTargetG));
  const [fibreTargetG, setFibreTargetG] = useState(String(profile.fibreTargetG));
  const [touched, setTouched] = useState(false);

  const num = (s: string, fallback: number) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  // Recalculate from the goal, unless the athlete has typed their own numbers.
  const recalc = (nextGoal: string) => {
    const t = computeTargets({
      goal: nextGoal,
      daysPerWeek: profile.daysPerWeek,
      bodyweightKg: profile.bodyweightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
    });
    setCalorieTarget(String(t.calorieTarget));
    setProteinTargetG(String(t.proteinTargetG));
    setCarbsTargetG(String(t.carbsTargetG));
    setFatTargetG(String(t.fatTargetG));
    setFibreTargetG(String(t.fibreTargetG));
  };

  return (
    <Sheet onClose={onClose} label="Goal and targets">
      <h2 className="font-display text-[22px] text-ink">Goal &amp; targets</h2>
      <div className="mt-5 space-y-4">
        <Field label="Goal">
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <Chip
                key={g}
                active={goal === g}
                onClick={() => {
                  setGoal(g);
                  if (!touched) recalc(g);
                }}
              >
                {g}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Calories / day">
          <input
            value={calorieTarget}
            onChange={(e) => {
              setCalorieTarget(e.target.value);
              setTouched(true);
            }}
            inputMode="numeric"
            className={`${fieldCls} text-center`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Protein g">
            <input
              value={proteinTargetG}
              onChange={(e) => {
                setProteinTargetG(e.target.value);
                setTouched(true);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
          <Field label="Fibre g">
            <input
              value={fibreTargetG}
              onChange={(e) => {
                setFibreTargetG(e.target.value);
                setTouched(true);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
          <Field label="Carbs g">
            <input
              value={carbsTargetG}
              onChange={(e) => {
                setCarbsTargetG(e.target.value);
                setTouched(true);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
          <Field label="Fat g">
            <input
              value={fatTargetG}
              onChange={(e) => {
                setFatTargetG(e.target.value);
                setTouched(true);
              }}
              inputMode="numeric"
              className={`${fieldCls} text-center`}
            />
          </Field>
        </div>
        <button onClick={() => recalc(goal)} className="text-[13px] font-semibold text-muted underline">
          Recalculate from my details
        </button>
      </div>
      <CtaButton
        className="mt-6"
        onClick={() => {
          onSave({
            goal,
            calorieTarget: num(calorieTarget, profile.calorieTarget),
            proteinTargetG: num(proteinTargetG, profile.proteinTargetG),
            carbsTargetG: num(carbsTargetG, profile.carbsTargetG),
            fatTargetG: num(fatTargetG, profile.fatTargetG),
            fibreTargetG: num(fibreTargetG, profile.fibreTargetG),
            targetsAuto: !touched,
          });
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}

/** Experience, days per week and available equipment — feeds plan suggestions. */
function TrainingSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [experience, setExperience] = useState(profile.experience ?? '');
  const [daysPerWeek, setDaysPerWeek] = useState(profile.daysPerWeek ?? 3);
  const [equipment, setEquipment] = useState<string[]>(profile.equipment ?? []);
  const toggle = (item: string) => setEquipment((cur) => (cur.includes(item) ? cur.filter((e) => e !== item) : [...cur, item]));

  return (
    <Sheet onClose={onClose} label="Training setup">
      <h2 className="font-display text-[22px] text-ink">Training setup</h2>
      <div className="mt-5 space-y-4">
        <Field label="Experience">
          <div className="flex flex-wrap gap-1.5">
            {EXPERIENCE.map((e) => (
              <Chip key={e} active={experience === e} onClick={() => setExperience(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Days per week">
          <div className="flex flex-wrap gap-1.5">
            {[2, 3, 4, 5, 6].map((d) => (
              <Chip key={d} active={daysPerWeek === d} onClick={() => setDaysPerWeek(d)}>
                {d}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((e) => (
              <Chip key={e} active={equipment.includes(e)} onClick={() => toggle(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
      <CtaButton
        className="mt-6"
        onClick={() => {
          onSave({ experience: experience || undefined, daysPerWeek, equipment });
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}

/** The next event to aim at. Drives the countdown on the Home screen. */
function RaceSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Partial<Profile>) => void; onClose: () => void }) {
  const [raceName, setRaceName] = useState(profile.raceName ?? '');
  const [raceDate, setRaceDate] = useState(profile.raceDate ?? '');

  return (
    <Sheet onClose={onClose} label="Next race">
      <h2 className="font-display text-[22px] text-ink">Next race</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">Counts down on your home screen, then disappears once the day has passed.</p>
      <div className="mt-5 space-y-4">
        <Field label="Event">
          <input value={raceName} onChange={(e) => setRaceName(e.target.value)} placeholder="Wembley 10K" className={fieldCls} />
        </Field>
        <Field label="Date">
          <input value={raceDate} onChange={(e) => setRaceDate(e.target.value)} type="date" className={fieldCls} />
        </Field>
      </div>
      <CtaButton
        className="mt-6"
        onClick={() => {
          onSave({ raceName: raceName.trim() || undefined, raceDate: raceDate || undefined });
          onClose();
        }}
      >
        Save
      </CtaButton>
      {(profile.raceName || profile.raceDate) && (
        <button
          onClick={() => {
            onSave({ raceName: undefined, raceDate: undefined });
            onClose();
          }}
          className="mt-3 w-full py-1 text-center text-[13px] font-semibold text-faint"
        >
          Clear
        </button>
      )}
    </Sheet>
  );
}

export function ProfileScreen({
  store,
  onProfileSave,
  onRestore,
  onResetAll,
}: {
  store: JarvisStore;
  onProfileSave: (patch: Partial<Profile>) => void;
  onRestore: (store: JarvisStore) => void;
  onResetAll: () => void;
}) {
  const { data: session } = useSession();
  const [googleReady, setGoogleReady] = useState(false);
  const [sheet, setSheet] = useState<'details' | 'targets' | 'training' | 'race' | null>(null);
  const [armDelete, setArmDelete] = useState(false);
  const [restorePreview, setRestorePreview] = useState<JarvisStore | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((p: Record<string, unknown>) => setGoogleReady(Boolean(p && p.google)))
      .catch(() => setGoogleReady(false));
  }, []);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setRestoreError(null);
        setRestorePreview(parseImportedStore(String(reader.result)));
      } catch {
        setRestoreError("That file couldn't be read as a backup.");
      }
    };
    reader.onerror = () => setRestoreError("That file couldn't be read.");
    reader.readAsText(file);
  };

  const p = store.profile;
  const displayName = session?.user?.name ?? p.name;
  const email = session?.user?.email ?? null;
  const stats = useMemo(
    () => [p.age ? `${p.age}` : null, p.heightCm ? `${p.heightCm}cm` : null, p.bodyweightKg ? `${p.bodyweightKg}kg` : null].filter(Boolean).join(' · '),
    [p.age, p.heightCm, p.bodyweightKg]
  );
  const raceLabel = useMemo(() => {
    if (!p.raceDate) return 'Add';
    const d = new Date(`${p.raceDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return 'Add';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }, [p.raceDate]);

  return (
    <div>
      <Eyebrow>Account</Eyebrow>
      <h1 className="mt-1 font-display text-[30px] text-ink">Profile</h1>

      <div className="mt-5 flex items-center gap-3.5 border-b border-line pb-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-[17px] font-semibold text-ink">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold text-ink">{displayName}</div>
          <div className="truncate text-[13px] text-faint">{email ?? (p.goal || 'No goal set')}</div>
        </div>
      </div>

      <Eyebrow className="mt-7">You</Eyebrow>
      <div className="mt-1">
        <Row label="Your details" value={stats || 'Add'} onClick={() => setSheet('details')} />
        <Row label="Goal & targets" value={`${p.calorieTarget} kcal`} onClick={() => setSheet('targets')} />
        <Row label="Training setup" value={p.daysPerWeek ? `${p.daysPerWeek} days` : 'Add'} onClick={() => setSheet('training')} />
        <Row label="Next race" value={raceLabel} onClick={() => setSheet('race')} />
      </div>

      <Eyebrow className="mt-7">Data</Eyebrow>
      <div className="mt-1">
        <Row label="Back up my data" value="Download" onClick={() => downloadStore(store)} />
        <Row label="Restore from backup" value="Import" onClick={() => fileRef.current?.click()} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">
        Your data lives only on this device. Back it up before switching phones, then restore it there.
      </p>
      {restoreError && <p className="mt-1 text-[12px] font-semibold text-ink">{restoreError}</p>}
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFilePicked} className="hidden" />

      <div className="mt-8 space-y-4 text-center">
        {session ? (
          <button onClick={() => signOut()} className="w-full py-1 text-[14px] font-semibold text-ink underline">
            Sign out
          </button>
        ) : googleReady ? (
          <button onClick={() => signIn('google')} className="w-full py-1 text-[14px] font-semibold text-ink underline">
            Sign in with Google
          </button>
        ) : null}
        <button
          onClick={() => {
            if (!armDelete) return setArmDelete(true);
            onResetAll();
          }}
          onBlur={() => setArmDelete(false)}
          className="text-[12px] font-medium text-faint"
        >
          {armDelete ? 'Tap again to erase everything' : 'Delete all data'}
        </button>
        <div className="pt-1 text-[11px] text-faint">
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
            Privacy
          </a>
          {' · '}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline">
            Terms
          </a>
        </div>
      </div>

      {sheet === 'details' && <DetailsSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}
      {sheet === 'targets' && <TargetsSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}
      {sheet === 'training' && <TrainingSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}
      {sheet === 'race' && <RaceSheet profile={p} onSave={onProfileSave} onClose={() => setSheet(null)} />}

      {restorePreview && (
        <Sheet onClose={() => setRestorePreview(null)} label="Restore backup">
          <Eyebrow>Restore backup</Eyebrow>
          <h2 className="mt-1 font-display text-[22px] text-ink">Restore this backup?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            This replaces everything currently in the app with the backup below.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
            {[
              ['Plan days', restorePreview.plan.length],
              ['Meals', restorePreview.meals.length],
              ['Sets', restorePreview.sets.length],
              ['Workouts', restorePreview.sessions.length],
            ].map(([label, n]) => (
              <div key={String(label)} className="rounded-lg border border-line px-3 py-2">
                <div className="text-[17px] font-semibold tabular-nums text-ink">{n as number}</div>
                <div className="text-[12px] text-faint">{label as string}</div>
              </div>
            ))}
          </div>
          <CtaButton
            className="mt-5"
            onClick={() => {
              onRestore(restorePreview);
              setRestorePreview(null);
            }}
          >
            Restore
          </CtaButton>
          <button onClick={() => setRestorePreview(null)} className="mt-3 w-full py-1 text-center text-[13px] font-semibold text-faint">
            Cancel
          </button>
        </Sheet>
      )}
    </div>
  );
}
