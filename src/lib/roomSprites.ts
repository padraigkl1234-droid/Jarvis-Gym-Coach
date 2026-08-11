/**
 * The pixel-art apartment behind the Home avatar: ceiling, two-tone
 * wainscoted wall, wood floor with a rug, a big window with a multi-pane
 * dusk skyline (lit windows included) and curtains, a wall-mounted TV
 * (channel is swappable — football, a movie, the news, or off) on a console
 * with a framed print beside it, a pendant lamp over the reading corner
 * (decor there is also swappable — plant, bookshelf, or trophy shelf), a
 * cushioned sofa with a throw pillow, and a weight bench with shaded barbell
 * plates — plus soft contact shadows under each piece for a bit of depth.
 * Same grid technique as avatarSprites.ts, rendered by PixelRoom as crisp
 * SVG squares.
 */

import { darken, lighten } from './color';
import { DEFAULT_ROOM_CUSTOMIZATION, type Decor, type RoomCustomization, type TvChannel } from './customization';

/** Builds the full letter->hex palette from the athlete's chosen base colors
 *  (Settings > Customize room), deriving the small highlight/shadow accents
 *  so the room stays coherent no matter what they pick. Fixtures that aren't
 *  offered as a customization (window, TV, decor, bench, lamp) stay fixed. */
export function buildRoomPalette(custom: RoomCustomization = DEFAULT_ROOM_CUSTOMIZATION): Record<string, string> {
  return {
    // Ceiling
    A: '#F7F1E6',
    B: '#EDE3D0',
    // Wall
    a: custom.wall,
    b: darken(custom.wall, 0.12), // wainscot panel band
    c: darken(custom.wall, 0.21), // baseboard trim
    // Floor
    f: custom.floor,
    e: darken(custom.floor, 0.1), // plank shading
    d: darken(custom.floor, 0.24), // plank seams
    // Rug
    i: custom.rug,
    j: darken(custom.rug, 0.25),
    k: lighten(custom.rug, 0.36),
    // Window frame + sky + skyline
    n: '#4A4038',
    N: '#5C4F42',
    q: '#F0C9A0',
    Q: '#E0A57C',
    r: '#C97B5B',
    m: '#7A5240',
    o: '#5C3D2E',
    O: '#452C21',
    L: '#F4D48A',
    // Curtains
    u: custom.curtains,
    U: darken(custom.curtains, 0.2),
    // TV
    w: '#2A2620',
    v: '#3A4A52', // screen background / letterbox / off-screen glass
    g: '#3E7A3E', // football pitch green
    h: '#F5F4EE', // pitch markings + ball + news ticker text
    J: '#2E5C8A', // news headline bar
    K: '#C0392B', // news ticker bar
    // Sofa
    s: custom.sofa,
    S: lighten(custom.sofa, 0.14),
    t: darken(custom.sofa, 0.2),
    T: darken(custom.sofa, 0.33),
    p: '#B4552F', // throw pillow — a fixed clay accent
    P: '#8B3D20',
    // Reading-corner decor (plant / bookshelf / trophy shelf)
    x: '#B4552F',
    X: '#C46B44',
    y: '#7C8B6F',
    Y: '#8FA07E',
    z: '#657056',
    // Bench
    G: '#5A5650',
    H: '#403D38',
    V: '#B4552F',
    W: '#8B3D20',
    Z: '#2A2620',
    D: '#54504A',
    // TV kit colours / accent shimmer (also reused as book-spine colors on
    // the bookshelf and cup shine on the trophy shelf)
    C: '#D9A441',
    E: '#22405C',
    F: '#243038', // screen vignette
    // Wall art print
    R: '#3A342C',
    l: '#C97B5B',
    // Pendant lamp over the reading corner
    M: '#3A342C',
    // Contact shadow
    '_': '#96754F',
  };
}

export const ROOM_PALETTE: Record<string, string> = buildRoomPalette();

/** Cells that CSS gives a staggered flicker so bits of the TV screen read as
 *  something actually playing/lit, not a static picture — shared across
 *  every channel design. */
