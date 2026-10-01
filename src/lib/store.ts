/**
 * All data lives client-side, in localStorage on this device. Four things are
 * tracked: the weekly plan, the meals eaten, the sets performed, and the
 * workout sessions those sets belong to. Nothing else.
 */

export interface Profile {
  name: string;
  goal: string;
  onboarded: boolean;
  experience?: string; // Beginner | Intermediate | Advanced
  daysPerWeek?: number;
  equipment?: string[];
  bodyweightKg?: number;
  heightCm?: number;
  age?: number;
  sex?: string; // Male | Female | Other
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  fibreTargetG: number;
  /** False once the athlete types their own targets, so we never overwrite them. */
  targetsAuto?: boolean;
}

export type ExerciseType = 'strength' | 'cardio';

export interface PlannedExercise {
  name: string;
  type?: ExerciseType; // defaults to 'strength' when absent
  sets?: number;
  reps?: string;
  durationMin?: number;
  distanceKm?: number;
  notes?: string;
}

export interface PlanDay {
  weekday: number; // 0 = Sunday ... 6 = Saturday
  label: string;
  focus: string;
  exercises: PlannedExercise[];
}

/**
 * A spontaneous workout tied to one specific date. Unlike PlanDay it is keyed
 * by date, not weekday, so it shows up once and never repeats.
 */
export interface ExtraDay {
  date: string; // YYYY-MM-DD
  label: string;
  exercises: PlannedExercise[];
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  slot?: MealSlot;
}

export interface SetEntry {
  date: string;
  time: string;
  exercise: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  sessionId?: string;
}

/** A workout instance. Sets link back to it via SetEntry.sessionId. */
export interface WorkoutSession {
  id: string;
  date: string;
  weekday: number;
  label: string;
  focus?: string;
  startedAt: string;
  completedAt: string | null;
  status: 'in_progress' | 'completed';
  notes?: string;
}

export interface JarvisStore {
  profile: Profile;
  plan: PlanDay[];
  /** One-off workouts, each pinned to a single date. */
  extras: ExtraDay[];
  meals: MealEntry[];
  sets: SetEntry[];
  sessions: WorkoutSession[];
}

export const DEFAULT_STORE: JarvisStore = {
  profile: {
    name: 'Athlete',
    goal: '',
    onboarded: false,
    calorieTarget: 2500,
    proteinTargetG: 160,
    carbsTargetG: 280,
    fatTargetG: 80,
    fibreTargetG: 35,
    targetsAuto: true,
  },
  plan: [],
  extras: [],
  meals: [],
  sets: [],
  sessions: [],
};

/** Compact unique id (works in browser and Node runtimes). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface TargetInput {
  goal: string;
  daysPerWeek?: number;
  bodyweightKg?: number;
  heightCm?: number;
  age?: number;
  sex?: string;
}

/**
 * Derives calorie and macro targets. Mifflin-St Jeor when body stats are
 * available, otherwise sensible goal-based defaults.
 */
