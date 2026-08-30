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

export type SceneId =
  // positions
  | 'mount'
  | 'back-control'
  | 'side-control'
  | 'knee-on-belly'
  | 'north-south'
  | 'closed-guard'
  | 'half-guard'
  | 'butterfly-guard'
  | 'delariva-guard'
  | 'turtle'
  | 'fifty-fifty'
  | 'standing'
  // submissions — each drawn as the actual finishing mechanics
  | 'rnc'
  | 'rear-triangle'
  | 'bow-arrow'
  | 'triangle'
  | 'armbar'
  | 'kimura'
  | 'americana'
  | 'guillotine'
  | 'darce'
  | 'ezekiel'
  | 'omoplata'
  | 'heel-hook'
  | 'ankle-lock'
  | 'kneebar'
  | 'arm-triangle'
  | 'collar-choke'
  | 'ns-choke'
  | 'peruvian'
  // sweeps
  | 'scissor-sweep'
  | 'hip-bump'
  | 'butterfly-sweep'
  | 'x-guard'
  | 'berimbolo-inv'
  // escapes
  | 'upa'
  | 'shrimp-escape'
  | 'frames'
  // takedowns
  | 'double-leg'
  | 'single-leg'
  | 'reap'
  | 'foot-sweep'
  | 'arm-drag'
  // guard passes
  | 'toreando'
  | 'knee-cut'
  | 'stack'
  | 'leg-drag';

export type Highlight = 'neck' | 'arm' | 'leg' | 'shoulder';

/** A technique in the reference library: what it's attempted from, named variants, and a coaching cue. */
export interface BjjTechniqueRef {
  name: string;
  category: BjjCategory;
  from?: string[]; // positions this is commonly attempted from
  variants?: string[]; // named variations worth cross-training
  cue?: string; // one-line coaching cue
  description: string; // 1-2 sentence explainer for the library
  scene: SceneId; // which diagram to show
  highlight?: Highlight; // finishing detail to ring on the diagram
}