export const TV_CONTENT_KEYS = ['C', 'E'];

/** Grid-unit spots the animated "ball" cycles between on the football pitch —
 *  a few small dots that take turns fading in/out, reading as a ball in
 *  motion. Only meaningful (and only rendered) when tvChannel is 'football'. */
export const TV_BALL_SPOTS: { x: number; y: number }[] = [
  { x: 21, y: 18 },
  { x: 24, y: 17 },
  { x: 27, y: 19 },
];

const W = 84;
const H = 50;

function blank(): string[][] {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
}

function span(g: string[][], y: number, x0: number, x1: number, ch: string) {
  for (let x = x0; x <= x1; x++) if (g[y]) g[y][x] = ch;
}

function rect(g: string[][], x0: number, y0: number, x1: number, y1: number, ch: string) {
  for (let y = y0; y <= y1; y++) span(g, y, x0, x1, ch);
}

function vline(g: string[][], x: number, y0: number, y1: number, ch: string) {
  for (let y = y0; y <= y1; y++) if (g[y]) g[y][x] = ch;
}

function px(g: string[][], x: number, y: number, ch: string) {
  if (g[y]) g[y][x] = ch;
}

/** The TV screen's picture area is cols 17-31, rows 14-22 (inside the bezel). */
function drawTvChannel(g: string[][], channel: TvChannel) {
  if (channel === 'football') {
    rect(g, 18, 15, 30, 21, 'g'); // pitch, inset like a live broadcast picture
    vline(g, 24, 15, 21, 'h'); // halfway line
    vline(g, 18, 17, 19, 'h'); // near goal mouth
    vline(g, 30, 17, 19, 'h'); // far goal mouth
    px(g, 20, 16, 'E'); // players — CSS shimmers these
    px(g, 28, 20, 'E');
    px(g, 23, 20, 'C');
    px(g, 26, 16, 'C');
  } else if (channel === 'movie') {
    span(g, 14, 17, 31, 'w'); // thick letterbox bars
    span(g, 15, 17, 31, 'w');
    span(g, 21, 17, 31, 'w');
    span(g, 22, 17, 31, 'w');
    rect(g, 17, 16, 31, 17, 'q'); // sunset sky
    rect(g, 17, 18, 31, 19, 'Q');
    span(g, 20, 17, 31, 'r'); // horizon line
    rect(g, 19, 19, 22, 20, 'o'); // silhouette hills
    rect(g, 25, 19, 29, 20, 'o');
    px(g, 28, 16, 'C'); // sun glow — shimmers
    px(g, 20, 17, 'E'); // a distant light — shimmers
    return; // this channel draws its own top/bottom bars, skip the shared vignette below
  } else if (channel === 'news') {
    rect(g, 17, 14, 31, 17, 'v'); // studio backdrop
    rect(g, 17, 18, 31, 19, 'J'); // headline bar
    rect(g, 17, 20, 31, 22, 'K'); // ticker bar
    px(g, 18, 15, 'C'); // logo — shimmers
    px(g, 19, 15, 'C');
    px(g, 19, 21, 'E'); // ticker text — shimmers
    px(g, 22, 21, 'E');
    px(g, 25, 21, 'E');
    px(g, 28, 21, 'E');
  } else {
    // Off — a dark, dead screen with a faint diagonal reflection streak.
    px(g, 20, 16, 'N');
    px(g, 21, 17, 'N');
    px(g, 22, 18, 'N');
    return; // no vignette needed on a screen that's off
  }
  span(g, 14, 17, 31, 'F'); // top screen vignette
  span(g, 22, 17, 31, 'F'); // bottom screen vignette
}

