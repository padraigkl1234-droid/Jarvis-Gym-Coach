/**
 * BJJ progression: a curated technique reference (the "BJJ brain") plus
 * rule-based analytics over logged rolls. No AI call required — deterministic,
 * explainable, instant — mirroring foodSuggestions.ts. An optional AI
 * narrative (BjjInsight / /api/bjj-insight) layers richer coaching language
 * on top of these same numbers.
 */

import type { BjjCategory, BjjContext, BjjLogEntry, BjjOutcome } from '@/lib/store';

export const BJJ_CATEGORIES: BjjCategory[] = ['submission', 'position', 'sweep', 'escape', 'takedown', 'guard_pass'];

export const BJJ_CATEGORY_META: Record<BjjCategory, { label: string; plural: string; glyph: string }> = {
  submission: { label: 'Submission', plural: 'Submissions', glyph: '◆' },
  position: { label: 'Position', plural: 'Positions', glyph: '▣' },
  sweep: { label: 'Sweep', plural: 'Sweeps', glyph: '↻' },
  escape: { label: 'Escape', plural: 'Escapes', glyph: '↗' },
  takedown: { label: 'Takedown', plural: 'Takedowns', glyph: '⇓' },
  guard_pass: { label: 'Guard Pass', plural: 'Guard Passes', glyph: '⇥' },
};

/** A technique in the reference library: what it's attempted from, named variants, and a coaching cue. */
export interface BjjTechniqueRef {
  name: string;
  category: BjjCategory;
  from?: string[]; // positions this is commonly attempted from
  variants?: string[]; // named variations worth cross-training
  cue?: string; // one-line coaching cue
}