export const BJJ_LIBRARY: BjjTechniqueRef[] = [
  // ---- Submissions ----
  {
    name: 'Rear Naked Choke',
    category: 'submission',
    from: ['Back Control', 'Turtle'],
    variants: ['Standard RNC', 'Rolling Back-Take RNC', 'Body Triangle RNC'],
    cue: 'Chin strap first to kill the frame, then float the choking arm in — don’t rush the seatbelt.',
    description:
      'A blood choke applied from the back, sliding one arm under the chin while the other hand supports behind the head — the single most reliable finish in the sport once the back is secured.',
    scene: 'rnc',
    highlight: 'neck',
  },
  {
    name: 'Triangle Choke',
    category: 'submission',
    from: ['Closed Guard', 'Mount'],
    variants: ['Standard Triangle', 'Reverse Triangle', 'Gogoplata setup'],
    cue: 'Angle off to 45° before locking the legs — a flat triangle almost never finishes.',
    description:
      'The legs form a triangle around the neck and one arm, using the opponent’s own shoulder to cut off blood flow on one side while your leg does the other.',
    scene: 'triangle',
    highlight: 'neck',
  },
  {
    name: 'Armbar',
    category: 'submission',
    from: ['Closed Guard', 'Mount', 'Back Control', 'Guard Passing'],
    variants: ['Juji Gatame from Guard', 'S-Mount Armbar', 'Back-Take Armbar'],
    cue: 'Control the far-side wrist and hip-escape perpendicular before extending — thumb up on the finish.',
    description:
      'Hyperextends the elbow by trapping the arm between your legs and driving the hips up, with your knees pinching together so it can’t rotate free.',
    scene: 'armbar',
    highlight: 'arm',
  },
  {
    name: 'Kimura',
    category: 'submission',
    from: ['Side Control', 'Half Guard', 'Closed Guard', 'Turtle'],
    variants: ['Kimura Trap System', 'Standing Kimura', 'Kimura to Back Take'],
    cue: 'Figure-four the grip before you try to move the arm — the lock does the work, not your strength.',
    description:
      'A figure-four shoulder lock on a bent arm — one of the most transferable holds in the sport since it works from top and bottom, standing and on the ground.',
    scene: 'kimura',
    highlight: 'shoulder',
  },
  {
    name: 'Americana',
    category: 'submission',
    from: ['Side Control', 'Mount'],
    variants: ['Americana from North-South'],
    cue: 'Pin the wrist to the mat and paint the arm down toward their hip in an S-shape.',
    description:
      'A bent-arm shoulder lock, usually caught when an opponent pushes on your chest from underneath — pin the wrist and paint the arm down in an S-shape.',
    scene: 'americana',
    highlight: 'shoulder',
  },
  {
    name: 'Guillotine Choke',
    category: 'submission',
    from: ['Closed Guard', 'Standing', 'Turtle'],
    variants: ['High Elbow Guillotine', 'Arm-In Guillotine', 'Marcelotine'],
    cue: 'High-elbow grip and drop your hips — a low elbow lets them posture out.',
    description:
      'A front choke applied when the head gets trapped under the arm, using the forearm (or collar in gi) across the throat while the legs stop them posturing away.',
    scene: 'guillotine',
    highlight: 'neck',
  },
  {
    name: 'Ezekiel Choke',
    category: 'submission',
    from: ['Mount', 'Guard'],
    variants: ['Ezekiel from Turtle'],
    cue: 'Sleeve grip under the chin, sit up slightly for angle rather than pulling straight back.',
    description:
      'A sleeve-and-fist choke that needs no gi grip on the opponent — useful when your legs and torso already have them pinned but your hands are otherwise occupied.',
    scene: 'ezekiel',
    highlight: 'neck',
  },
  {
    name: 'Omoplata',
    category: 'submission',
    from: ['Closed Guard', 'Half Guard'],
    variants: ['Omoplata to Sweep', 'Omoplata to Back Take'],
    cue: 'Control the far hip before you spin under — without it they just roll through.',
    description:
      'A shoulder lock that uses the legs instead of the arms, spinning the trapped arm behind the opponent’s back while your leg pins their head and shoulder to the mat.',
    scene: 'omoplata',
    highlight: 'shoulder',
  },
  {
    name: 'Darce Choke (D’Arce)',
    category: 'submission',
    from: ['Front Headlock', 'Turtle', 'Half Guard Top'],
    variants: ['Darce from Sprawl', 'Darce to Anaconda switch'],
    cue: 'Get the far shoulder deep before you finish the grip — a shallow darce just squeezes shoulder.',
    description:
      'A blood choke from a front headlock or turtle, threading one arm under the far armpit and the other around the neck to form a figure-four.',
    scene: 'darce',
    highlight: 'neck',
  },
  {
    name: 'Anaconda Choke',
    category: 'submission',
    from: ['Front Headlock', 'Turtle'],
    variants: ['Anaconda Roll to Mount'],
    cue: 'Commit to the roll through once locked — hesitating loses the finish.',
    description:
      'A close cousin of the darce set up from the opposite side, finished by rolling all the way through onto your back or into mount.',
    scene: 'darce',
    highlight: 'neck',
  },
  {
    name: 'Rear Triangle',
    category: 'submission',
    from: ['Back Control'],
    variants: [],
    cue: 'Use it when they defend the RNC hand-fight — the choking arm becomes redundant with a locked leg.',
    description:
      'A leg-triangle finish from the back, caught when the hand-fight successfully defends the classic RNC — the same mechanism as the guard triangle, applied from behind.',
    scene: 'rear-triangle',
    highlight: 'neck',
  },
  {
    name: 'Heel Hook',
    category: 'submission',
    from: ['50/50 Guard', 'Ashi Garami', 'Saddle'],
    variants: ['Inside Heel Hook', 'Outside Heel Hook', 'Saddle Heel Hook'],
    cue: 'Break the knee line and control the hip before you crank — control first, torque second.',
    description:
      'A leg lock that twists the ankle to torque the knee — extremely fast and often not felt until real damage is done, so secure control before you ever apply torque.',
    scene: 'heel-hook',
    highlight: 'leg',
  },
  {
    name: 'Straight Ankle Lock',
    category: 'submission',
    from: ['Guard', 'Ashi Garami'],
    variants: ['Standing Ankle Lock'],
    cue: 'Trap the foot against your hip/armpit so they can’t rotate the ankle away from the pressure.',
    description:
      'Hyperextends the ankle by trapping the foot against your hip and arching your own hips — usually the first leg lock most athletes ever learn.',
    scene: 'ankle-lock',
    highlight: 'leg',
  },
  {
    name: 'Kneebar',
    category: 'submission',
    from: ['Guard', 'Leg Entanglements'],
    variants: [],
    cue: 'Get hip-to-hip with your leg over theirs before extending — chasing it from distance telegraphs the escape.',
    description:
      'Hyperextends the knee joint like an inverted armbar for the leg — get hip-to-hip with your leg over theirs before extending, or the escape is easy.',
    scene: 'kneebar',
    highlight: 'leg',
  },
  {
    name: 'Bow and Arrow Choke',
    category: 'submission',
    from: ['Back Control'],
    variants: [],
    cue: 'Trap the far leg with yours before you pull — without the leg trap they just sit up.',
    description:
      'A powerful collar choke from the back that traps one of the opponent’s legs with yours before pulling, turning your whole body into the lever.',
    scene: 'bow-arrow',
    highlight: 'neck',
  },
  {
    name: 'Arm Triangle',
    category: 'submission',
    from: ['Side Control', 'North-South', 'Mount'],
    variants: ['Anaconda-style Arm Triangle', 'Kata Gatame'],
    cue: 'Walk your hips around 90° before you squeeze — most failed arm triangles are just missing the angle.',
    description:
      'Squeezes the opponent’s own shoulder against their neck using your arm and body weight — needs the correct head angle far more than raw strength.',
    scene: 'arm-triangle',
    highlight: 'neck',
  },
  {
    name: 'Cross Collar Choke',
    category: 'submission',
    from: ['Closed Guard', 'Mount'],
    variants: ['Cross Collar from Back'],
    cue: 'Deep first grip to the far collar, second hand goes in palm-up for max depth.',
    description: 'A gi choke using deep opposite-side collar grips, palms up, that closes around the neck like scissors.',
    scene: 'collar-choke',
    highlight: 'neck',
  },
  {
    name: 'North-South Choke',
    category: 'submission',
    from: ['North-South'],
    variants: [],
    cue: 'Drive your shoulder into their far cheek to stop them turning into you as you lock the choke.',
    description:
      'An unusual but effective choke from north-south position, driving your shoulder into the far cheek and locking the arms around the neck.',
    scene: 'ns-choke',
    highlight: 'neck',
  },
  {
    name: 'Peruvian Necktie',
    category: 'submission',
    from: ['Turtle', 'Sprawl'],
    variants: [],
    cue: 'Sit through hard to the opposite side to load the choke rather than just pulling on the neck.',
    description:
      'A guillotine variant applied from turtle or a scramble, sitting through hard to the far side to load the choke rather than pulling straight back on the neck.',
    scene: 'peruvian',
    highlight: 'neck',
  },

  // ---- Positions ----
  {
    name: 'Mount',
    category: 'position',
    from: ['Guard Pass', 'Sweep', 'Back Take transition'],
    variants: ['High Mount', 'S-Mount', 'Technical Mount'],
    cue: 'Ride high on the chest with low hips so they can’t bridge you off.',
    description:
      'Sitting astride the opponent’s torso — the single most dominant control position in jiu jitsu, from which nearly every submission is available.',
    scene: 'mount',
  },
  {
    name: 'Back Control',
    category: 'position',
    from: ['Turtle', 'Guard Pass', 'Sweep'],
    variants: ['Body Triangle', 'Hooks-In Back Control'],
    cue: 'Chase the seatbelt grip before the hooks — grips first, legs second.',
    description:
      'Behind the opponent with hooks or a body triangle in and a seatbelt grip around the torso — statistically the highest-percentage finishing position in the sport.',
    scene: 'back-control',
  },
  {
    name: 'Side Control',
    category: 'position',
    from: ['Guard Pass'],
    variants: ['Kesa Gatame', 'Modified Side Control'],
    cue: 'Keep your hips heavy and cross-face tight to stop the reguard.',
    description: 'Pinned perpendicular across the opponent’s torso, using chest pressure and a cross-face to stop them recovering guard.',
    scene: 'side-control',
  },
  {
    name: 'Knee on Belly',
    category: 'position',
    from: ['Side Control'],
    variants: [],
    cue: 'Keep the far-side grip live so a shrimp doesn’t buy them the reset.',
    description:
      'A mobile pin with one knee driven into the stomach — uncomfortable enough to provoke a reaction, which is exactly what opens up the next attack.',
    scene: 'knee-on-belly',
  },
  {
    name: 'Closed Guard',
    category: 'position',
    from: [],
    variants: ['High Guard'],
    cue: 'Break their posture with a collar/wrist combo before you commit to an attack.',
    description:
      'Legs locked around the opponent’s waist from underneath — not a bad spot at all, since it controls distance and opens up sweeps and submissions alike.',
    scene: 'closed-guard',
  },
  {
    name: 'Half Guard',
    category: 'position',
    from: [],
    variants: ['Deep Half Guard', 'Lockdown Half Guard', 'Z-Guard'],
    cue: 'Get the underhook or the knee shield — passive half guard just gets smashed.',
    description:
      'One of the opponent’s legs is trapped between yours — a flexible, defensible position that’s also a launchpad for sweeps once you add an underhook.',
    scene: 'half-guard',
  },
  {
    name: 'Butterfly Guard',
    category: 'position',
    from: [],
    variants: ['Butterfly with Overhooks'],
    cue: 'Keep hips close and hooks in early so the sweep is one motion, not two.',
    description: 'Seated with both feet hooked inside the opponent’s thighs, using hip elevation to sweep or take the back.',
    scene: 'butterfly-guard',
  },
  {
    name: 'De La Riva Guard',
    category: 'position',
    from: [],
    variants: ['Reverse De La Riva'],
    cue: 'Off-balance first with the DLR hook before attacking the far leg.',
    description:
      'An outside hook behind the opponent’s leg that lets you off-balance and attack from a distance — the gateway to a huge modern guard-passing puzzle.',
    scene: 'delariva-guard',
  },
  {
    name: 'Turtle',
    category: 'position',
    from: [],
    variants: [],
    cue: 'Keep elbows in tight to deny the far-side hooks and the seatbelt.',
    description:
      'Curled onto hands and knees to protect the neck and back — a defensive waypoint, though also where a lot of chokes are caught if you stay too long.',
    scene: 'turtle',
  },
  {
    name: '50/50 Guard',
    category: 'position',
    from: [],
    variants: [],
    cue: 'Win the grip fight for the far heel before either player attacks — grips decide 50/50.',
    description:
      'Both athletes’ legs intertwined, each with a leg trapped — a heavy leg-lock battleground where grips on the far foot usually decide who wins first.',
    scene: 'fifty-fifty',
  },

  // ---- Sweeps ----
  {
    name: 'Scissor Sweep',
    category: 'sweep',
    from: ['Closed Guard'],
    variants: [],
    cue: 'Break their posture and pull the sleeve as you scissor — timing beats strength here.',
    description: 'A closed-guard classic — one leg scissors across the opponent’s base as you pull their sleeve, timing beating strength.',
    scene: 'scissor-sweep',
  },
  {
    name: 'Flower Sweep (Pendulum)',
    category: 'sweep',
    from: ['Closed Guard'],
    variants: [],
    cue: 'Trap the arm and swing the leg through a wide arc, not a short kick.',
    description: 'Traps one arm and swings a leg through a wide pendulum arc to tip the opponent forward and over.',
    scene: 'scissor-sweep',
  },
  {
    name: 'Hip Bump Sweep',
    category: 'sweep',
    from: ['Closed Guard'],
    variants: ['Hip Bump to Armbar'],
    cue: 'Post the hand near their hip and sit up fast — hesitation lets them base out.',
    description: 'A fast sit-up sweep off a failed armbar attempt — post a hand near the hip and sit up before they can base out.',
    scene: 'hip-bump',
  },
  {
    name: 'Butterfly Sweep',
    category: 'sweep',
    from: ['Butterfly Guard'],
    variants: ['Butterfly to Back Take'],
    cue: 'Get the underhook and elevate off the near hook while pulling the same-side shoulder.',
    description: 'Elevates the opponent off a butterfly hook while pulling the same-side shoulder — a staple of the seated open-guard game.',
    scene: 'butterfly-sweep',
  },
  {
    name: 'X-Guard Sweep',
    category: 'sweep',
    from: ['X-Guard'],
    variants: ['Single-Leg X Sweep'],
    cue: 'Off-balance them backward before lifting the leg — lifting alone rarely tips a base.',
    description: 'From underneath the opponent’s base leg, off-balances them backward before lifting — a high-percentage finish to many leg entries.',
    scene: 'x-guard',
  },
  {
    name: 'Berimbolo',
    category: 'sweep',
    from: ['De La Riva Guard'],
    variants: ['Berimbolo to Back Take'],
    cue: 'Commit the roll through fully to the far hip or you just get passed mid-roll.',
    description:
      'A rolling back-take/sweep from De La Riva guard that inverts underneath the opponent to attack their back from below — technical, but a big weapon once drilled.',
    scene: 'berimbolo-inv',
  },
  {
    name: 'Elevator Sweep',
    category: 'sweep',
    from: ['Guard'],
    variants: [],
    cue: 'Hook deep behind the far knee and combine with an upper-body pull for one clean motion.',
    description: 'Hooks deep behind the far knee and combines it with an upper-body pull to lift and roll the opponent over in one motion.',
    scene: 'butterfly-sweep',
  },
  {
    name: 'Waiter Sweep',
    category: 'sweep',
    from: ['Half Guard'],
    variants: [],
    cue: 'Underhook first, then lift through their base leg like a tray — don’t muscle it flat.',
    description: 'From half guard, an underhook plus a lift through the opponent’s base leg tips them over like a waiter losing a tray.',
    scene: 'butterfly-sweep',
  },

  // ---- Escapes ----
  {
    name: 'Upa (Mount Escape)',
    category: 'escape',
    from: ['Mount'],
    variants: ['Upa to Single Leg'],
    cue: 'Trap an arm and a same-side leg before bridging — bridging without the trap just resets them.',
    description: 'A bridging escape from bottom mount — trap an arm and same-side leg, then bridge explosively to roll the opponent over.',
    scene: 'upa',
  },
  {
    name: 'Elbow-Knee Escape',
    category: 'escape',
    from: ['Mount'],
    variants: [],
    cue: 'Frame on the hip first, then shrimp — the frame is what creates the space, not the shrimp.',
    description: 'Frames on the hip to create space, then shrimps the hips out to rebuild guard — the fundamental way out of bottom mount.',
    scene: 'shrimp-escape',
  },
  {
    name: 'Side Control Escape',
    category: 'escape',
    from: ['Side Control'],
    variants: ['Underhook Escape to Guard', 'Turn-In Escape to Turtle'],
    cue: 'Get both forearm frames in before moving your hips — frames stop the crush that traps you.',
    description: 'Uses forearm frames on the hip and neck to create space before shrimping back to guard or turning in to turtle.',
    scene: 'frames',
  },
  {
    name: 'Back Escape',
    category: 'escape',
    from: ['Back Control'],
    variants: [],
    cue: 'Peel one hook at a time and turn into them — turning away lets the choke find you.',
    description: 'Peels the hooks off one at a time while turning into the opponent, since turning away just gives them the choke.',
    scene: 'back-control',
  },
  {
    name: 'Guard Recovery',
    category: 'escape',
    from: ['Half Guard', 'Knee on Belly'],
    variants: [],
    cue: 'Shrimp to create the angle before pulling guard back — a flat recovery attempt gets smashed.',
    description: 'Shrimps to create an angle and pulls guard back after a pass attempt — half guard and knee-on-belly are the most common places to need it.',
    scene: 'shrimp-escape',
  },
  {
    name: 'Kimura Escape',
    category: 'escape',
    from: ['Kimura trap'],
    variants: ['Rolling Kimura Escape'],
    cue: 'Rotate your trapped elbow toward your own hip immediately — don’t let the figure-four fully lock.',
    description: 'Rotates the trapped elbow toward your own hip the instant the figure-four grip starts to lock, before the lever fully forms.',
    scene: 'kimura',
  },
  {
    name: 'Triangle Escape',
    category: 'escape',
    from: ['Triangle Choke'],
    variants: ['Stack Pass Escape'],
    cue: 'Posture up and stack their hips over their own head before they finish the angle.',
    description: 'Postures up and stacks the opponent’s hips over their own head before the triangle angle is finished.',
    scene: 'stack',
  },

  // ---- Takedowns ----
  {
    name: 'Double Leg',
    category: 'takedown',
    from: [],
    variants: ['Double Leg to Back'],
    cue: 'Penetration step deep with a low level change — a shallow shot gets sprawled.',
    description: 'A deep penetration step and a low level change to drive through both of the opponent’s legs — the bread-and-butter wrestling takedown.',
    scene: 'double-leg',
  },
  {
    name: 'Single Leg',
    category: 'takedown',
    from: [],
    variants: ['Running the Pipe', 'Single Leg to Sweep'],
    cue: 'Get the outside angle and control the hip, not just the ankle.',
    description: 'Attacks one leg from an outside angle, controlling the hip rather than just the ankle before finishing the takedown.',
    scene: 'single-leg',
  },
  {
    name: 'Osoto Gari',
    category: 'takedown',
    from: [],
    variants: [],
    cue: 'Break their balance to the rear corner before you reap — timing off a push/pull, not the leg alone.',
    description: 'A judo throw that off-balances the opponent to their rear corner with a push-pull before reaping the leg out from under them.',
    scene: 'reap',
  },
  {
    name: 'Uchi Mata',
    category: 'takedown',
    from: [],
    variants: [],
    cue: 'Load their weight onto your supporting leg fully before you turn in.',
    description: 'Loads the opponent’s weight onto your supporting leg, then turns in and lifts with the inner thigh to throw them off their base.',
    scene: 'reap',
  },
  {
    name: 'Arm Drag to Back Take',
    category: 'takedown',
    from: [],
    variants: [],
    cue: 'Angle off after the drag rather than staying square — the angle is what gets you the back.',
    description: 'Pulls the opponent’s arm across their body to create an angle, stepping around to their back before they can square back up.',
    scene: 'arm-drag',
  },
  {
    name: 'Foot Sweep (De Ashi Barai)',
    category: 'takedown',
    from: [],
    variants: [],
    cue: 'Time it to their weightless step — sweeping a weighted foot just costs you the grip fight.',
    description: 'Times a sweep to the exact moment the opponent’s foot is weightless mid-step — sweeping a weighted foot just burns your grip.',
    scene: 'foot-sweep',
  },
  {
    name: 'Ankle Pick',
    category: 'takedown',
    from: [],
    variants: [],
    cue: 'Combine with a collar-tie to break posture as you drop for the ankle.',
    description: 'Combines a collar-tie to break posture with a drop for the near ankle, taking the base out from underneath.',
    scene: 'foot-sweep',
  },

  // ---- Guard Passes ----
  {
    name: 'Toreando Pass',
    category: 'guard_pass',
    from: [],
    variants: ['Toreando to Knee Slice'],
    cue: 'Control both pant cuffs and step around fast — a slow toreando lets them recover to butterfly.',
    description: 'Controls both pant cuffs (or shins) and steps around the legs like a matador’s cape — fast, but needs speed or it invites a recovery.',
    scene: 'toreando',
  },
  {
    name: 'Knee Cut (Knee Slice)',
    category: 'guard_pass',
    from: [],
    variants: ['Knee Cut to Leg Drag'],
    cue: 'Cross-face and underhook before sliding the knee — no upper body control means they roll you.',
    description: 'Cross-faces and underhooks before sliding a knee through the opponent’s half guard, converting straight to side control.',
    scene: 'knee-cut',
  },
  {
    name: 'Over-Under Pass',
    category: 'guard_pass',
    from: [],
    variants: ['Over-Under to Stack'],
    cue: 'Stand your near-side leg up to load pressure before driving through.',
    description: 'One arm over a leg, one arm under the other — a heavy pressure pass that stands a leg up before driving through.',
    scene: 'stack',
  },
  {
    name: 'Leg Drag Pass',
    category: 'guard_pass',
    from: [],
    variants: [],
    cue: 'Pin the dragged leg to the mat with your own leg before advancing — a floating drag gets re-guarded.',
    description: 'Drags one of the opponent’s legs across your own body and pins it to the mat, taking away half of their guard retention at once.',
    scene: 'leg-drag',
  },
  {
    name: 'Stack Pass',
    category: 'guard_pass',
    from: [],
    variants: [],
    cue: 'Get both grips on the same side before stacking, or they’ll just recover half guard.',
    description: 'Folds the opponent’s hips up and over toward their own head, using gravity and same-side grips to flatten the guard out.',
    scene: 'stack',
  },
  {
    name: 'X-Pass',
    category: 'guard_pass',
    from: [],
    variants: [],
    cue: 'Post your head-side hand and swing the far leg through — keep your base wide as you land.',
    description: 'Posts a head-side hand on the mat and swings the far leg through in an X-shaped step, landing with a wide, stable base.',
    scene: 'toreando',
  },
  {
    name: 'Double Under Pass',
    category: 'guard_pass',
    from: [],
    variants: ['Double Under to Mount'],
    cue: 'Stand up with both underhooks before committing to the drop, or you get swept on the way up.',
    description: 'Both arms underhook the opponent’s legs before standing up with them — a strength-forward pass into a stacked mount or knee cut.',
    scene: 'stack',
  },
  {
    name: 'Long Step Pass',
    category: 'guard_pass',
    from: [],
    variants: [],
    cue: 'Take the far knee to the mat before stepping — a short step lets the knee shield reset.',
    description: 'Takes the far knee all the way to the mat in one long step before advancing, denying the knee-shield reset a shorter step would allow.',
    scene: 'knee-cut',
  },
  {
    name: 'Smash Pass',
    category: 'guard_pass',
    from: [],
    variants: [],
    cue: 'Chest pressure into the near-side shoulder before flattening the far hip.',
    description: 'Drives chest pressure into the near shoulder before flattening the far hip, smothering the guard rather than out-maneuvering it.',
    scene: 'knee-cut',
  },
];

