/**
 * Hand-built pixel-grid sprites for the Home-screen avatar. Each pose is an
 * 18x23 grid of single-character codes rendered by PixelAvatar as crisp
 * SVG squares — genuine low-res "bit style" art, no image assets.
 */

export type AvatarState = 'idle' | 'full' | 'flexed' | 'charged';

export const AVATAR_PALETTE: Record<string, string> = {
  h: '#3A2E22', // hair
  s: '#E3B48C', // skin
  k: '#2A2620', // outline / eyes / mouth
  c: '#B4552F', // shirt (clay)
  d: '#8B3D20', // shorts (clay-dark)
  w: '#F5F4EE', // shoes (cream)
  g: '#7C8B6F', // sage accent (headband)
  z: '#C9A98A', // bicep highlight
};

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

/** Head + neck occupy rows 0-8, well spaced: hair / forehead / eyes / gap / mouth / chin / neck. */
function head(g: string[][], eyes: 'open' | 'closed' | 'happy', mouth: 'flat' | 'smile') {
  span(g, 0, 6, 11, 'h'); // hair top
  span(g, 1, 5, 12, 'h');
  span(g, 2, 5, 12, 'h'); // hair, solid (no fringe noise)
  span(g, 3, 5, 12, 's'); // forehead, blank
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

/** Shirt/shorts/legs/shoes occupy rows 9-22. Straight rectangles — no taper — so arms
 *  (drawn on top, same row range) always sit flush against the torso with no gaps. */
function torsoAndLegs(g: string[][], bellyBulge: boolean) {
  const t0 = bellyBulge ? 4 : 5;
  const t1 = bellyBulge ? 13 : 12;
  for (const y of [9, 10, 11, 12, 13]) span(g, y, t0, t1, 'c');
  for (const y of [14, 15, 16, 17]) span(g, y, t0, t1, 'd');
  for (const y of [18, 19, 20, 21]) {
    span(g, y, 5, 7, 's');
    span(g, y, 10, 12, 's');
  }
  span(g, 22, 4, 7, 'w');
  span(g, 22, 10, 13, 'w');
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

function buildPose(state: AvatarState): string[][] {
  const g = blank();
  if (state === 'idle') {
    head(g, 'open', 'flat');
    torsoAndLegs(g, false);
    armsDown(g);
  } else if (state === 'full') {
    head(g, 'closed', 'smile');
    torsoAndLegs(g, true);
    armsRestingOnBelly(g);
    zzz(g);
  } else if (state === 'flexed') {
    head(g, 'open', 'flat');
    torsoAndLegs(g, false);
    armsFlexed(g);
  } else {
    head(g, 'happy', 'smile');
    torsoAndLegs(g, false);
    armsFlexed(g);
  }
  return g;
}

export const AVATAR_POSES: Record<AvatarState, string[][]> = {
  idle: buildPose('idle'),
  full: buildPose('full'),
  flexed: buildPose('flexed'),
  charged: buildPose('charged'),
};

export const AVATAR_GRID_SIZE = { width: W, height: H };