/** The reading corner is cols 2-16, rows 25-49 (floor to just under the lamp). */
function drawDecor(g: string[][], decor: Decor) {
  if (decor === 'bookshelf') {
    rect(g, 3, 27, 15, 48, 'H'); // frame
    rect(g, 4, 28, 14, 47, 'G'); // back panel
    span(g, 34, 4, 14, 'H'); // shelf board
    span(g, 41, 4, 14, 'H'); // shelf board
    const spines = ['L', 'C', 'E', 'V', 'o', 'L', 'C', 'E', 'V'];
    for (let i = 0; i < spines.length; i++) vline(g, 5 + i, 29, 33, spines[i]); // top shelf books
    for (let i = 0; i < spines.length; i++) vline(g, 5 + i, 36, 40, spines[(i + 4) % spines.length]); // middle shelf books
    rect(g, 6, 43, 12, 47, 'X'); // a plant accent on the bottom shelf
    rect(g, 6, 43, 12, 43, 'Y');
    span(g, 48, 3, 15, '_');
  } else if (decor === 'trophies') {
    rect(g, 3, 27, 15, 48, 'H'); // frame
    rect(g, 4, 28, 14, 47, 'G'); // back panel
    span(g, 38, 4, 14, 'H'); // shelf board
    // A big trophy, center.
    rect(g, 8, 28, 11, 32, 'C');
    rect(g, 9, 33, 10, 36, 'C');
    rect(g, 8, 37, 11, 37, 'C');
    px(g, 9, 29, 'L');
    // A smaller trophy, left — tapered cup/stem/base so it reads as a trophy
    // too, not just a block. Base aligned with the same shelf line (row 37).
    rect(g, 5, 32, 7, 34, 'E'); // cup
    vline(g, 6, 35, 36, 'E'); // stem
    rect(g, 5, 37, 7, 37, 'E'); // base
    // A couple of medals on ribbons, bottom shelf.
    rect(g, 6, 42, 7, 43, 'C');
    px(g, 6, 41, 'K');
    rect(g, 10, 43, 11, 44, 'E');
    px(g, 10, 42, 'K');
    span(g, 48, 3, 15, '_');
  } else {
    // Plant (default).
    rect(g, 6, 40, 10, 43, 'x');
    rect(g, 5, 44, 11, 46, 'x');
    span(g, 40, 6, 10, 'X'); // rim highlight on the pot
    rect(g, 4, 27, 13, 36, 'y');
    rect(g, 2, 31, 6, 39, 'y');
    rect(g, 10, 30, 16, 38, 'z');
    rect(g, 6, 25, 11, 30, 'Y');
    rect(g, 3, 34, 5, 36, 'z');
    rect(g, 3, 46, 14, 47, '_');
  }
}