export function computeTargets(input: TargetInput): Pick<Profile, 'calorieTarget' | 'proteinTargetG' | 'carbsTargetG' | 'fatTargetG' | 'fibreTargetG'> {
  const goal = input.goal.toLowerCase();
  const kg = input.bodyweightKg;

  const proteinPerKg = /fat|lean|cut|lose/.test(goal) ? 2.0 : /muscle|strong|gain|bulk/.test(goal) ? 1.8 : 1.6;

  let calories: number;
  if (kg && input.heightCm && input.age) {
    const sexAdj = /female|woman/i.test(input.sex ?? '') ? -161 : 5;
    const bmr = 10 * kg + 6.25 * input.heightCm - 5 * input.age + sexAdj;
    const activity = (input.daysPerWeek ?? 3) >= 5 ? 1.725 : (input.daysPerWeek ?? 3) >= 3 ? 1.55 : 1.375;
    const tdee = bmr * activity;
    const goalAdj = /fat|lean|cut|lose/.test(goal) ? -400 : /muscle|gain|bulk/.test(goal) ? 250 : /strong/.test(goal) ? 150 : 0;
    calories = Math.round((tdee + goalAdj) / 10) * 10;
  } else {
    calories = /fat|lean|cut|lose/.test(goal) ? 2100 : /muscle|gain|bulk/.test(goal) ? 2800 : 2500;
  }

  const proteinTargetG = kg ? Math.round(proteinPerKg * kg) : Math.round((calories * 0.3) / 4);
  const fatTargetG = Math.round((calories * 0.25) / 9);
  const carbsTargetG = Math.max(0, Math.round((calories - proteinTargetG * 4 - fatTargetG * 9) / 4));
  // ~14g fibre per 1000 kcal — the standard dietary guideline.
  const fibreTargetG = Math.round((calories / 1000) * 14);

  return { calorieTarget: calories, proteinTargetG, carbsTargetG, fatTargetG, fibreTargetG };
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function timeStr(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STORAGE_KEY = 'jarvis.store.v1';

/**
 * Rebuilds a clean store from whatever is on disk. Only the fields this app
 * still uses are carried over — anything saved by an older version (avatar
 * styling, trophies, BJJ logs, measurements, coach notes) is simply dropped,
 * while plan / meals / sets / sessions survive untouched.
 */
function normalize(parsed: any): JarvisStore {
  const d = DEFAULT_STORE;
  const p = parsed?.profile ?? {};
  return {
    profile: {
      name: typeof p.name === 'string' ? p.name : d.profile.name,
      goal: typeof p.goal === 'string' ? p.goal : d.profile.goal,
      onboarded: !!p.onboarded,
      experience: typeof p.experience === 'string' ? p.experience : undefined,
      daysPerWeek: typeof p.daysPerWeek === 'number' ? p.daysPerWeek : undefined,
      equipment: Array.isArray(p.equipment) ? p.equipment.filter((e: unknown) => typeof e === 'string') : undefined,
      bodyweightKg: typeof p.bodyweightKg === 'number' ? p.bodyweightKg : undefined,
      heightCm: typeof p.heightCm === 'number' ? p.heightCm : undefined,
      age: typeof p.age === 'number' ? p.age : undefined,
      sex: typeof p.sex === 'string' ? p.sex : undefined,
      calorieTarget: typeof p.calorieTarget === 'number' ? p.calorieTarget : d.profile.calorieTarget,
      proteinTargetG: typeof p.proteinTargetG === 'number' ? p.proteinTargetG : d.profile.proteinTargetG,
      carbsTargetG: typeof p.carbsTargetG === 'number' ? p.carbsTargetG : d.profile.carbsTargetG,
      fatTargetG: typeof p.fatTargetG === 'number' ? p.fatTargetG : d.profile.fatTargetG,
      fibreTargetG: typeof p.fibreTargetG === 'number' ? p.fibreTargetG : d.profile.fibreTargetG,
      targetsAuto: p.targetsAuto !== false,
    },
    plan: Array.isArray(parsed?.plan) ? parsed.plan : [],
    extras: Array.isArray(parsed?.extras) ? parsed.extras.filter((e: any) => typeof e?.date === 'string' && Array.isArray(e?.exercises)) : [],
    meals: Array.isArray(parsed?.meals) ? parsed.meals.map((m: any) => ({ ...m, fibreG: typeof m?.fibreG === 'number' ? m.fibreG : 0 })) : [],
    sets: Array.isArray(parsed?.sets) ? parsed.sets : [],
    sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
  };
}

export function loadStore(): JarvisStore {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_STORE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STORE);
    return normalize(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function saveStore(store: JarvisStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable — nothing sensible to do.
  }
}

/** Downloads the full store as a timestamped JSON backup. */
export function downloadStore(store: JarvisStore): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parses an imported backup file, merging over defaults. */
export function parseImportedStore(raw: string): JarvisStore {
  return normalize(JSON.parse(raw));
}

/**
 * Decodes a shareable plan payload (base64url of { v, plan }) into a validated
 * PlanDay[], so a whole weekly plan can be applied in one tap from a link
 * without touching any logged data.
 */
export function decodePlanParam(param: string): PlanDay[] | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const obj = JSON.parse(json);
    const raw = Array.isArray(obj) ? obj : obj?.plan;
    if (!Array.isArray(raw)) return null;
    const plan: PlanDay[] = [];
    for (const d of raw) {
      if (typeof d?.weekday !== 'number' || d.weekday < 0 || d.weekday > 6 || !Array.isArray(d?.exercises)) continue;
      plan.push({
        weekday: d.weekday,
        label: String(d.label ?? 'Session'),
        focus: String(d.focus ?? ''),
        exercises: d.exercises
          .filter((e: any) => e && typeof e.name === 'string')
          .map((e: any) => ({
            name: String(e.name),
            type: e.type === 'cardio' ? 'cardio' : 'strength',
            sets: typeof e.sets === 'number' ? e.sets : undefined,
            reps: typeof e.reps === 'string' ? e.reps : undefined,
            durationMin: typeof e.durationMin === 'number' ? e.durationMin : undefined,
            distanceKm: typeof e.distanceKm === 'number' ? e.distanceKm : undefined,
            notes: typeof e.notes === 'string' ? e.notes : undefined,
          })),
      });
    }
    return plan.length ? plan.sort((a, b) => a.weekday - b.weekday) : null;
  } catch {
    return null;
  }
}
