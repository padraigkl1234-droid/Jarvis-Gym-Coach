/**
 * Hand-built pixel-grid sprites for the Home-screen avatar. Each pose is an
 * 18x23 grid of single-character codes rendered by PixelAvatar as crisp
 * SVG squares — genuine low-res "bit style" art, no image assets.
 */

import { darken, lighten } from './color';
import { DEFAULT_AVATAR_CUSTOMIZATION, type AvatarCustomization } from './customization';

export type AvatarState = 'idle' | 'full' | 'flexed' | 'charged';
/** Everything PixelAvatar can actually render — mood states plus room-only poses. */
export type AvatarPose = AvatarState | 'sitting' | 'sleeping' | 'walk1' | 'walk2';

/** Builds the full letter->hex palette from the athlete's chosen base colors
 *  (Settings > Customize avatar), deriving the small highlight/shadow accents
 *  so the sprite stays coherent no matter what they pick. */
export function buildAvatarPalette(custom: AvatarCustomization = DEFAULT_AVATAR_CUSTOMIZATION): Record<string, string> {
  return {
    h: custom.hair,
    H: lighten(custom.hair, 0.08), // hair highlight (side-part sheen)
    s: custom.skin,
    k: '#2A2620', // outline / eyes / mouth / brows
    c: custom.shirt,
    o: darken(custom.shirt, 0.16), // shirt shadow (hem / collar notch)
    d: custom.shorts,
    l: lighten(custom.shorts, 0.19), // shorts waistband trim
    w: custom.shoes,
    e: darken(custom.shoes, 0.14), // shoe heel shadow
    g: '#7C8B6F', // sage accent (unused by any pose yet)
    z: darken(custom.skin, 0.06), // bicep highlight
  };
}

export const AVATAR_PALETTE: Record<string, string> = buildAvatarPalette();

const W = 18;
const H = 23;

function blank(): string[][] {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
}

function span(g: string[][], y: number, x0: number, x1: number, ch: string) {
  for (let x = x0; x <= x1; x++) if (g[y]) g[y][x] = ch;
}

function px(g: string[][], x: number, y: number, ch: string) {
  if (g[y]) g[y][x] = ch;
}

/** Head + neck occupy rows 0-8: hair / forehead+brows / eyes / gap / mouth / chin / neck,
 *  with small ear bumps and a hair-part highlight for a touch more shape. */
function head(g: string[][], eyes: 'open' | 'closed' | 'happy', mouth: 'flat' | 'smile') {
  span(g, 0, 6, 11, 'h'); // hair top
  span(g, 1, 5, 12, 'h');
  px(g, 7, 1, 'H'); // side-part sheen
  span(g, 2, 5, 12, 'h'); // hair, solid (no fringe noise)
  px(g, 4, 3, 's'); // ears
  px(g, 13, 3, 's');
  span(g, 3, 5, 12, 's'); // forehead
  span(g, 4, 5, 12, 's'); // eye row (marks added below)
  span(g, 5, 5, 12, 's'); // gap row, blank
  span(g, 6, 6, 11, 's'); // mouth row (marks added below)
  span(g, 7, 6, 11, 's'); // chin, blank
  span(g, 8, 8, 9, 's'); // neck

  if (eyes === 'open') {
    px(g, 7, 4, 'k');
    px(g, 10, 4, 'k');
  } else if (eyes === 'closed') {
    span(g, 4, 6, 7, 'k');
    span(g, 4, 10, 11, 'k');
  } else {
    px(g, 6, 3, 'k');
    px(g, 7, 4, 'k');
    px(g, 10, 4, 'k');
    px(g, 11, 3, 'k');
  }
  if (mouth === 'smile') {
    px(g, 7, 6, 'k');
    px(g, 8, 7, 'k');
    px(g, 9, 7, 'k');
    px(g, 10, 6, 'k');
  } else {
    span(g, 6, 8, 9, 'k');
  }
}

/** Shirt + shorts occupy rows 9-17, with a collar notch, a hem shadow, and a
 *  waistband trim line for a bit more shape. Straight rectangles — no taper —
 *  so arms (drawn on top, same row range) always sit flush with no gaps. */
function torso(g: string[][], bellyBulge: boolean) {
  const t0 = bellyBulge ? 4 : 5;
  const t1 = bellyBulge ? 13 : 12;
  for (const y of [9, 10, 11, 12, 13]) span(g, y, t0, t1, 'c');
  span(g, 13, t0, t1, 'o'); // hem shadow
  px(g, 8, 9, 'o'); // collar notch
  px(g, 9, 9, 'o');
  for (const y of [14, 15, 16, 17]) span(g, y, t0, t1, 'd');
  span(g, 14, t0, t1, 'l'); // waistband trim
}

/** Standing legs + shoes, rows 18-22, with a small heel-shadow accent. */
function legsStanding(g: string[][]) {
  for (const y of [18, 19, 20, 21]) {
    span(g, y, 5, 7, 's');
    span(g, y, 10, 12, 's');
  }
  span(g, 22, 4, 7, 'w');
  px(g, 4, 22, 'e');
  span(g, 22, 10, 13, 'w');
  px(g, 13, 22, 'e');
}