export const BJJ_LIBRARY: BjjTechniqueRef[] = [
  // ---- Submissions ----
  {
    name: 'Rear Naked Choke',
    category: 'submission',
    from: ['Back Control', 'Turtle'],
    variants: ['Standard RNC', 'Rolling Back-Take RNC', 'Body Triangle RNC'],
    cue: 'Chin strap first to kill the frame, then float the choking arm in — don’t rush the seatbelt.',
  },
  {
    name: 'Triangle Choke',
    category: 'submission',
    from: ['Closed Guard', 'Mount'],
    variants: ['Standard Triangle', 'Reverse Triangle', 'Gogoplata setup'],
    cue: 'Angle off to 45° before locking the legs — a flat triangle almost never finishes.',
  },
  {
    name: 'Armbar',
    category: 'submission',
    from: ['Closed Guard', 'Mount', 'Back Control', 'Guard Passing'],
    variants: ['Juji Gatame from Guard', 'S-Mount Armbar', 'Back-Take Armbar'],
    cue: 'Control the far-side wrist and hip-escape perpendicular before extending — thumb up on the finish.',
  },
  {
    name: 'Kimura',
    category: 'submission',
    from: ['Side Control', 'Half Guard', 'Closed Guard', 'Turtle'],
    variants: ['Kimura Trap System', 'Standing Kimura', 'Kimura to Back Take'],
    cue: 'Figure-four the grip before you try to move the arm — the lock does the work, not your strength.',
  },
  {
    name: 'Americana',
    category: 'submission',
    from: ['Side Control', 'Mount'],
    variants: ['Americana from North-South'],
    cue: 'Pin the wrist to the mat and paint the arm down toward their hip in an S-shape.',
  },
  {
    name: 'Guillotine Choke',
    category: 'submission',
    from: ['Closed Guard', 'Standing', 'Turtle'],
    variants: ['High Elbow Guillotine', 'Arm-In Guillotine', 'Marcelotine'],
    cue: 'High-elbow grip and drop your hips — a low elbow lets them posture out.',
  },
  {
    name: 'Ezekiel Choke',
    category: 'submission',
    from: ['Mount', 'Guard'],
    variants: ['Ezekiel from Turtle'],
    cue: 'Sleeve grip under the chin, sit up slightly for angle rather than pulling straight back.',
  },
  {
    name: 'Omoplata',
    category: 'submission',
    from: ['Closed Guard', 'Half Guard'],
    variants: ['Omoplata to Sweep', 'Omoplata to Back Take'],
    cue: 'Control the far hip before you spin under — without it they just roll through.',
  },
  {
    name: 'Darce Choke (D’Arce)',
    category: 'submission',
    from: ['Front Headlock', 'Turtle', 'Half Guard Top'],
    variants: ['Darce from Sprawl', 'Darce to Anaconda switch'],
    cue: 'Get the far shoulder deep before you finish the grip — a shallow darce just squeezes shoulder.',
  },
  {
    name: 'Anaconda Choke',
    category: 'submission',
    from: ['Front Headlock', 'Turtle'],
    variants: ['Anaconda Roll to Mount'],
    cue: 'Commit to the roll through once locked — hesitating loses the finish.',
  },
  {
    name: 'Rear Triangle',
    category: 'submission',
    from: ['Back Control'],
    variants: [],
    cue: 'Use it when they defend the RNC hand-fight — the choking arm becomes redundant with a locked leg.',
  },
  {
    name: 'Heel Hook',
    category: 'submission',
    from: ['50/50 Guard', 'Ashi Garami', 'Saddle'],
    variants: ['Inside Heel Hook', 'Outside Heel Hook', 'Saddle Heel Hook'],
    cue: 'Break the knee line and control the hip before you crank — control first, torque second.',
  },
  {
    name: 'Straight Ankle Lock',
    category: 'submission',
    from: ['Guard', 'Ashi Garami'],
    variants: ['Standing Ankle Lock'],
    cue: 'Trap the foot against your hip/armpit so they can’t rotate the ankle away from the pressure.',
  },
  {
    name: 'Kneebar',
    category: 'submission',
    from: ['Guard', 'Leg Entanglements'],
    variants: [],
    cue: 'Get hip-to-hip with your leg over theirs before extending — chasing it from distance telegraphs the escape.',
  },
  {
    name: 'Bow and Arrow Choke',
    category: 'submission',
    from: ['Back Control'],
    variants: [],
    cue: 'Trap the far leg with yours before you pull — without the leg trap they just sit up.',
  },
  {
    name: 'Arm Triangle',
    category: 'submission',
    from: ['Side Control', 'North-South', 'Mount'],
    variants: ['Anaconda-style Arm Triangle', 'Kata Gatame'],
    cue: 'Walk your hips around 90° before you squeeze — most failed arm triangles are just missing the angle.',
  },
  {
    name: 'Cross Collar Choke',
    category: 'submission',
    from: ['Closed Guard', 'Mount'],
    variants: ['Cross Collar from Back'],
    cue: 'Deep first grip to the far collar, second hand goes in palm-up for max depth.',
  },
  {
    name: 'North-South Choke',
    category: 'submission',
    from: ['North-South'],
    variants: [],
    cue: 'Drive your shoulder into their far cheek to stop them turning into you as you lock the choke.',
  },
  {
    name: 'Peruvian Necktie',
    category: 'submission',
    from: ['Turtle', 'Sprawl'],
    variants: [],
    cue: 'Sit through hard to the opposite side to load the choke rather than just pulling on the neck.',
  },

  // ---- Positions ----
  { name: 'Mount', category: 'position', from: ['Guard Pass', 'Sweep', 'Back Take transition'], variants: ['High Mount', 'S-Mount', 'Technical Mount'], cue: 'Ride high on the chest with low hips so they can’t bridge you off.' },
  { name: 'Back Control', category: 'position', from: ['Turtle', 'Guard Pass', 'Sweep'], variants: ['Body Triangle', 'Hooks-In Back Control'], cue: 'Chase the seatbelt grip before the hooks — grips first, legs second.' },
  { name: 'Side Control', category: 'position', from: ['Guard Pass'], variants: ['Kesa Gatame', 'Modified Side Control'], cue: 'Keep your hips heavy and cross-face tight to stop the reguard.' },
  { name: 'Knee on Belly', category: 'position', from: ['Side Control'], variants: [], cue: 'Keep the far-side grip live so a shrimp doesn’t buy them the reset.' },
  { name: 'Closed Guard', category: 'position', from: [], variants: ['High Guard'], cue: 'Break their posture with a collar/wrist combo before you commit to an attack.' },
  { name: 'Half Guard', category: 'position', from: [], variants: ['Deep Half Guard', 'Lockdown Half Guard', 'Z-Guard'], cue: 'Get the underhook or the knee shield — passive half guard just gets smashed.' },
  { name: 'Butterfly Guard', category: 'position', from: [], variants: ['Butterfly with Overhooks'], cue: 'Keep hips close and hooks in early so the sweep is one motion, not two.' },
  { name: 'De La Riva Guard', category: 'position', from: [], variants: ['Reverse De La Riva'], cue: 'Off-balance first with the DLR hook before attacking the far leg.' },
  { name: 'Turtle', category: 'position', from: [], variants: [], cue: 'Keep elbows in tight to deny the far-side hooks and the seatbelt.' },
  { name: '50/50 Guard', category: 'position', from: [], variants: [], cue: 'Win the grip fight for the far heel before either player attacks — grips decide 50/50.' },

  // ---- Sweeps ----
  { name: 'Scissor Sweep', category: 'sweep', from: ['Closed Guard'], variants: [], cue: 'Break their posture and pull the sleeve as you scissor — timing beats strength here.' },
  { name: 'Flower Sweep (Pendulum)', category: 'sweep', from: ['Closed Guard'], variants: [], cue: 'Trap the arm and swing the leg through a wide arc, not a short kick.' },
  { name: 'Hip Bump Sweep', category: 'sweep', from: ['Closed Guard'], variants: ['Hip Bump to Armbar'], cue: 'Post the hand near their hip and sit up fast — hesitation lets them base out.' },
  { name: 'Butterfly Sweep', category: 'sweep', from: ['Butterfly Guard'], variants: ['Butterfly to Back Take'], cue: 'Get the underhook and elevate off the near hook while pulling the same-side shoulder.' },
  { name: 'X-Guard Sweep', category: 'sweep', from: ['X-Guard'], variants: ['Single-Leg X Sweep'], cue: 'Off-balance them backward before lifting the leg — lifting alone rarely tips a base.' },
  { name: 'Berimbolo', category: 'sweep', from: ['De La Riva Guard'], variants: ['Berimbolo to Back Take'], cue: 'Commit the roll through fully to the far hip or you just get passed mid-roll.' },
  { name: 'Elevator Sweep', category: 'sweep', from: ['Guard'], variants: [], cue: 'Hook deep behind the far knee and combine with an upper-body pull for one clean motion.' },
  { name: 'Waiter Sweep', category: 'sweep', from: ['Half Guard'], variants: [], cue: 'Underhook first, then lift through their base leg like a tray — don’t muscle it flat.' },

  // ---- Escapes ----
  { name: 'Upa (Mount Escape)', category: 'escape', from: ['Mount'], variants: ['Upa to Single Leg'], cue: 'Trap an arm and a same-side leg before bridging — bridging without the trap just resets them.' },
  { name: 'Elbow-Knee Escape', category: 'escape', from: ['Mount'], variants: [], cue: 'Frame on the hip first, then shrimp — the frame is what creates the space, not the shrimp.' },
  { name: 'Side Control Escape', category: 'escape', from: ['Side Control'], variants: ['Underhook Escape to Guard', 'Turn-In Escape to Turtle'], cue: 'Get both forearm frames in before moving your hips — frames stop the crush that traps you.' },
  { name: 'Back Escape', category: 'escape', from: ['Back Control'], variants: [], cue: 'Peel one hook at a time and turn into them — turning away lets the choke find you.' },
  { name: 'Guard Recovery', category: 'escape', from: ['Half Guard', 'Knee on Belly'], variants: [], cue: 'Shrimp to create the angle before pulling guard back — a flat recovery attempt gets smashed.' },
  { name: 'Kimura Escape', category: 'escape', from: ['Kimura trap'], variants: ['Rolling Kimura Escape'], cue: 'Rotate your trapped elbow toward your own hip immediately — don’t let the figure-four fully lock.' },
  { name: 'Triangle Escape', category: 'escape', from: ['Triangle Choke'], variants: ['Stack Pass Escape'], cue: 'Posture up and stack their hips over their own head before they finish the angle.' },

  // ---- Takedowns ----
  { name: 'Double Leg', category: 'takedown', from: [], variants: ['Double Leg to Back'], cue: 'Penetration step deep with a low level change — a shallow shot gets sprawled.' },
  { name: 'Single Leg', category: 'takedown', from: [], variants: ['Running the Pipe', 'Single Leg to Sweep'], cue: 'Get the outside angle and control the hip, not just the ankle.' },
  { name: 'Osoto Gari', category: 'takedown', from: [], variants: [], cue: 'Break their balance to the rear corner before you reap — timing off a push/pull, not the leg alone.' },
  { name: 'Uchi Mata', category: 'takedown', from: [], variants: [], cue: 'Load their weight onto your supporting leg fully before you turn in.' },
  { name: 'Arm Drag to Back Take', category: 'takedown', from: [], variants: [], cue: 'Angle off after the drag rather than staying square — the angle is what gets you the back.' },
  { name: 'Foot Sweep (De Ashi Barai)', category: 'takedown', from: [], variants: [], cue: 'Time it to their weightless step — sweeping a weighted foot just costs you the grip fight.' },
  { name: 'Ankle Pick', category: 'takedown', from: [], variants: [], cue: 'Combine with a collar-tie to break posture as you drop for the ankle.' },

  // ---- Guard Passes ----
  { name: 'Toreando Pass', category: 'guard_pass', from: [], variants: ['Toreando to Knee Slice'], cue: 'Control both pant cuffs and step around fast — a slow toreando lets them recover to butterfly.' },
  { name: 'Knee Cut (Knee Slice)', category: 'guard_pass', from: [], variants: ['Knee Cut to Leg Drag'], cue: 'Cross-face and underhook before sliding the knee — no upper body control means they roll you.' },
  { name: 'Over-Under Pass', category: 'guard_pass', from: [], variants: ['Over-Under to Stack'], cue: 'Stand your near-side leg up to load pressure before driving through.' },
  { name: 'Leg Drag Pass', category: 'guard_pass', from: [], variants: [], cue: 'Pin the dragged leg to the mat with your own leg before advancing — a floating drag gets re-guarded.' },
  { name: 'Stack Pass', category: 'guard_pass', from: [], variants: [], cue: 'Get both grips on the same side before stacking, or they’ll just recover half guard.' },
  { name: 'X-Pass', category: 'guard_pass', from: [], variants: [], cue: 'Post your head-side hand and swing the far leg through — keep your base wide as you land.' },
  { name: 'Double Under Pass', category: 'guard_pass', from: [], variants: ['Double Under to Mount'], cue: 'Stand up with both underhooks before committing to the drop, or you get swept on the way up.' },
  { name: 'Long Step Pass', category: 'guard_pass', from: [], variants: [], cue: 'Take the far knee to the mat before stepping — a short step lets the knee shield reset.' },
  { name: 'Smash Pass', category: 'guard_pass', from: [], variants: [], cue: 'Chest pressure into the near-side shoulder before flattening the far hip.' },
];