function buildRoom(opts: { tvChannel?: TvChannel; decor?: Decor } = {}): string[][] {
  const { tvChannel = 'football', decor = 'plant' } = opts;
  const g = blank();

  // Ceiling, wall, floor.
  rect(g, 0, 0, W - 1, 1, 'A');
  span(g, 1, 0, W - 1, 'B');
  rect(g, 0, 2, W - 1, 33, 'a');
  rect(g, 0, 30, W - 1, 33, 'b'); // wainscot panel band
  span(g, 33, 0, W - 1, 'c'); // baseboard trim
  rect(g, 0, 34, W - 1, H - 1, 'f');
  for (let x = 0; x < W; x++) {
    for (let y = 34; y < H; y++) {
      if ((x + y) % 7 === 0) g[y][x] = 'e';
    }
    if (x % 9 === 0) vline(g, x, 34, H - 1, 'd');
  }

  // Rug under the sofa.
  rect(g, 30, 44, 60, 49, 'i');
  rect(g, 30, 44, 60, 44, 'j');
  rect(g, 30, 49, 60, 49, 'j');
  vline(g, 30, 44, 49, 'j');
  vline(g, 60, 44, 49, 'j');
  rect(g, 34, 46, 56, 47, 'k');

  // Window, cols 57-80, rows 3-24, dusk skyline with lit windows.
  rect(g, 57, 3, 80, 24, 'n');
  rect(g, 58, 4, 79, 9, 'q');
  rect(g, 58, 10, 79, 16, 'Q');
  rect(g, 58, 17, 79, 23, 'r');
  // Skyline silhouettes, varied heights.
  rect(g, 60, 15, 63, 23, 'o');
  rect(g, 65, 11, 68, 23, 'O');
  rect(g, 70, 17, 72, 23, 'm');
  rect(g, 74, 13, 77, 23, 'o');
  rect(g, 62, 9, 63, 15, 'O'); // antenna-ish tower cap
  // Lit windows dotted on the buildings.
  for (const [x, y] of [
    [61, 17], [61, 20], [66, 14], [67, 18], [67, 21], [71, 19], [75, 15], [76, 19], [76, 21],
  ]) {
    g[y][x] = 'L';
  }
  // Pane dividers (drawn after skyline so the frame stays crisp).
  vline(g, 68, 4, 24, 'n');
  span(g, 13, 58, 79, 'n');
  rect(g, 57, 3, 80, 4, 'N'); // top frame highlight
  // Curtains framing the window.
  rect(g, 53, 2, 56, 32, 'u');
  vline(g, 53, 2, 32, 'U');
  vline(g, 56, 2, 32, 'U');
  rect(g, 81, 2, W - 1, 32, 'u');
  vline(g, W - 1, 2, 32, 'U');

  // Wall-mounted TV on a low console, cols 15-33.
  rect(g, 15, 12, 33, 24, 'n');
  rect(g, 16, 13, 32, 23, 'w');
  rect(g, 17, 14, 31, 22, 'v'); // screen bg — the channel draws its content on top
  drawTvChannel(g, tvChannel);
  rect(g, 12, 27, 36, 32, 'n');
  rect(g, 13, 28, 35, 31, 'N');
  span(g, 32, 12, 36, '_');

  // Framed wall art between the TV and the window.
  rect(g, 40, 10, 51, 22, 'R');
  rect(g, 41, 11, 50, 21, 'a');
  rect(g, 43, 13, 48, 19, 'l');
  rect(g, 44, 15, 47, 17, 'C');

  // Pendant lamp hanging over the reading corner.
  vline(g, 10, 0, 16, 'M');
  rect(g, 7, 16, 13, 18, 'M');
  rect(g, 8, 17, 12, 18, 'L');

  // Reading-corner decor (plant / bookshelf / trophy shelf), cols 2-16.
  drawDecor(g, decor);

  // Sofa, cols 32-58.
  rect(g, 32, 33, 58, 39, 's');
  rect(g, 32, 33, 58, 34, 'S');
  rect(g, 32, 40, 58, 45, 't');
  rect(g, 32, 34, 34, 45, 'T');
  rect(g, 56, 34, 58, 45, 'T');
  vline(g, 41, 40, 45, 'T');
  vline(g, 49, 40, 45, 'T');
  rect(g, 34, 44, 39, 45, 'p'); // throw pillow
  rect(g, 34, 44, 39, 44, 'P');
  rect(g, 34, 46, 36, 48, 'G');
  rect(g, 54, 46, 56, 48, 'G');
  rect(g, 31, 47, 59, 48, '_');

  // Weight bench + barbell, cols 62-82.
  span(g, 36, 62, 82, 'Z');
  rect(g, 62, 35, 64, 38, 'D');
  rect(g, 80, 35, 82, 38, 'D');
  rect(g, 63, 36, 65, 39, 'Z');
  rect(g, 79, 36, 81, 39, 'Z');
  rect(g, 65, 41, 79, 42, 'V');
  rect(g, 65, 41, 79, 41, 'V');
  rect(g, 65, 43, 79, 44, 'G');
  rect(g, 66, 45, 68, 48, 'H');
  rect(g, 76, 45, 78, 48, 'H');
  rect(g, 64, 48, 80, 49, '_');

  return g;
}

export { buildRoom };
export const ROOM_GRID = buildRoom();
export const ROOM_GRID_SIZE = { width: W, height: H };

/** Named spots the avatar walks between, as CSS percentages within the room card. */
export const ROOM_SPOTS = {
  tv: { left: 27, bottom: 8 },
  sofa: { left: 55, bottom: 13 },
  bench: { left: 86, bottom: 15 },
} as const;

export type RoomSpot = keyof typeof ROOM_SPOTS;
