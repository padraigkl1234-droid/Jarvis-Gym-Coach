'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { exercisesForEquipment, type LibraryExercise, type MuscleGroup } from '@/lib/exercises';
import { Eyebrow, Sheet, fieldCls } from '@/components/ui';

const GROUP_ORDER: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Cardio'];

export function ExercisePicker({
  equipment,
  onPick,
  onClose,
}: {
  equipment: string[] | undefined;
  onPick: (ex: LibraryExercise) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const available = useMemo(() => exercisesForEquipment(equipment), [equipment]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? available.filter((ex) => ex.name.toLowerCase().includes(query)) : available;
  }, [available, q]);

  const grouped = useMemo(() => {
    const byGroup: Record<string, LibraryExercise[]> = {};
    for (const ex of filtered) (byGroup[ex.group] ??= []).push(ex);
    return GROUP_ORDER.map((g) => ({ group: g, exercises: byGroup[g] ?? [] })).filter((g) => g.exercises.length > 0);
  }, [filtered]);

  const limited = equipment && equipment.length > 0 && !equipment.includes('Full gym');

  return (
    <Sheet onClose={onClose} label="Choose an exercise">
      <h2 className="font-display text-[24px] text-ink">Choose an exercise</h2>
      <p className="mt-1 text-[12px] text-faint">
        {limited ? `Filtered to your equipment: ${equipment!.join(', ')}` : 'Showing everything — set your equipment in Settings to filter this.'}
      </p>
      <div className="relative mt-4">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-hairline" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises"
          className={`${fieldCls} !pl-10`}
        />
      </div>
      <div className="mt-4 max-h-[50vh] overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">No matches — you can still type any exercise name by hand.</p>
        ) : (
          grouped.map(({ group, exercises }) => (
            <div key={group} className="mb-4">
              <Eyebrow className="!text-[10px]">{group}</Eyebrow>
              <ul className="mt-1 divide-y divide-divider">
                {exercises.map((ex) => (
                  <li key={ex.name}>
                    <button
                      onClick={() => {
                        onPick(ex);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
                    >
                      <span className="text-[14px] font-medium text-ink">{ex.name}</span>
                      <span className="shrink-0 text-[12px] text-faint">
                        {ex.type === 'cardio'
                          ? [ex.durationMin ? `${ex.durationMin} min` : null, ex.distanceKm ? `${ex.distanceKm} km` : null].filter(Boolean).join(' · ')
                          : `${ex.sets} × ${ex.reps}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
}
