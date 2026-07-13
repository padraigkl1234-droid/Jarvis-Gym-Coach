'use client';

import React, { useState } from 'react';
import {
  type JarvisStore,
  type Profile,
  type MemoryEntry,
  type MemoryCategory,
  computeTargets,
  todayStr,
} from '@/lib/store';
import { Chip, Field, inputClass, LabeledInput, GOALS, LEVELS, DAYS, EQUIPMENT, SEXES } from '@/components/formBits';

function splitItems(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Onboarding({ onComplete }: { onComplete: (patch: Partial<JarvisStore>) => void }) {
  const [name, setName] = useState('');
  const [sex, setSex] = useState<string>('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bodyweightKg, setBodyweightKg] = useState('');
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState('');
  const [dietary, setDietary] = useState('');

  const toggleEquip = (e: string) =>
    setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  const ready = name.trim().length > 0 && goal.length > 0;

  const submit = () => {
    if (!ready) return;

    const num = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : undefined;
    };

    const input = {
      name: name.trim(),
      goal,
      experience: experience || undefined,
      daysPerWeek: daysPerWeek ?? undefined,
      equipment: equipment.length ? equipment : undefined,
      bodyweightKg: num(bodyweightKg),
      heightCm: num(heightCm),
      age: num(age),
      sex: sex || undefined,
    };

    const profile: Partial<Profile> = {
      ...input,
      onboarded: true,
      ...computeTargets(input),
    };

    const now = todayStr();
    const mem = (note: string, category: MemoryCategory): MemoryEntry => ({ date: now, note, category });
    const memories: MemoryEntry[] = [mem(`Primary goal: ${goal}`, 'goal')];
    if (experience) memories.push(mem(`Training experience: ${experience}`, 'general'));
    if (daysPerWeek) memories.push(mem(`Available to train ${daysPerWeek} days per week`, 'schedule'));
    if (equipment.length) memories.push(mem(`Trains with: ${equipment.join(', ')}`, 'equipment'));
    for (const item of splitItems(injuries)) memories.push(mem(item, 'injury'));
    for (const item of splitItems(dietary)) memories.push(mem(item, 'nutrition'));

    onComplete({ profile: profile as Profile, memories });
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-y-auto bg-neutral-100 px-4 py-10 font-sans">
      <div className="w-full max-w-lg border-2 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]">
        <div className="border-b-2 border-black px-6 py-6 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="h-3.5 w-3.5 bg-red-600" />
            <span className="font-display text-2xl uppercase tracking-[0.2em] text-black">Valoris</span>
          </div>
          <div className="mt-1 font-display text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            Athlete Profile · Initialisation
          </div>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <Field label="Call sign / Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should VALORIS call you?"
              className={inputClass}
            />
          </Field>

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

          <Field label="Equipment access">
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => (
                <Chip key={e} active={equipment.includes(e)} onClick={() => toggleEquip(e)}>
                  {e}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Body stats (optional — sharpens your targets)">
            <div className="grid grid-cols-3 gap-2">
              <LabeledInput label="Age · yrs" value={age} onChange={setAge} placeholder="25" />
              <LabeledInput label="Height · cm" value={heightCm} onChange={setHeightCm} placeholder="180" />
              <LabeledInput label="Weight · kg" value={bodyweightKg} onChange={setBodyweightKg} placeholder="80" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {SEXES.map((s) => (
                <Chip key={s} active={sex === s} onClick={() => setSex(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Injuries / limitations (optional)">
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g. Left knee — avoid deep loaded flexion; dodgy lower back"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Dietary notes / allergies (optional)">
            <textarea
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="e.g. Vegetarian; lactose intolerant; hate seafood"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            className={`w-full py-3.5 font-display text-xs uppercase tracking-[0.3em] transition-colors ${
              ready ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
            }`}
          >
            Initialise Valoris ▸
          </button>
          <p className="text-center text-[11px] font-medium text-neutral-400">
            Everything stays on this device. You can refine any of it later just by talking to VALORIS.
          </p>
        </div>
      </div>
    </div>
  );
}
