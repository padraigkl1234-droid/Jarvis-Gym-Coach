'use client';

import React, { useRef, useState } from 'react';
import { computeTargets, parseImportedStore, type JarvisStore, type Profile } from '@/lib/store';
import { Chip, CtaButton, Field, fieldCls } from '@/components/ui';

const GOALS = ['Build muscle', 'Lose fat', 'Get stronger', 'General fitness'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const DAYS = [2, 3, 4, 5, 6];
const EQUIPMENT = ['Full gym', 'Dumbbells', 'Barbell', 'Machines', 'Bands', 'Bodyweight'];
const SEXES = ['Male', 'Female', 'Other'];

/** Three short steps: who you are, what you want, how you train. */
export function OnboardingFlow({ onComplete, onRestore }: { onComplete: (profile: Partial<Profile>) => void; onRestore: (store: JarvisStore) => void }) {
  const [step, setStep] = useState(0);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onRestore(parseImportedStore(String(reader.result)));
      } catch {
        setRestoreError("That file couldn't be read as a backup.");
      }
    };
    reader.onerror = () => setRestoreError("That file couldn't be read.");
    reader.readAsText(file);
  };

  const finish = () => {
    const targets = computeTargets({
      goal,
      daysPerWeek: days ?? undefined,
      bodyweightKg: num(weight),
      heightCm: num(height),
      age: num(age),
      sex: sex || undefined,
    });
    onComplete({
      name: name.trim() || 'Athlete',
      goal,
      onboarded: true,
      experience: experience || undefined,
      daysPerWeek: days ?? undefined,
      equipment,
      bodyweightKg: num(weight),
      heightCm: num(height),
      age: num(age),
      sex: sex || undefined,
      targetsAuto: true,
      ...targets,
    });
  };

  const canContinue = step === 0 ? name.trim().length > 0 : step === 1 ? goal.length > 0 : true;

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-12">
        {/* Step indicator */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-[3px] flex-1 rounded-full ${i <= step ? 'bg-ink' : 'bg-track'}`} />
          ))}
        </div>

        <div className="mt-10 flex-1">
          {step === 0 && (
            <>
              <h1 className="font-display text-[30px] leading-tight text-ink">Let&apos;s set you up</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">Used to work out your calorie and macro targets.</p>
              <div className="mt-7 space-y-4">
                <Field label="Name">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={fieldCls} />
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
                  <div className="flex flex-wrap gap-1.5">
                    {SEXES.map((s) => (
                      <Chip key={s} active={sex === s} onClick={() => setSex(s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="font-display text-[30px] leading-tight text-ink">What are you after?</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">This sets your starting calorie target.</p>
              <div className="mt-7 space-y-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`w-full rounded-xl border px-4 py-3.5 text-left text-[15px] font-medium ${
                      goal === g ? 'border-ink bg-ink text-white' : 'border-line text-ink'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-display text-[30px] leading-tight text-ink">How do you train?</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">Optional — helps when suggesting a plan.</p>
              <div className="mt-7 space-y-4">
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
                    {DAYS.map((d) => (
                      <Chip key={d} active={days === d} onClick={() => setDays(d)}>
                        {d}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Equipment">
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT.map((e) => (
                      <Chip
                        key={e}
                        active={equipment.includes(e)}
                        onClick={() => setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]))}
                      >
                        {e}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <CtaButton disabled={!canContinue} onClick={() => (step < 2 ? setStep(step + 1) : finish())}>
            {step < 2 ? 'Continue' : 'Start'}
          </CtaButton>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="w-full py-1 text-center text-[13px] font-semibold text-faint">
              Back
            </button>
          ) : (
            <>
              <button onClick={() => fileRef.current?.click()} className="w-full py-1 text-center text-[13px] font-semibold text-faint underline">
                Restore from a backup
              </button>
              {restoreError && <p className="text-center text-[12px] font-semibold text-ink">{restoreError}</p>}
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFilePicked} className="hidden" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