export interface BjjSequence {
  id: string;
  title: string;
  description: string;
  steps: string[]; // technique/position names, in order — each must exist in BJJ_LIBRARY
}

/** Curated technique chains — how positions and finishes actually connect in a live roll. */
export const BJJ_SEQUENCES: BjjSequence[] = [
  {
    id: 'mount-to-back',
    title: 'Mount → Back Take → Finish',
    description: 'The highest-percentage path in the sport: once mount is secure, take the back the moment they turn away, then finish.',
    steps: ['Mount', 'Back Control', 'Rear Naked Choke'],
  },
  {
    id: 'pass-to-kimura',
    title: 'Pass → Side Control → Kimura',
    description: 'A clean top-game chain from a controlling pass straight into one of the most transferable shoulder locks in the sport.',
    steps: ['Knee Cut (Knee Slice)', 'Side Control', 'Kimura'],
  },
  {
    id: 'scissor-to-choke',
    title: 'Scissor Sweep → Mount → Cross Collar Choke',
    description: 'A closed-guard classic: sweep to the top, ride into full mount, then finish with a deep gi choke.',
    steps: ['Scissor Sweep', 'Mount', 'Cross Collar Choke'],
  },
  {
    id: 'butterfly-to-back',
    title: 'Butterfly Sweep → Back Control → RNC',
    description: 'Elevate off the butterfly hook, land in back mount, and go straight to the highest-percentage finish in jiu jitsu.',
    steps: ['Butterfly Sweep', 'Back Control', 'Rear Naked Choke'],
  },
  {
    id: 'half-guard-recovery',
    title: 'Guard Recovery → Half Guard → Waiter Sweep → Mount',
    description: 'When a pass gets underway, shrimp back to half guard, work the underhook, and sweep straight back to top position.',
    steps: ['Guard Recovery', 'Half Guard', 'Waiter Sweep', 'Mount'],
  },
  {
    id: 'berimbolo-chain',
    title: 'De La Riva → Berimbolo → Back Control → Bow and Arrow',
    description: 'The modern leg-entanglement route to the back — invert under from De La Riva, land on the back, and finish with a collar choke.',
    steps: ['De La Riva Guard', 'Berimbolo', 'Back Control', 'Bow and Arrow Choke'],
  },
  {
    id: 'turtle-darce',
    title: 'Turtle → Darce Choke',
    description: 'A common scramble finish — when an opponent turtles up defending a pass, the far-side headlock is right there.',
    steps: ['Turtle', 'Darce Choke (D’Arce)'],
  },
  {
    id: 'double-leg-armbar',
    title: 'Double Leg → Side Control → Knee on Belly → Armbar',
    description: 'A wrestling-into-jiu-jitsu chain: take the fight to the mat, advance position, and finish off the knee-on-belly reaction.',
    steps: ['Double Leg', 'Side Control', 'Knee on Belly', 'Armbar'],
  },
  {
    id: 'omoplata-chain',
    title: 'Closed Guard → Omoplata → Back Control',
    description: 'When the omoplata finish gets defended by rolling, ride the roll into the opponent’s back instead.',
    steps: ['Closed Guard', 'Omoplata', 'Back Control'],
  },
  {
    id: 'guillotine-chain',
    title: 'Single Leg → Guillotine Choke',
    description: 'A common no-gi finish off a stuffed takedown attempt — as they shoot and get sprawled on, the head is right there to trap.',
    steps: ['Single Leg', 'Guillotine Choke'],
  },
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

type ExperienceTier = 'beginner' | 'advanced' | 'default';

function tierOf(experience?: string): ExperienceTier {
  const e = (experience ?? '').toLowerCase();
  if (/beginner|new|novice|white belt/.test(e)) return 'beginner';
  if (/advanced|expert|competitor|black belt|brown belt/.test(e)) return 'advanced';
  return 'default';
}

// How forgiving a "struggling" call is, and how high a bar "strong" is, by
// experience level — a beginner landing 40% of the time is doing great; the
// same rate for an advanced athlete is a real gap.
const TIER_THRESHOLDS: Record<ExperienceTier, { struggleMax: number; strongMin: number }> = {
  beginner: { struggleMax: 0.45, strongMin: 0.5 },
  default: { struggleMax: 0.35, strongMin: 0.6 },
  advanced: { struggleMax: 0.3, strongMin: 0.7 },
};

/**
 * The rule-based "BJJ brain": scans recent logs for struggling techniques,
 * standout techniques worth expanding, and untrained category gaps, and
 * turns each into a concrete, named suggestion pulled from BJJ_LIBRARY.
 * `experience` (Beginner/Intermediate/Advanced, from the athlete's profile)
 * tunes both the land-rate thresholds and the coaching tone.
 */
export function generateBjjSuggestions(logs: BjjLogEntry[], experience?: string): BjjSuggestion[] {
  if (logs.length === 0) {
    return [
      {
        id: 'empty',
        title: 'Log your first roll',
        body: 'Track what you attempt and what lands each session — after a few sessions VALORIS will start spotting patterns and suggesting specific fixes.',
      },
    ];
  }

  const tier = tierOf(experience);
  const { struggleMax, strongMin } = TIER_THRESHOLDS[tier];
  const since = cutoffDate(60); // last ~2 months of rolling
  const stats = buildTechniqueStats(logs, since);
  const suggestions: BjjSuggestion[] = [];

  // 1) Struggling techniques: enough reps to mean something, but landing rarely.
  const struggling = stats.filter((s) => s.attempted >= 3 && s.landRate < struggleMax).sort((a, b) => a.landRate - b.landRate);
  for (const s of struggling.slice(0, 2)) {
    const ref = findTechniqueRef(s.name);
    const pct = Math.round(s.landRate * 100);
    const cueLine = ref?.cue ? ` Cue: ${ref.cue}` : '';
    const variant = ref?.variants?.[0];
    const variantLine = variant ? ` If it keeps stalling, try the ${variant} — a different entry can unstick it.` : '';
    const opener =
      tier === 'beginner'
        ? `You've landed it ${pct}% of the time over ${s.attempted} attempts — that's completely normal while it's new.`
        : `You've landed it ${pct}% of the time over ${s.attempted} attempts recently.`;
    suggestions.push({
      id: `struggle-${s.name}`,
      title: `Sharpen your ${s.name}`,
      body: `${opener}${cueLine}${variantLine}`,
    });
  }

  // 2) Strong techniques: worth expanding into named variants (or, for
  // advanced athletes, chaining into a follow-up when it's defended).
  const strong = stats.filter((s) => s.attempted >= 3 && s.landRate >= strongMin).sort((a, b) => b.landRate - a.landRate);
  for (const s of strong.slice(0, 2)) {
    const ref = findTechniqueRef(s.name);
    const pct = Math.round(s.landRate * 100);
    if (ref?.variants && ref.variants.length > 0) {
      const body =
        tier === 'advanced'
          ? `Landing at ${pct}% — time to chain it: if they defend the ${s.name}, flow straight into the ${ref.variants[0]} rather than resetting.`
          : `Landing at ${pct}% — it's a real weapon. Start layering in ${ref.variants.slice(0, 2).join(' or ')} so opponents can't just defend the one look.`;
      suggestions.push({
        id: `strong-${s.name}`,
        title: tier === 'advanced' ? `Chain off your ${s.name}` : `Expand your ${s.name}`,
        body,
      });
    }
  }

  // 3) Category gaps: things they should probably be logging/training but aren't.
  const breakdown = buildCategoryBreakdown(logs, since);

  // 3a) Beginner-specific: submissions logged far more than positions/escapes
  // is a common early mistake — control pays off more than hunting finishes.
  if (tier === 'beginner') {
    const posEscapeAttempts = breakdown.position.attempted + breakdown.escape.attempted;
    const subAttempts = breakdown.submission.attempted;
    if (subAttempts >= 5 && posEscapeAttempts < subAttempts * 0.4) {
      suggestions.push({
        id: 'beginner-fundamentals',
        title: 'Build the position before the finish',
        body: `You're logging a lot more submission attempts than positions or escapes. Early on, holding mount, back control, or side control — and escaping when you're underneath — pays off more than hunting finishes. Try a round focused purely on control.`,
      });
    }
  }
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