export function findTechniqueRef(name: string): BjjTechniqueRef | undefined {
  const q = name.trim().toLowerCase();
  return BJJ_LIBRARY.find((t) => t.name.toLowerCase() === q);
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, days - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface TechniqueStat {
  name: string;
  category: BjjCategory;
  attempted: number; // total logs (landed + attempted-only)
  landed: number;
  landRate: number; // 0-1, landed / attempted
  lastDate: string;
}

/** Per-technique attempt/land breakdown, most-recently-used first. */
export function buildTechniqueStats(logs: BjjLogEntry[], since?: string): TechniqueStat[] {
  const filtered = since ? logs.filter((l) => l.date >= since) : logs;
  const byName: Record<string, TechniqueStat & { key: string }> = {};
  for (const l of filtered) {
    const key = l.name.trim().toLowerCase();
    const stat = (byName[key] ??= { key, name: l.name.trim(), category: l.category, attempted: 0, landed: 0, landRate: 0, lastDate: l.date });
    stat.attempted += 1;
    if (l.outcome === 'landed') stat.landed += 1;
    if (l.date > stat.lastDate) stat.lastDate = l.date;
  }
  return Object.values(byName)
    .map((s) => ({ ...s, landRate: s.attempted > 0 ? s.landed / s.attempted : 0 }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

/** Attempted/landed totals rolled up by category. */
export function buildCategoryBreakdown(
  logs: BjjLogEntry[],
  since?: string
): Record<BjjCategory, { attempted: number; landed: number }> {
  const filtered = since ? logs.filter((l) => l.date >= since) : logs;
  const out = Object.fromEntries(BJJ_CATEGORIES.map((c) => [c, { attempted: 0, landed: 0 }])) as Record<
    BjjCategory,
    { attempted: number; landed: number }
  >;
  for (const l of filtered) {
    out[l.category].attempted += 1;
    if (l.outcome === 'landed') out[l.category].landed += 1;
  }
  return out;
}

export interface PeriodTrend {
  key: string; // e.g. "2026-W35" or "2026-08"
  label: string; // e.g. "Aug 24" or "Aug"
  sessions: number; // distinct days trained in this period
  attempted: number;
  landed: number;
  landRate: number;
}

function isoWeekKey(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // Mon=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  const label = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { key: `${y}-${m}-${dd}`, label };
}

/** Weekly attempted/landed trend, oldest first, `weeks` most recent weeks. */
export function buildWeeklyTrend(logs: BjjLogEntry[], weeks = 8): PeriodTrend[] {
  const since = cutoffDate(weeks * 7);
  const filtered = logs.filter((l) => l.date >= since);
  const byWeek: Record<string, { label: string; days: Set<string>; attempted: number; landed: number }> = {};
  for (const l of filtered) {
    const { key, label } = isoWeekKey(l.date);
    const bucket = (byWeek[key] ??= { label, days: new Set(), attempted: 0, landed: 0 });
    bucket.days.add(l.date);
    bucket.attempted += 1;
    if (l.outcome === 'landed') bucket.landed += 1;
  }
  return Object.entries(byWeek)
    .map(([key, b]) => ({ key, label: b.label, sessions: b.days.size, attempted: b.attempted, landed: b.landed, landRate: b.attempted > 0 ? b.landed / b.attempted : 0 }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Monthly attempted/landed trend, oldest first, `months` most recent months. */
export function buildMonthlyTrend(logs: BjjLogEntry[], months = 6): PeriodTrend[] {
  const since = cutoffDate(months * 31);
  const filtered = logs.filter((l) => l.date >= since);
  const byMonth: Record<string, { days: Set<string>; attempted: number; landed: number }> = {};
  for (const l of filtered) {
    const key = l.date.slice(0, 7); // YYYY-MM
    const bucket = (byMonth[key] ??= { days: new Set(), attempted: 0, landed: 0 });
    bucket.days.add(l.date);
    bucket.attempted += 1;
    if (l.outcome === 'landed') bucket.landed += 1;
  }
  return Object.entries(byMonth)
    .map(([key, b]) => {
      const label = new Date(key + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short' });
      return { key, label, sessions: b.days.size, attempted: b.attempted, landed: b.landed, landRate: b.attempted > 0 ? b.landed / b.attempted : 0 };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export interface BjjSuggestion {
  id: string;
  title: string;
  body: string;
}

/**
 * The rule-based "BJJ brain": scans recent logs for struggling techniques,
 * standout techniques worth expanding, and untrained category gaps, and
 * turns each into a concrete, named suggestion pulled from BJJ_LIBRARY.
 */
export function generateBjjSuggestions(logs: BjjLogEntry[]): BjjSuggestion[] {
  if (logs.length === 0) {
    return [
      {
        id: 'empty',
        title: 'Log your first roll',
        body: 'Track what you attempt and what lands each session — after a few sessions VALORIS will start spotting patterns and suggesting specific fixes.',
      },
    ];
  }

  const since = cutoffDate(60); // last ~2 months of rolling
  const stats = buildTechniqueStats(logs, since);
  const suggestions: BjjSuggestion[] = [];

  // 1) Struggling techniques: enough reps to mean something, but landing rarely.
  const struggling = stats.filter((s) => s.attempted >= 3 && s.landRate < 0.35).sort((a, b) => a.landRate - b.landRate);
  for (const s of struggling.slice(0, 2)) {
    const ref = findTechniqueRef(s.name);
    const pct = Math.round(s.landRate * 100);
    const cueLine = ref?.cue ? ` Cue: ${ref.cue}` : '';
    const variant = ref?.variants?.[0];
    const variantLine = variant ? ` If it keeps stalling, try the ${variant} — a different entry can unstick it.` : '';
    suggestions.push({
      id: `struggle-${s.name}`,
      title: `Sharpen your ${s.name}`,
      body: `You've landed it ${pct}% of the time over ${s.attempted} attempts recently.${cueLine}${variantLine}`,
    });
  }

  // 2) Strong techniques: worth expanding into named variants.
  const strong = stats.filter((s) => s.attempted >= 3 && s.landRate >= 0.6).sort((a, b) => b.landRate - a.landRate);
  for (const s of strong.slice(0, 2)) {
    const ref = findTechniqueRef(s.name);
    const pct = Math.round(s.landRate * 100);
    if (ref?.variants && ref.variants.length > 0) {
      suggestions.push({
        id: `strong-${s.name}`,
        title: `Expand your ${s.name}`,
        body: `Landing at ${pct}% — it's a real weapon. Start layering in ${ref.variants.slice(0, 2).join(' or ')} so opponents can't just defend the one look.`,
      });
    }
  }

  // 3) Category gaps: things they should probably be logging/training but aren't.
  const breakdown = buildCategoryBreakdown(logs, since);
  const totalLogs = Object.values(breakdown).reduce((a, c) => a + c.attempted, 0);
  if (totalLogs >= 5) {
    if (breakdown.guard_pass.attempted === 0 && (breakdown.submission.attempted > 0 || breakdown.position.attempted > 0)) {
      suggestions.push({
        id: 'gap-guard_pass',
        title: 'No guard passing logged yet',
        body: `You're tracking submissions and positions but no passes. Try the ${BJJ_LIBRARY.find((t) => t.name === 'Toreando Pass')!.name} or ${BJJ_LIBRARY.find((t) => t.name === 'Knee Cut (Knee Slice)')!.name} next session and log the attempts — top-position offence usually starts here.`,
      });
    }
    if (breakdown.escape.attempted === 0 && breakdown.submission.attempted + breakdown.position.attempted >= 4) {
      suggestions.push({
        id: 'gap-escape',
        title: 'No escapes logged yet',
        body: `Plenty of top-game logs but nothing on escapes. Defence compounds just as much as offence — start logging your Side Control Escape and Back Escape attempts too.`,
      });
    }
    if (breakdown.takedown.attempted === 0) {
      suggestions.push({
        id: 'gap-takedown',
        title: 'Standup is untracked',
        body: `No takedowns logged. Even a couple of Double Leg or Single Leg reps a session builds a much stronger entry into your best positions.`,
      });
    }
  }

  // 4) New-technique nudge from whichever category they use most, if room remains.
  if (suggestions.length < 3) {
    const mostUsedCategory = (Object.entries(breakdown) as [BjjCategory, { attempted: number; landed: number }][])
      .sort((a, b) => b[1].attempted - a[1].attempted)[0];
    if (mostUsedCategory && mostUsedCategory[1].attempted > 0) {
      const loggedNames = new Set(stats.map((s) => s.name.toLowerCase()));
      const untried = BJJ_LIBRARY.find((t) => t.category === mostUsedCategory[0] && !loggedNames.has(t.name.toLowerCase()));
      if (untried) {
        suggestions.push({
          id: `new-${untried.name}`,
          title: `Try the ${untried.name}`,
          body: `You train ${BJJ_CATEGORY_META[mostUsedCategory[0]].plural.toLowerCase()} a lot — the ${untried.name}${untried.from?.length ? ` from ${untried.from[0]}` : ''} is a natural addition to that game.${untried.cue ? ` Cue: ${untried.cue}` : ''}`,
        });
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'steady',
      title: 'Keep the reps coming',
      body: `Nothing standing out yet either way — log a few more sessions and VALORIS will start flagging what's landing and what needs work.`,
    });
  }

  return suggestions.slice(0, 5);
}
