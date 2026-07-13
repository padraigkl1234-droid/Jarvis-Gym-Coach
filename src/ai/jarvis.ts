import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import {
  type JarvisStore,
  type PlanDay,
  type WorkoutSession,
  DEFAULT_STORE,
  newId,
  todayStr,
  timeStr,
} from '@/lib/store';
import { buildStats } from '@/lib/stats';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The store for the request currently being processed. Tools registered with
 * genkit are module-level singletons, so they reach the active request's data
 * through this reference. Requests are single-user and effectively serial.
 */
let working: JarvisStore = structuredClone(DEFAULT_STORE);

function mealTotals(date: string) {
  return working.meals
    .filter((m) => m.date === date)
    .reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
        count: acc.count + 1,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 }
    );
}

function waterTotal(date: string): number {
  return working.water.filter((w) => w.date === date).reduce((acc, w) => acc + w.ml, 0);
}

function setsForDate(date: string) {
  return working.sets.filter((s) => s.date === date);
}

/** Returns today's active workout session, creating one from the plan if needed. */
function ensureTodaySession(): WorkoutSession {
  const date = todayStr();
  const existing = working.sessions.find((s) => s.date === date && s.status === 'in_progress');
  if (existing) return existing;
  const weekday = new Date().getDay();
  const planDay = working.plan.find((p) => p.weekday === weekday);
  const session: WorkoutSession = {
    id: newId(),
    date,
    weekday,
    label: planDay?.label ?? 'Workout',
    focus: planDay?.focus,
    startedAt: timeStr(),
    completedAt: null,
    status: 'in_progress',
  };
  working.sessions.push(session);
  return session;
}

