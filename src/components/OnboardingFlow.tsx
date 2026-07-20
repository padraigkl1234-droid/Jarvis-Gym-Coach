'use client';

import React, { useState } from 'react';
import { Dumbbell, Flame, Trophy, HeartPulse, Check } from 'lucide-react';
import { computeTargets, type Profile } from '@/lib/store';
import { Chip, CtaButton, Field, fieldCls } from '@/components/ui';

const GOALS = [
  { id: 'Build muscle', icon: Dumbbell, blurb: 'Add lean size with structured hypertrophy work.' },
  { id: 'Lose fat', icon: Flame, blurb: 'Drop body fat while holding on to strength.' },
  { id: 'Get stronger', icon: Trophy, blurb: 'Chase bigger numbers on the main lifts.' },
  { id: 'General fitness', icon: HeartPulse, blurb: 'Feel better, move better, live better.' },
];

const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const DAYS = [2, 3, 4, 5, 6];
const EQUIPMENT = ['Full gym', 'Dumbbells', 'Barbell', 'Machines', 'Bands', 'Bodyweight'];
const SEXES = ['Male', 'Female', 'Other'];

export function OnboardingFlow({ onComplete }: { onComplete: (profile: Partial<Profile>) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [days, setDays] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);

  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const buildProfile = (): Partial<Profile> => {
    const input = {
      name: name.trim() || 'Athlete',
      goal: goal || 'General fitness',
      experience: experience || undefined,
      daysPerWeek: days ?? undefined,
      equipment: equipment.length ? equipment : undefined,
      bodyweightKg: num(weight),
      heightCm: num(height),
      age: num(age),
      sex: sex || undefined,
    };
    return { ...input, ...computeTargets(input), onboarded: true };
  };

  const finish = () => onComplete(buildProfile());
  const canContinue = [name.trim().length > 0, goal !== '', experience !== '' && days != null, true][step];

  const targets = computeTargets({
    name: name.trim() || 'Athlete',
    goal: goal || 'General fitness',
    daysPerWeek: days ?? undefined,
    bodyweightKg: num(weight),
    heightCm: num(height),
    age: num(age),
    sex: sex || undefined,
  });

  const titles: [string, string, string?][] = [
    ['Let’s get you\nset up.', 'A few basics so your coaching is tuned to you, not a template.'],
    ['What are you\ntraining for?', 'Pick the goal that matters most right now — you can change it any time.'],
    ['How do you\nlike to train?', 'This shapes how your week is structured.'],
    ['Your daily\ntargets.', 'Calculated from your stats and goal. Adjust them later in Settings.'],
  ];
  const [title, subtitle] = titles[step];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-7 pb-10 pt-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-faint">Step {step + 1} of 4</span>
        <button onClick={finish} className="text-[12px] font-semibold text-hairline">
          Skip
        </button>
      </div>
      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-clay' : 'bg-track'}`} />
        ))}
      </div>

      {/* Title */}
      <h1 className="mt-9 whitespace-pre-line font-display text-[30px] leading-[1.15] text-ink">{title}</h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{subtitle}</p>

      <div className="view-in mt-7 flex-1" key={step}>
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Your name">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" className={fieldCls} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Age">
                <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="—" className={`${fieldCls} text-center`} />
              </Field>
              <Field label="Height cm">
                <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" placeholder="—" className={`${fieldCls} text-center`} />
              </Field>
              <Field label="Weight kg">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="—" className={`${fieldCls} text-center`} />
              </Field>
            </div>
            <Field label="Sex">
              <div className="flex gap-2">
                {SEXES.map((s) => (
                  <Chip key={s} active={sex === s} onClick={() => setSex(sex === s ? '' : s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {GOALS.map(({ id, icon: Icon, blurb }) => {
              const selected = goal === id;
              return (
                <button
                  key={id}
                  onClick={() => setGoal(id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors duration-150 ${
                    selected ? 'border-ink bg-ink' : 'border-line bg-card'
                  }`}
                >
                  <span
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${
                      selected ? 'bg-clay text-white' : 'bg-clay-soft text-clay'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-bold ${selected ? 'text-white' : 'text-ink'}`}>{id}</span>
                    <span className={`block text-[12px] leading-snug ${selected ? 'text-ondark-sub' : 'text-faint'}`}>{blurb}</span>
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      selected ? 'bg-clay text-white' : 'border-[1.5px] border-[#D8D2C4] text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
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
                {DAYS.map((d) => (
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
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['Calories', `${targets.calorieTarget.toLocaleString()}`, 'kcal / day'],
                ['Protein', `${targets.proteinTargetG}`, 'g / day'],
                ['Carbs', `${targets.carbsTargetG}`, 'g / day'],
                ['Fat', `${targets.fatTargetG}`, 'g / day'],
                ['Water', `${(targets.hydrationTargetMl / 1000).toFixed(1)}`, 'L / day'],
              ] as const
            ).map(([label, value, unit]) => (
              <div key={label} className="rounded-[18px] border border-line bg-card p-4">
                <div className="eyebrow !text-[10px]">{label}</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-[26px] leading-none text-ink">{value}</span>
                  <span className="text-[12px] text-faint">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <CtaButton onClick={() => (step === 3 ? finish() : setStep(step + 1))} disabled={!canContinue}>
          {step === 3 ? 'Start training →' : 'Continue →'}
        </CtaButton>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="mt-3 w-full text-center text-[13px] font-semibold text-faint">
            Back
          </button>
        )}
      </div>
    </div>
  );
}