/** A walking stride: the lead leg is planted flat and stepped outward, the
 *  trailing leg is shorter with its heel lifted a row off the ground — two
 *  calls with opposite `lead` values alternate into a real walk cycle. */
function legsWalking(g: string[][], lead: 'left' | 'right') {
  const left = { legs: [4, 6] as const, shoe: [3, 6] as const, heel: 3 };
  const right = { legs: [11, 13] as const, shoe: [11, 14] as const, heel: 14 };
  const front = lead === 'left' ? left : right;
  const back = lead === 'left' ? right : left;

  // Front leg: stepped forward, foot planted flat on the ground.
  for (const y of [18, 19, 20, 21]) span(g, y, front.legs[0], front.legs[1], 's');
  span(g, 22, front.shoe[0], front.shoe[1], 'w');
  px(g, front.heel, 22, 'e');

  // Back leg: trailing, heel lifted off the ground mid-stride.
  for (const y of [18, 19, 20]) span(g, y, back.legs[0], back.legs[1], 's');
  span(g, 21, back.shoe[0], back.shoe[1], 'w');
}

function armsDown(g: string[][]) {
  span(g, 10, 3, 4, 'c');
  span(g, 10, 13, 14, 'c');
  for (const y of [11, 12, 13, 14]) {
    span(g, y, 3, 4, 's');
    span(g, y, 13, 14, 's');
  }
}

function armsRestingOnBelly(g: string[][]) {
  span(g, 10, 3, 4, 'c');
  span(g, 10, 13, 14, 'c');
  span(g, 11, 4, 5, 's');
  span(g, 11, 12, 13, 's');
  span(g, 12, 6, 11, 's'); // arms meet in a single clean band across the belly
  span(g, 13, 6, 11, 's');
}

/** A raised arm: shoulder -> vertical forearm bar -> a wider fist beside the head, both sides. */
function armsFlexed(g: string[][]) {
  span(g, 10, 3, 4, 'c');
  span(g, 10, 13, 14, 'c');
  for (const y of [7, 8, 9, 10]) {
    span(g, y, 1, 2, 's');
    span(g, y, 15, 16, 's');
  }
  span(g, 6, 0, 2, 's');
  span(g, 6, 15, 17, 's');
  px(g, 0, 10, 'z');
  px(g, 17, 10, 'z');
}

/** A single pixel "Z" (top bar, stepped diagonal, bottom bar) floating above the head. */
function zzz(g: string[][]) {
  span(g, 0, 12, 16, 'k');
  px(g, 15, 1, 'k');
  px(g, 14, 2, 'k');
  px(g, 13, 3, 'k');
  span(g, 4, 12, 16, 'k');
}

/** Shortened torso/legs so the figure reads as sitting once composited onto a sofa/seat. */
function torsoSitting(g: string[][]) {
  for (const y of [9, 10, 11, 12, 13]) span(g, y, 5, 12, 'c');
  span(g, 13, 5, 12, 'o');
  px(g, 8, 9, 'o');
  px(g, 9, 9, 'o');
  for (const y of [14, 15]) span(g, y, 5, 12, 'd');
  span(g, 14, 5, 12, 'l');
  span(g, 16, 5, 7, 's');
  span(g, 16, 10, 12, 's');
  span(g, 17, 4, 7, 'w');
  px(g, 4, 17, 'e');
  span(g, 17, 10, 13, 'w');
  px(g, 13, 17, 'e');
}

function buildPose(state: AvatarPose): string[][] {
  const g = blank();
  if (state === 'idle') {
    head(g, 'open', 'flat');
    torso(g, false);
    legsStanding(g);
    armsDown(g);
  } else if (state === 'full') {
    head(g, 'closed', 'smile');
    torso(g, true);
    legsStanding(g);
    armsRestingOnBelly(g);
    zzz(g);
  } else if (state === 'flexed') {
    head(g, 'open', 'flat');
    torso(g, false);
    legsStanding(g);
    armsFlexed(g);
  } else if (state === 'sitting') {
    head(g, 'open', 'smile');
    torsoSitting(g);
    armsDown(g);
  } else if (state === 'sleeping') {
    // Napping on the sofa: seated, eyes closed, hands resting on the belly.
    head(g, 'closed', 'smile');
    torsoSitting(g);
    armsRestingOnBelly(g);
    zzz(g);
  } else if (state === 'walk1' || state === 'walk2') {
    head(g, 'open', 'flat');
    torso(g, false);
    legsWalking(g, state === 'walk1' ? 'left' : 'right');
    armsDown(g);
  } else {
    // charged
    head(g, 'happy', 'smile');
    torso(g, false);
    legsStanding(g);
    armsFlexed(g);
  }
  return g;
}

export const AVATAR_POSES: Record<AvatarPose, string[][]> = {
  idle: buildPose('idle'),
  full: buildPose('full'),
  flexed: buildPose('flexed'),
  charged: buildPose('charged'),
  sitting: buildPose('sitting'),
  sleeping: buildPose('sleeping'),
  walk1: buildPose('walk1'),
  walk2: buildPose('walk2'),
};

export const AVATAR_GRID_SIZE = { width: W, height: H };
