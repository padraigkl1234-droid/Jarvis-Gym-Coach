'use client';

import React, { useState } from 'react';
import { X, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';
import { type Profile, computeTargets } from '@/lib/store';
import { Chip, Field, inputClass, GOALS, LEVELS, DAYS, EQUIPMENT, SEXES } from '@/components/formBits';

const STEPS = [
  { id: 'vitals', num: '01', label: 'Vitals', blurb: 'Identity & body metrics' },
  { id: 'blueprint', num: '02', label: 'Blueprint', blurb: 'Goals, experience & targets' },
  { id: 'arsenal', num: '03', label: 'Arsenal', blurb: 'Training loadout' },
] as const;

export function ProfilePanel({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile;
  onSave: (patch: Partial<Profile>) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  const [name, setName] = useState(profile.name === 'Athlete' ? '' : profile.name);
  const [sex, setSex] = useState(profile.sex ?? '');
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(profile.heightCm?.toString() ?? '');
  const [bodyweightKg, setBodyweightKg] = useState(profile.bodyweightKg?.toString() ?? '');
  const [goal, setGoal] = useState(profile.goal ?? '');
  const [experience, setExperience] = useState(profile.experience ?? '');
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(profile.daysPerWeek ?? null);
  const [equipment, setEquipment] = useState<string[]>(profile.equipment ?? []);

  const [calorieTarget, setCalorieTarget] = useState(profile.calorieTarget.toString());
  const [proteinTargetG, setProteinTargetG] = useState(profile.proteinTargetG.toString());
  const [carbsTargetG, setCarbsTargetG] = useState(profile.carbsTargetG.toString());
  const [fatTargetG, setFatTargetG] = useState(profile.fatTargetG.toString());
  const [hydrationTargetMl, setHydrationTargetMl] = useState(profile.hydrationTargetMl.toString());

  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const int = (s: string, fallback: number) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const toggleEquip = (e: string) =>
    setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  const recalc = () => {
    const t = computeTargets({
      name,
      goal,
      experience: experience || undefined,
      daysPerWeek: daysPerWeek ?? undefined,
      equipment,
      bodyweightKg: num(bodyweightKg),
      heightCm: num(heightCm),
      age: num(age),
      sex: sex || undefined,
    });
    setCalorieTarget(String(t.calorieTarget));
    setProteinTargetG(String(t.proteinTargetG));
    setCarbsTargetG(String(t.carbsTargetG));
    setFatTargetG(String(t.fatTargetG));
    setHydrationTargetMl(String(t.hydrationTargetMl));
  };

  const save = () => {
    onSave({
      name: name.trim() || 'Athlete',
      goal,
      experience: experience || undefined,
      daysPerWeek: daysPerWeek ?? undefined,
      equipment: equipment.length ? equipment : undefined,
      bodyweightKg: num(bodyweightKg),
      heightCm: num(heightCm),
      age: num(age),
      sex: sex || undefined,
      calorieTarget: int(calorieTarget, profile.calorieTarget),
      proteinTargetG: int(proteinTargetG, profile.proteinTargetG),
      carbsTargetG: int(carbsTargetG, profile.carbsTargetG),
      fatTargetG: int(fatTargetG, profile.fatTargetG),
      hydrationTargetMl: int(hydrationTargetMl, profile.hydrationTargetMl),
    });
    onClose();
  };

  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-sky-400/25 bg-black/80 backdrop-blur-md"
        style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.08)' }}
      >
        <span className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l-2 border-t-2 border-sky-400/60" />
        <span className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r-2 border-t-2 border-sky-400/60" />
        <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-b-2 border-l-2 border-sky-400/60" />
        <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b-2 border-r-2 border-sky-400/60" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-7">
          <div>
            <div className="font-display text-base tracking-[0.3em] text-white">ATHLETE PROFILE</div>
            <div className="mt-0.5 font-display text-[9px] uppercase tracking-[0.3em] text-sky-300/70">
              Diagnostic sequence · {STEPS[step].num}/{String(STEPS.length).padStart(2, '0')}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 transition-colors hover:text-white/80" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step rail */}
        <div className="mt-5 px-6 sm:px-7">
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  className={`rounded-t-md border-b-2 px-1 pb-2 pt-1 text-left transition-colors ${
                    active
                      ? 'border-sky-400 text-sky-200'
                      : done
                      ? 'border-sky-400/35 text-white/60'
                      : 'border-white/10 text-white/35 hover:text-white/60'
                  }`}
                >
                  <div className="font-display text-[9px] tracking-[0.2em]">{s.num}</div>
                  <div className="font-display text-[11px] uppercase tracking-[0.2em]">{s.label}</div>
                </button>
              );
            })}
          </div>
          <div className="relative h-px overflow-hidden bg-white/10">
            <div className="wizard-scan absolute inset-y-0 w-full" />
          </div>
        </div>

        {/* Step content */}
        <div key={step} className="wizard-step min-h-[300px] px-6 py-5 sm:px-7">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
            <span className="font-display text-[10px] uppercase tracking-[0.25em] text-white/50">{STEPS[step].blurb}</span>
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <Field label="Call sign / Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
              </Field>
              <Field label="Sex">
                <div className="flex flex-wrap gap-2">
                  {SEXES.map((s) => (
                    <Chip key={s} active={sex === s} onClick={() => setSex(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Body metrics">
                <div className="grid grid-cols-3 gap-2">
                  <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="Age" className={inputClass} />
                  <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} inputMode="numeric" placeholder="Height cm" className={inputClass} />
                  <input value={bodyweightKg} onChange={(e) => setBodyweightKg(e.target.value)} inputMode="numeric" placeholder="Weight kg" className={inputClass} />
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Primary goal">
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Experience">
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map((l) => (
                      <Chip key={l} active={experience === l} onClick={() => setExperience(l)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Days / week">
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <Chip key={d} active={daysPerWeek === d} onClick={() => setDaysPerWeek(d)}>
                        {d}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-[10px] uppercase tracking-[0.25em] text-white/40">Daily targets</span>
                  <button
                    onClick={recalc}
                    className="flex items-center gap-1.5 rounded-full border border-sky-400/30 px-2.5 py-1 text-[10px] uppercase tracking-wider text-sky-300 transition-colors hover:bg-sky-400/10"
                    title="Recalculate targets from goal and body stats"
                  >
                    <Calculator className="h-3 w-3" />
                    Auto-calc
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TargetInput label="Calories" value={calorieTarget} onChange={setCalorieTarget} unit="kcal" />
                  <TargetInput label="Protein" value={proteinTargetG} onChange={setProteinTargetG} unit="g" />
                  <TargetInput label="Carbs" value={carbsTargetG} onChange={setCarbsTargetG} unit="g" />
                  <TargetInput label="Fat" value={fatTargetG} onChange={setFatTargetG} unit="g" />
                  <div className="col-span-2">
                    <TargetInput label="Hydration" value={hydrationTargetMl} onChange={setHydrationTargetMl} unit="ml" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Field label="Equipment access">
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map((e) => (
                    <Chip key={e} active={equipment.includes(e)} onClick={() => toggleEquip(e)}>
                      {e}
                    </Chip>
                  ))}
                </div>
              </Field>
              <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-white/55">
                {equipment.length
                  ? `Loadout registered: ${equipment.join(', ')}. VALORIS will build and adapt your plan around this.`
                  : 'Nothing selected — VALORIS will assume bodyweight-only until you register equipment.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-6 py-4 sm:px-7">
          <button
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white/80"
          >
            {step === 0 ? 'Cancel' : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </>
            )}
          </button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-sky-400' : 'w-2 bg-white/15'}`}
              />
            ))}
          </div>
          <button
            onClick={() => (last ? save() : setStep(step + 1))}
            className="flex items-center gap-1 rounded-md border border-sky-400/60 bg-sky-400/15 px-5 py-2.5 font-display text-[11px] uppercase tracking-[0.2em] text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-colors hover:bg-sky-400/25"
          >
            {last ? 'Save Profile' : (
              <>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TargetInput({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-white/12 bg-white/[0.03] px-3 py-2">
      <span className="w-16 shrink-0 text-[11px] uppercase tracking-wider text-white/45">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="w-full bg-transparent text-right text-sm tabular-nums text-white focus:outline-none"
      />
      <span className="text-[10px] text-white/30">{unit}</span>
    </label>
  );
}
