'use client';

import React, { useState } from 'react';
import { X, Calculator, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  type Profile,
  type MemoryEntry,
  type MemoryCategory,
  MEMORY_CATEGORIES,
  computeTargets,
} from '@/lib/store';
import { Chip, Field, inputClass, GOALS, LEVELS, DAYS, EQUIPMENT, SEXES } from '@/components/formBits';

const STEPS = [
  { id: 'vitals', num: '01', label: 'Vitals', blurb: 'Identity & body metrics' },
  { id: 'blueprint', num: '02', label: 'Blueprint', blurb: 'Goals, experience & targets' },
  { id: 'arsenal', num: '03', label: 'Arsenal', blurb: 'Training loadout' },
  { id: 'memory', num: '04', label: 'Memory', blurb: 'What VALORIS remembers' },
] as const;

export function ProfilePanel({
  profile,
  memories,
  onSave,
  onAddMemory,
  onRemoveMemory,
  onClose,
}: {
  profile: Profile;
  memories: MemoryEntry[];
  onSave: (patch: Partial<Profile>) => void;
  onAddMemory: (note: string, category: MemoryCategory) => void;
  onRemoveMemory: (memory: MemoryEntry) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [memNote, setMemNote] = useState('');
  const [memCat, setMemCat] = useState<MemoryCategory>('injury');

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="relative w-full max-w-lg border-2 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-7">
          <div>
            <div className="font-display text-lg uppercase tracking-[0.15em] text-black">Athlete Profile</div>
            <div className="mt-0.5 font-display text-[9px] uppercase tracking-[0.3em] text-red-600">
              Diagnostic sequence · {STEPS[step].num}/{String(STEPS.length).padStart(2, '0')}
            </div>
          </div>
          <button onClick={onClose} className="border-2 border-black p-1.5 text-black transition-colors hover:bg-black hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step rail */}
        <div className="mt-5 px-6 sm:px-7">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  className={`border-b-4 px-1 pb-2 pt-1 text-left transition-colors ${
                    active
                      ? 'border-red-600 text-black'
                      : done
                      ? 'border-black text-neutral-500'
                      : 'border-neutral-200 text-neutral-400 hover:text-black'
                  }`}
                >
                  <div className="font-display text-[9px] tracking-[0.2em]">{s.num}</div>
                  <div className="font-display text-[11px] uppercase tracking-[0.2em]">{s.label}</div>
                </button>
              );
            })}
          </div>
          <div className="relative h-px overflow-hidden bg-neutral-200">
            <div className="wizard-scan absolute inset-y-0 w-full" />
          </div>
        </div>

        {/* Step content */}
        <div key={step} className="wizard-step min-h-[300px] px-6 py-5 sm:px-7">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse bg-red-600" />
            <span className="font-display text-[10px] uppercase tracking-[0.25em] text-neutral-500">{STEPS[step].blurb}</span>
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
                  <span className="font-display text-[10px] uppercase tracking-[0.25em] text-neutral-500">Daily targets</span>
                  <button
                    onClick={recalc}
                    className="flex items-center gap-1.5 border-2 border-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black transition-colors hover:border-red-600 hover:text-red-600"
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
              <div className="border-2 border-black bg-neutral-50 px-4 py-3 text-[12px] font-medium leading-relaxed text-neutral-700">
                {equipment.length
                  ? `Loadout registered: ${equipment.join(', ')}. VALORIS will build and adapt your plan around this.`
                  : 'Nothing selected — VALORIS will assume bodyweight-only until you register equipment.'}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
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

              <div className="border-2 border-black">
                <div className="flex items-center justify-between border-b-2 border-black px-3 py-2">
                  <span className="font-display text-[10px] uppercase tracking-[0.25em] text-black">Stored</span>
                  <span className="font-display text-xs tabular-nums text-red-600">{memories.length}</span>
                </div>
                {memories.length > 0 ? (
                  <ul className="max-h-56 divide-y divide-neutral-200 overflow-y-auto">
                    {[...memories]
                      .sort((a, b) => {
                        const rank = (c: string) => (c === 'injury' ? 0 : c === 'record' ? 1 : 2);
                        return rank(a.category) - rank(b.category);
                      })
                      .map((m, i) => (
                        <li key={`${m.note}-${i}`} className="flex items-start gap-2.5 px-3 py-2.5">
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
                  <p className="px-3 py-3 text-xs font-medium text-neutral-400">
                    Nothing stored yet — add facts here or just tell VALORIS in chat.
                  </p>
                )}
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-neutral-400">
                Changes here apply immediately. VALORIS reads these every conversation — injuries, records, preferences, schedule.
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 border-t-2 border-black px-6 py-4 sm:px-7">
          <button
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex items-center gap-1 border-2 border-black bg-white px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.2em] text-black transition-colors hover:bg-neutral-100"
          >
            {step === 0 ? 'Cancel' : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </>
            )}
          </button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 transition-all ${i === step ? 'w-6 bg-red-600' : 'w-2 bg-neutral-300'}`} />
            ))}
          </div>
          <button
            onClick={() => (last ? save() : setStep(step + 1))}
            className="flex items-center gap-1 bg-red-600 px-5 py-2.5 font-display text-[11px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-700"
          >
            {last ? 'Save & Close' : (
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
    <label className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 focus-within:border-red-600">
      <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="w-full bg-transparent text-right text-sm font-bold tabular-nums text-black focus:outline-none"
      />
      <span className="text-[10px] font-bold text-neutral-400">{unit}</span>
    </label>
  );
}
