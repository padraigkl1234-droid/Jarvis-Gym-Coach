/**
 * The pixel-art apartment behind the Home avatar: wall, wood floor, a window
 * with a dusk skyline, a wall-mounted TV, a sofa, a potted plant, and a
 * weight bench with a barbell. Same grid technique as avatarSprites.ts —
 * built once at module load, rendered by PixelRoom as crisp SVG squares.
 */

export const ROOM_PALETTE: Record<string, string> = {
  a: '#EFE5D3', // wall
  b: '#E4D5BC', // wall trim / baseboard
  f: '#B98F63', // floor
  e: '#A97D50', // floor plank line
  n: '#4A4038', // window / TV frame (dark wood)
  q: '#E8B98F', // sky upper
  r: '#C97B5B', // sky lower (dusk)
  m: '#6B4636', // building silhouette (mid)
  o: '#54372A', // building silhouette (dark)
  s: '#8A9A7C', // sofa body (sage)
  t: '#6F7D63', // sofa shading
  u: '#5A5650', // bench frame
  v: '#B4552F', // bench pad (clay)
  w: '#2A2620', // barbell / TV screen off
  x: '#B4552F', // plant pot (clay)
  y: '#7C8B6F', // plant leaves (sage)
  z: '#657056', // plant leaves, dark
  g: '#E8CDB8', // TV screen glow
};

const W = 40;
const H = 24;

function blank(): string[][] {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
}

function span(g: string[][], y: number, x0: number, x1: number, ch: string) {
  for (let x = x0; x <= x1; x++) if (g[y]) g[y][x] = ch;
}

function rect(g: string[][], x0: number, y0: number, x1: number, y1: number, ch: string) {
  for (let y = y0; y <= y1; y++) span(g, y, x0, x1, ch);
}

function buildRoom(): string[][] {
  const g = blank();

  // Wall + floor.
  rect(g, 0, 0, W - 1, 16, 'a');
  span(g, 16, 0, W - 1, 'b');
  rect(g, 0, 17, W - 1, H - 1, 'f');
  for (let x = 0; x < W; x += 4) for (let y = 17; y < H; y++) g[y][x] = 'e';

  // Window with a dusk skyline, cols 27-37, rows 1-10.
  rect(g, 27, 1, 37, 10, 'n');
  rect(g, 28, 2, 36, 5, 'q');
  rect(g, 28, 6, 36, 9, 'r');
  rect(g, 30, 7, 31, 9, 'o');
  rect(g, 32, 5, 33, 9, 'm');
  rect(g, 34, 8, 35, 9, 'o');
  span(g, 5, 28, 36, 'n'); // horizontal pane divider
  for (let y = 2; y <= 9; y++) g[y][32] = g[y][32] === '.' ? 'n' : g[y][32]; // vertical divider, skyline stays on top

  // Wall-mounted TV, cols 8-15, rows 7-12.
  rect(g, 8, 7, 15, 12, 'n');
  rect(g, 9, 8, 14, 11, 'g');

  // Potted plant, cols 0-6.
  rect(g, 2, 19, 4, 20, 'x');
  rect(g, 1, 21, 5, 22, 'x');
  rect(g, 1, 14, 5, 17, 'y');
  rect(g, 0, 16, 2, 19, 'y');
  rect(g, 4, 16, 6, 18, 'z');
  span(g, 13, 2, 4, 'y');

  // Sofa, cols 16-26.
  rect(g, 16, 16, 26, 19, 's');
  rect(g, 16, 20, 26, 22, 't');
  rect(g, 16, 17, 17, 22, 't');
  rect(g, 25, 17, 26, 22, 't');
  span(g, 23, 17, 25, 'u');

  // Weight bench + barbell, cols 28-38.
  span(g, 18, 28, 38, 'w');
  rect(g, 28, 17, 29, 18, 'w');
  rect(g, 37, 17, 38, 18, 'w');
  rect(g, 29, 20, 37, 20, 'v');
  rect(g, 29, 21, 37, 21, 'u');
  rect(g, 30, 22, 31, 23, 'u');
  rect(g, 35, 22, 36, 23, 'u');

  return g;
}

export const ROOM_GRID = buildRoom();
export const ROOM_GRID_SIZE = { width: W, height: H };

/** Named spots the avatar walks between, as CSS percentages within the room card. */
export const ROOM_SPOTS = {
  tv: { left: 30, bottom: 6 },
  sofa: { left: 50, bottom: 11 },
  bench: { left: 79, bottom: 14 },
} as const;

export type RoomSpot = keyof typeof ROOM_SPOTS;