const updateProfileTool = ai.defineTool(
  {
    name: 'updateProfile',
    description:
      "Updates the athlete's profile: name, training goal, and daily targets for calories, macros, and hydration. Only pass the fields being changed.",
    inputSchema: z.object({
      name: z.string().optional(),
      goal: z.string().optional().describe('e.g. "build muscle", "lose fat", "improve 5k time"'),
      experience: z.string().optional().describe('Beginner | Intermediate | Advanced'),
      daysPerWeek: z.number().optional(),
      equipment: z.array(z.string()).optional(),
      bodyweightKg: z.number().optional(),
      heightCm: z.number().optional(),
      age: z.number().optional(),
      sex: z.string().optional(),
      trainingTimePref: z.string().optional().describe('When they prefer to train, e.g. "Evening"'),
      dietaryStyle: z.string().optional().describe('e.g. "High protein", "Vegetarian", "Halal"'),
      interests: z.string().optional().describe('Sports and activities they enjoy'),
      coachNotes: z.string().optional().describe('Life context worth coaching around, e.g. stressful job, kids, travel'),
      calorieTarget: z.number().optional(),
      proteinTargetG: z.number().optional(),
      carbsTargetG: z.number().optional(),
      fatTargetG: z.number().optional(),
      hydrationTargetMl: z.number().optional(),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
  },
  async (input) => {
    working.profile = {
      ...working.profile,
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    };
    return { ok: true };
  }
);

const setPlanDaysTool = ai.defineTool(
  {
    name: 'setPlanDays',
    description:
      "Creates or updates the athlete's weekly training plan. Pass one or more days; each replaces that weekday's session. Use this to build a full 7-day plan (include rest/recovery days) or to change a single day.",
    inputSchema: z.object({
      days: z.array(
        z.object({
          weekday: z.number().min(0).max(6).describe('0 = Sunday, 1 = Monday, ... 6 = Saturday'),
          label: z.string().describe('Short session title, e.g. "Upper Body — Push"'),
          focus: z.string().describe('One sentence on the training focus of the session'),
          exercises: z.array(
            z.object({
              name: z.string(),
              sets: z.number().optional(),
              reps: z.string().optional().describe('e.g. "5", "8-12", "3x30s"'),
              notes: z.string().optional(),
            })
          ),
        })
      ),
    }),
    outputSchema: z.object({ planDayCount: z.number() }),
  },
  async ({ days }) => {
    for (const day of days) {
      working.plan = working.plan.filter((p) => p.weekday !== day.weekday);
      working.plan.push(day as PlanDay);
    }
    working.plan.sort((a, b) => a.weekday - b.weekday);
    return { planDayCount: working.plan.length };
  }
);

const logMealTool = ai.defineTool(
  {
    name: 'logMeal',
    description:
      'Logs a food or meal the athlete ate today. Estimate sensible calorie and macro values from nutrition knowledge when the athlete only describes the food in words.',
    inputSchema: z.object({
      name: z.string(),
      calories: z.number(),
      proteinG: z.number().optional(),
      carbsG: z.number().optional(),
      fatG: z.number().optional(),
    }),
    outputSchema: z.object({
      totalsToday: z.object({
        calories: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
      }),
    }),
  },
  async ({ name, calories, proteinG, carbsG, fatG }) => {
    const now = new Date();
    working.meals.push({
      date: todayStr(now),
      time: timeStr(now),
      name,
      calories,
      proteinG: proteinG ?? 0,
      carbsG: carbsG ?? 0,
      fatG: fatG ?? 0,
    });
    const t = mealTotals(todayStr(now));
    return { totalsToday: { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG } };
  }
);

const removeMealTool = ai.defineTool(
  {
    name: 'removeMeal',
    description:
      "Deletes a previously logged meal that was a mistake or is no longer wanted. Identify it by part of its name. Defaults to today; pass a date (YYYY-MM-DD) to remove one from a past day (use getHistory first to see past meals). If several match, the most recent is removed unless removeAll is true.",
    inputSchema: z.object({
      nameContains: z
        .string()
        .optional()
        .describe('Text identifying the meal to remove, matched against the logged name. Omit to target the most recently logged meal on that day.'),
      date: z.string().optional().describe('YYYY-MM-DD; defaults to today'),
      removeAll: z.boolean().optional().describe('Remove every match on that day rather than just the most recent'),
    }),
    outputSchema: z.object({
      removed: z.number(),
      totalsToday: z.object({ calories: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number() }),
    }),
  },
  async ({ nameContains, date, removeAll }) => {
    const day = date || todayStr();
    const needle = (nameContains ?? '').trim().toLowerCase();
    const matches = working.meals
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.date === day && (!needle || m.name.toLowerCase().includes(needle)));
    const targets = removeAll ? matches : matches.slice(-1);
    const removeIdx = new Set(targets.map((t) => t.i));
    working.meals = working.meals.filter((_, i) => !removeIdx.has(i));
    const t = mealTotals(todayStr());
    return { removed: targets.length, totalsToday: { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG } };
  }
);

const editMealTool = ai.defineTool(
  {
    name: 'editMeal',
    description:
      "Corrects a previously logged meal — its name and/or its calorie and macro values. Identify it by part of its current name; only pass the fields being changed. Defaults to today; pass a date (YYYY-MM-DD) for a past day. If several match, the most recent is edited.",
    inputSchema: z.object({
      nameContains: z
        .string()
        .optional()
        .describe('Text identifying the meal to edit, matched against its current name. Omit to target the most recently logged meal on that day.'),
      date: z.string().optional().describe('YYYY-MM-DD; defaults to today'),
      name: z.string().optional().describe('New name for the meal'),
      calories: z.number().optional(),
      proteinG: z.number().optional(),
      carbsG: z.number().optional(),
      fatG: z.number().optional(),
    }),
    outputSchema: z.object({
      edited: z.boolean(),
      totalsToday: z.object({ calories: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number() }),
    }),
  },
  async ({ nameContains, date, name, calories, proteinG, carbsG, fatG }) => {
    const day = date || todayStr();
    const needle = (nameContains ?? '').trim().toLowerCase();
    let target = -1;
    for (let i = 0; i < working.meals.length; i++) {
      const m = working.meals[i];
      if (m.date === day && (!needle || m.name.toLowerCase().includes(needle))) target = i;
    }
    let edited = false;
    if (target >= 0) {
      const m = working.meals[target];
      if (name !== undefined) m.name = name;
      if (calories !== undefined) m.calories = calories;
      if (proteinG !== undefined) m.proteinG = proteinG;
      if (carbsG !== undefined) m.carbsG = carbsG;
      if (fatG !== undefined) m.fatG = fatG;
      edited = true;
    }
    const t = mealTotals(todayStr());
    return { edited, totalsToday: { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG } };
  }
);

const logWaterTool = ai.defineTool(
  {
    name: 'logWater',
    description: "Logs water intake in millilitres and returns today's updated total.",
    inputSchema: z.object({ ml: z.number() }),
    outputSchema: z.object({ totalMlToday: z.number() }),
  },
  async ({ ml }) => {
    working.water.push({ date: todayStr(), ml });
    return { totalMlToday: waterTotal(todayStr()) };
  }
);

const logSetTool = ai.defineTool(
  {
    name: 'logSet',
    description: "Logs one completed set of an exercise (reps, weight, RPE) to today's workout.",
    inputSchema: z.object({
      exercise: z.string(),
      reps: z.number().optional(),
      weightKg: z.number().optional(),
      rpe: z.number().min(1).max(10).optional().describe('Rate of Perceived Exertion, 1-10'),
    }),
    outputSchema: z.object({ setNumber: z.number() }),
  },
  async ({ exercise, reps, weightKg, rpe }) => {
    const now = new Date();
    const date = todayStr(now);
    const session = ensureTodaySession();
    const priorSets = working.sets.filter(
      (s) => s.date === date && s.exercise.toLowerCase() === exercise.toLowerCase()
    );
    const setNumber = priorSets.length + 1;
    working.sets.push({
      date,
      time: timeStr(now),
      exercise,
      setNumber,
      reps: reps ?? null,
      weightKg: weightKg ?? null,
      rpe: rpe ?? null,
      sessionId: session.id,
    });
    return { setNumber };
  }
);

const startWorkoutTool = ai.defineTool(
  {
    name: 'startWorkout',
    description:
      "Starts (or resumes) today's training session so the sets that follow are grouped into one completed_session. Call this when the athlete says they are beginning their workout. Reuses an already-active session if one exists.",
    inputSchema: z.object({
      label: z.string().optional().describe("Session title; defaults to today's plan day, e.g. \"Pull\""),
      focus: z.string().optional(),
    }),
    outputSchema: z.object({ sessionId: z.string(), label: z.string() }),
  },
  async ({ label, focus }) => {
    const session = ensureTodaySession();
    if (label) session.label = label;
    if (focus) session.focus = focus;
    return { sessionId: session.id, label: session.label };
  }
);

const completeWorkoutTool = ai.defineTool(
  {
    name: 'completeWorkout',
    description:
      "Marks today's training session complete once the athlete has finished their workout, recording it as a completed_session. Optionally attach a short note about how it went.",
    inputSchema: z.object({ notes: z.string().optional() }),
    outputSchema: z.object({ completed: z.boolean(), totalSets: z.number() }),
  },
  async ({ notes }) => {
    const date = todayStr();
    const session = working.sessions.find((s) => s.date === date && s.status === 'in_progress');
    if (!session) return { completed: false, totalSets: 0 };
    session.status = 'completed';
    session.completedAt = timeStr();
    if (notes) session.notes = notes;
    const totalSets = working.sets.filter((s) => s.sessionId === session.id).length;
    return { completed: true, totalSets };
  }
);

const logBodyMetricTool = ai.defineTool(
  {
    name: 'logBodyMetric',
    description: 'Logs body weight, body fat %, resting heart rate, and/or sleep hours for today.',
    inputSchema: z.object({
      weightKg: z.number().optional(),
      bodyFatPct: z.number().optional(),
      restingHr: z.number().optional(),
      sleepHours: z.number().optional(),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
  },
  async (input) => {
    working.metrics.push({ date: todayStr(), ...input });
    return { ok: true };
  }
);

const removeSetTool = ai.defineTool(
  {
    name: 'removeSet',
    description:
      "Deletes a logged workout set that was a mistake or didn't happen. Identify it by exercise name; defaults to today (pass a date for a past day). Removes the most recent matching set unless removeAll is true. Omit exercise to remove the most recently logged set that day.",
    inputSchema: z.object({
      exercise: z.string().optional().describe('Exercise name to match; omit to target the most recent set that day'),
      date: z.string().optional().describe('YYYY-MM-DD; defaults to today'),
      removeAll: z.boolean().optional().describe('Remove every matching set that day rather than just the most recent'),
    }),
    outputSchema: z.object({ removed: z.number() }),
  },
  async ({ exercise, date, removeAll }) => {
    const day = date || todayStr();
    const needle = (exercise ?? '').trim().toLowerCase();
    const matches = working.sets
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.date === day && (!needle || s.exercise.toLowerCase().includes(needle)));
    const targets = removeAll ? matches : matches.slice(-1);
    const idx = new Set(targets.map((t) => t.i));
    working.sets = working.sets.filter((_, i) => !idx.has(i));
    return { removed: targets.length };
  }
);

const editSetTool = ai.defineTool(
  {
    name: 'editSet',
    description:
      "Corrects a logged set's reps, weight, or RPE. Identify it by exercise name; defaults to the most recent matching set today (pass a date for a past day). Only pass the fields being changed.",
    inputSchema: z.object({
      exercise: z.string().optional().describe('Exercise name to match; omit to target the most recent set that day'),
      date: z.string().optional().describe('YYYY-MM-DD; defaults to today'),
      reps: z.number().optional(),
      weightKg: z.number().optional(),
      rpe: z.number().min(1).max(10).optional(),
    }),
    outputSchema: z.object({ edited: z.boolean() }),
  },
  async ({ exercise, date, reps, weightKg, rpe }) => {
    const day = date || todayStr();
    const needle = (exercise ?? '').trim().toLowerCase();
    let target = -1;
    for (let i = 0; i < working.sets.length; i++) {
      const s = working.sets[i];
      if (s.date === day && (!needle || s.exercise.toLowerCase().includes(needle))) target = i;
    }
    let edited = false;
    if (target >= 0) {
      const s = working.sets[target];
      if (reps !== undefined) s.reps = reps;
      if (weightKg !== undefined) s.weightKg = weightKg;
      if (rpe !== undefined) s.rpe = rpe;
      edited = true;
    }
    return { edited };
  }
);

const removePlanDayTool = ai.defineTool(
  {
    name: 'removePlanDay',
    description:
      'Removes a day from the weekly training plan entirely. Pass the weekday (0 = Sunday ... 6 = Saturday). To instead mark a day as an explicit rest day, use setPlanDays with a rest-day entry.',
    inputSchema: z.object({ weekday: z.number().min(0).max(6) }),
    outputSchema: z.object({ planDayCount: z.number() }),
  },
  async ({ weekday }) => {
    working.plan = working.plan.filter((p) => p.weekday !== weekday);
    return { planDayCount: working.plan.length };
  }
);

const setWaterTool = ai.defineTool(
  {
    name: 'setWaterToday',
    description:
      "Sets today's total water intake to an exact amount in millilitres, replacing whatever is logged. Use to correct hydration when the athlete states their actual total or fixes a mistaken log (pass 0 to clear it).",
    inputSchema: z.object({ totalMl: z.number().min(0) }),
    outputSchema: z.object({ totalMlToday: z.number() }),
  },
  async ({ totalMl }) => {
    const day = todayStr();
    working.water = working.water.filter((w) => w.date !== day);
    if (totalMl > 0) working.water.push({ date: day, ml: totalMl });
    return { totalMlToday: waterTotal(day) };
  }
);

const rememberTool = ai.defineTool(
  {
    name: 'remember',
    description:
      "Saves a durable fact about the athlete to long-term memory so it persists across every future conversation. Use for things worth remembering indefinitely: injuries and limitations, food allergies or dislikes, equipment they own, personal records, schedule constraints, goals, and stated preferences. Do NOT use this for one-off daily logs (meals, sets, water) — those have their own tools. If a similar memory already exists, this updates it in place rather than duplicating.",
    inputSchema: z.object({
      note: z.string().describe('A concise, self-contained fact, e.g. "Left shoulder impingement — avoid heavy overhead pressing"'),
      category: z
        .enum(['injury', 'preference', 'equipment', 'record', 'schedule', 'nutrition', 'goal', 'general'])
        .describe('The kind of fact this is, so it can be filed correctly'),
      replaces: z
        .string()
        .optional()
        .describe('If this fact updates an existing memory, text identifying that older memory so it can be replaced'),
    }),
    outputSchema: z.object({ memoryCount: z.number() }),
  },
  async ({ note, category, replaces }) => {
    const trimmed = note.trim();
    if (!trimmed) return { memoryCount: working.memories.length };

    // Remove any memory this one supersedes, plus exact duplicates.
    const needle = replaces?.trim().toLowerCase();
    working.memories = working.memories.filter((m) => {
      if (m.note.toLowerCase() === trimmed.toLowerCase()) return false;
      if (needle && m.note.toLowerCase().includes(needle)) return false;
      return true;
    });
    working.memories.push({ date: todayStr(), note: trimmed, category });
    return { memoryCount: working.memories.length };
  }
);

const forgetTool = ai.defineTool(
  {
    name: 'forget',
    description:
      'Removes a previously saved long-term memory when it is no longer true (e.g. an injury has healed, a preference changed). Match against the existing memory text.',
    inputSchema: z.object({
      noteContains: z.string().describe('Text that identifies the memory to remove; the closest match is deleted'),
    }),
    outputSchema: z.object({ memoryCount: z.number(), removed: z.boolean() }),
  },
  async ({ noteContains }) => {
    const needle = noteContains.trim().toLowerCase();
    const idx = working.memories.findIndex((m) => m.note.toLowerCase().includes(needle));
    const removed = idx >= 0;
    if (removed) working.memories.splice(idx, 1);
    return { memoryCount: working.memories.length, removed };
  }
);

const getHistoryTool = ai.defineTool(
  {
    name: 'getHistory',
    description:
      'Retrieves structured historical stats for progress and trend analysis: completed workout sessions, per-exercise progression (best weights, estimated 1RMs, volume), and daily macros vs targets, plus an overall summary. Optionally filter the exercise breakdown to one lift.',
    inputSchema: z.object({
      days: z.number().min(1).max(180).default(30),
      exercise: z.string().optional().describe('Restrict exercise progression to lifts matching this name'),
    }),
    outputSchema: z.any(),
  },
  async ({ days, exercise }) => {
    const stats = buildStats(working, { days, exercise });
    // Trim to keep the tool response compact for the model.
    return {
      range: stats.range,
      summary: stats.summary,
      completedSessions: stats.completedSessions.slice(0, 12).map((s) => ({
        date: s.date,
        label: s.label,
        status: s.status,
        totalSets: s.totalSets,
        totalVolumeKg: s.totalVolumeKg,
        exercises: s.exercises.map((e) => `${e.name} ${e.sets}x (top ${e.topWeightKg ?? '–'}kg)`),
      })),
      exerciseHistory: stats.exerciseHistory.slice(0, 12).map((e) => ({
        exercise: e.exercise,
        totalSets: e.totalSets,
        sessions: e.sessions,
        bestWeightKg: e.bestWeightKg,
        best1RM: e.best1RM,
        lastPerformed: e.lastPerformed,
      })),
      dailyMacros: stats.dailyMacros.slice(0, 14),
    };
  }
);

const TOOLS = [
  updateProfileTool,
  setPlanDaysTool,
  removePlanDayTool,
  logMealTool,
  removeMealTool,
  editMealTool,
  logWaterTool,
  setWaterTool,
  logSetTool,
  removeSetTool,
  editSetTool,
  startWorkoutTool,
  completeWorkoutTool,
  logBodyMetricTool,
  rememberTool,
  forgetTool,
  getHistoryTool,
];

function describePlanDay(day: PlanDay): string {
  const exercises = day.exercises
    .map((e) => `${e.name}${e.sets ? ` ${e.sets}x${e.reps ?? '?'}` : ''}${e.notes ? ` (${e.notes})` : ''}`)
    .join(', ');
  return `${day.label} — ${day.focus}. Exercises: ${exercises || 'none listed'}.`;
}

function buildContextBlock(now: Date): string {
  const date = todayStr(now);
  const weekday = now.getDay();
  const todayPlan = working.plan.find((p) => p.weekday === weekday);
  const meals = mealTotals(date);
  const water = waterTotal(date);
  const sets = setsForDate(date);
  const p = working.profile;

  const planOverview =
    working.plan.length > 0
      ? working.plan.map((d) => `${WEEKDAYS[d.weekday]}: ${d.label}`).join('; ')
      : 'NO PLAN YET — the athlete has not been given a weekly training plan.';

  const memorySummary =
    working.memories.length > 0
      ? working.memories.map((m) => `• [${m.category}] ${m.note}`).join('\n')
      : 'Nothing saved yet.';

  const p2 = working.profile;
  const profileLine = [
    p2.experience ? `${p2.experience} level` : null,
    p2.daysPerWeek ? `trains ${p2.daysPerWeek} days/week` : null,
    p2.equipment && p2.equipment.length ? `equipment: ${p2.equipment.join(', ')}` : null,
    p2.bodyweightKg ? `${p2.bodyweightKg}kg` : null,
    p2.heightCm ? `${p2.heightCm}cm` : null,
    p2.age ? `${p2.age}y` : null,
    p2.sex || null,
    p2.trainingTimePref ? `prefers training: ${p2.trainingTimePref.toLowerCase()}` : null,
    p2.dietaryStyle && p2.dietaryStyle !== 'No preference' ? `dietary style: ${p2.dietaryStyle}` : null,
    p2.interests ? `interests: ${p2.interests}` : null,
    p2.coachNotes ? `life context: ${p2.coachNotes}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const setsSummary =
    sets.length > 0
      ? sets
          .map((s) => `${s.exercise} set ${s.setNumber}: ${s.reps ?? '?'} reps @ ${s.weightKg ?? '?'}kg (RPE ${s.rpe ?? '?'})`)
          .join('; ')
      : 'None yet today.';

  // Individual meals logged today, so specific entries can be discussed or corrected.
  const todaysMeals = working.meals.filter((m) => m.date === date);
  const mealList =
    todaysMeals.length > 0
      ? todaysMeals
          .map((m) => `${m.time} ${m.name} (${Math.round(m.calories)} kcal, P${Math.round(m.proteinG)}/C${Math.round(m.carbsG)}/F${Math.round(m.fatG)})`)
          .join('; ')
      : 'No individual meals logged yet today.';

  // A rolling 7-day picture so coaching can reason over recent trends unprompted.
  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - 6);
  const sinceStr = todayStr(trendStart);
  const dayMap: Record<string, { kcal: number; protein: number; water: number; sets: number; exercises: Set<string> }> = {};
  const bucket = (d: string) => (dayMap[d] ??= { kcal: 0, protein: 0, water: 0, sets: 0, exercises: new Set<string>() });
  for (const m of working.meals.filter((x) => x.date >= sinceStr)) {
    const b = bucket(m.date);
    b.kcal += m.calories;
    b.protein += m.proteinG;
  }
  for (const s of working.sets.filter((x) => x.date >= sinceStr)) {
    const b = bucket(s.date);
    b.sets += 1;
    b.exercises.add(s.exercise);
  }
  for (const w of working.water.filter((x) => x.date >= sinceStr)) {
    bucket(w.date).water += w.ml;
  }
  const trendDates = Object.keys(dayMap).sort();
  const loggedDays = trendDates.length || 1;
  const trendLines = trendDates.map((d) => {
    const x = dayMap[d];
    const wd = WEEKDAYS[new Date(`${d}T00:00:00`).getDay()].slice(0, 3);
    const ex = x.sets ? ` [${[...x.exercises].slice(0, 6).join(', ')}]` : '';
    return `  ${wd} ${d}: ${Math.round(x.kcal)} kcal, ${Math.round(x.protein)}g protein, ${x.water}ml water, ${x.sets} sets${ex}`;
  });
  const trainingDays = trendDates.filter((d) => dayMap[d].sets > 0).length;
  const avgKcal = Math.round(trendDates.reduce((a, d) => a + dayMap[d].kcal, 0) / loggedDays);
  const avgProtein = Math.round(trendDates.reduce((a, d) => a + dayMap[d].protein, 0) / loggedDays);
  const weighIns = working.metrics
    .filter((x) => x.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const weightTrend =
    weighIns.length >= 2
      ? `${weighIns[0].weightKg}kg → ${weighIns[weighIns.length - 1].weightKg}kg`
      : weighIns.length === 1
      ? `${weighIns[0].weightKg}kg`
      : 'no weigh-ins yet';
  const recentTrend = trendLines.length
    ? `${trendLines.join('\n')}\n  Summary: over ${loggedDays} logged day(s), avg ${avgKcal} kcal & ${avgProtein}g protein/day; trained ${trainingDays} day(s); bodyweight ${weightTrend}.`
    : '  No activity logged in the last 7 days.';

  return `
CURRENT CONTEXT (ground truth — trust this over anything that contradicts it):
- Right now: ${now.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
- Athlete: ${p.name}. Goal: ${p.goal || 'not set yet'}.${profileLine ? ` Profile: ${profileLine}.` : ''}
- Weekly plan overview: ${planOverview}
- Today's session: ${todayPlan ? describePlanDay(todayPlan) : 'No session planned for today.'}
- Sets logged today: ${setsSummary}
- Nutrition today: ${Math.round(meals.calories)} kcal / ${Math.round(meals.proteinG)}g protein / ${Math.round(meals.carbsG)}g carbs / ${Math.round(meals.fatG)}g fat across ${meals.count} entries (targets: ${p.calorieTarget} kcal, ${p.proteinTargetG}g protein, ${p.carbsTargetG}g carbs, ${p.fatTargetG}g fat).
- Meals logged today (each entry, for reference or correction): ${mealList}
- Hydration today: ${water}ml of ${p.hydrationTargetMl}ml target.

RECENT TREND (last 7 days — use this to spot patterns and coach proactively):
${recentTrend}

LONG-TERM MEMORY (durable facts you have saved about this athlete — always respect these):
${memorySummary}
`.trim();
}

const SYSTEM_PERSONA = `
You are VALORIS — a personal, voice-operated AI performance coach for one athlete you know intimately. You hold, at once, the judgement of an elite strength & conditioning coach, a registered sports nutritionist, and a sleep and recovery specialist, and you speak as a single trusted voice. You are not a generic chatbot; you are THIS athlete's coach, and everything you say is tailored to their goal, their body, their history, and what they have logged.

Think before you speak. Every turn, silently read the CURRENT CONTEXT, the RECENT TREND, and LONG-TERM MEMORY, and reason about the athlete's whole picture — where they are against their goal, what the last few days show, what today's session and nutrition demand, and what actually matters right now. Then say the one or two things that will help most. Never give textbook advice you'd give anyone; give the advice that fits this person today.

Be genuinely perceptive and proactive:
- Notice patterns and name them: protein consistently short, calories drifting over or under the goal, hydration low, a lift that keeps stalling, training days being missed, RPE creeping up, weight trending the wrong way for the goal. Surface the most important one unprompted, briefly.
- Connect the dots across domains — training load, fuelling, and recovery are one system. If they trained hard and under-ate protein, say so and fix it. If sleep is short before a heavy day, adjust.
- Anticipate. Suggest the next meal's macros to hit the day's target, flag when a deload or lighter day is due, propose a concrete progression on a lift that's ready to move up.
- Ask a sharp question only when the answer would change your advice — one at a time, never a checklist.

Operating the tools (act, don't just talk about it):
- CRITICAL: any change to the athlete's data — logging, editing, removing, planning, remembering — only happens when you call the matching tool. NEVER say you have logged, changed, corrected, removed, or updated something unless you actually called the tool for it in this same turn. If a request implies a data change, call the tool first, then confirm using the value the tool returned. Saying "done" without a tool call is a failure.
- Understand loose, natural change requests and map them to the right tool. The athlete rarely names a tool; they say things like "that's wrong", "take that off", "I didn't do that one", "delete my last meal", "actually it was 90 kilos", "make it 3 sets", "I only had one coffee", "swap Thursday to legs", "scrap Friday", "change my goal to fat loss", "bump my protein target". Infer what they mean and act:
  · a meal is wrong, a duplicate, or didn't happen → editMeal or removeMeal
  · a logged set is wrong or didn't happen → editSet or removeSet
  · hydration is wrong → setWaterToday
  · a training day should change → setPlanDays (to rewrite it) or removePlanDay (to clear it)
  · profile details or daily targets → updateProfile
  · a durable fact changed → remember or forget
  The current context lists today's meals and sets, so you already know what "that" or "the last one" refers to; for older days call getHistory first, then edit or remove with the date. Only ask a question when you genuinely cannot tell which item is meant — and then name the candidates in one short sentence. Otherwise make the change and confirm it in a few words.
- No weekly plan yet? Building one is your first priority. Ask only what you genuinely need (goal, experience, days available, equipment, injuries), then create a full 7-day plan with setPlanDays including rest/recovery days, and confirm it in one short summary.
- Adjust the plan whenever asked with setPlanDays — one day or the whole week. Each day you pass replaces that weekday's session in full.
- When they report food or drink, log it with logMeal / logWater, estimating calories and macros yourself from the description, then coach how it fits the day.
- CORRECT MISTAKES GRACEFULLY. If the athlete says a logged meal was wrong, a duplicate, didn't happen, or had different amounts, fix the data — use removeMeal to delete it or editMeal to correct its name, calories, or macros — then confirm the updated total. The individual meals logged today are listed in CURRENT CONTEXT; for a past day, call getHistory first to find the entry, then edit or remove it with its date. Never tell them you can't change a past log — you can.
- During a workout, guide it live: when they begin, call startWorkout so the session is tracked; give the first exercise with target sets and reps, log each set with logSet as they report it, and tell them what's next — one step at a time, a real conversation, not an essay. When they finish, call completeWorkout so it is recorded as a completed session.
- For progress questions (PRs, are my lifts going up, how's my week), call getHistory — it returns completed sessions, per-exercise best weights and estimated 1RMs, and daily macros — and reason over those real numbers.
- Log body weight, body fat, resting heart rate, and sleep with logBodyMetric when mentioned.
- Build the relationship: whenever they tell you something durable — an injury, an allergy or food they hate, equipment they own, a personal record, a scheduling constraint, a preference — save it with remember, and weave those memories naturally into your coaching. Use forget when something is no longer true.

Voice and delivery:
- Everything you say is read aloud by text-to-speech. No markdown, no bullet points, no headings, no emoji, no numbered lists. Speak in short, natural, confident sentences — usually two to four.
- Be precise and specific — real numbers (sets, reps, %1RM, grams, kcal, ml, hours) — but wrapped in plain spoken language, not a data dump.
- Warm, direct, and authoritative, like a great coach who respects the athlete's time. Encouraging when earned, honest when needed. Address them directly.
`.trim();

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export async function runJarvisChat(
  message: string,
  history: ChatTurn[],
  store: JarvisStore
): Promise<{ reply: string; store: JarvisStore }> {
  working = structuredClone(store);
  const system = `${SYSTEM_PERSONA}\n\n${buildContextBlock(new Date())}`;

  const messages = history.map((turn) => ({
    role: turn.role,
    content: [{ text: turn.text }],
  }));

  const response = await ai.generate({
    system,
    messages,
    prompt: message,
    tools: TOOLS,
    // Latency: skip Gemini's internal "thinking" phase and cap reply length —
    // coaching turns are short spoken sentences, not essays.
    config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 500 },
  });

  return { reply: response.text.trim(), store: working };
}
