'use client';

import React from 'react';
import { ROOM_GRID, ROOM_GRID_SIZE, ROOM_PALETTE, TV_BALL_SPOTS, TV_CONTENT_KEYS } from '@/lib/roomSprites';

// Each cell is drawn very slightly oversized (1.06 instead of 1 unit) so
// neighbouring rects overlap by a hair. Without this, scaling the SVG to an
// arbitrary container width leaves hairline gaps between adjacent cells —
// invisible on busy textures but a visible stray line across flat areas
// like the wall or window sky.
const OVERLAP = 1.06;

export function PixelRoom({ className = '' }: { className?: string }) {
  const { width, height } = ROOM_GRID_SIZE;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = ROOM_GRID[y][x];
      if (ch === '.') continue;
      const isTvContent = TV_CONTENT_KEYS.includes(ch);
      // Each player cell shimmers on its own offset so the pitch reads as
      // something actually being played, not a static picture.
      const style = isTvContent
        ? { animationDelay: `${((x * 31 + y * 17) % 24) / 10}s`, animationDuration: `${1.6 + ((x + y) % 5) * 0.2}s` }
        : undefined;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={OVERLAP}
          height={OVERLAP}
          fill={ROOM_PALETTE[ch] ?? '#000'}
          className={isTvContent ? 'tv-content' : undefined}
          style={style}
        />
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} shapeRendering="crispEdges" preserveAspectRatio="none" role="img" aria-label="Apartment">
      {rects}
      {/* The "ball" — a few dots on the pitch that take turns fading in, one
          at a time, so it reads as something moving across the screen. */}
      {TV_BALL_SPOTS.map((p, i) => (
        <rect
          key={`ball-${i}`}
          x={p.x}
          y={p.y}
          width={OVERLAP}
          height={OVERLAP}
          fill="#F5F4EE"
          className="tv-ball"
          style={{ animationDelay: `${i}s` }}
        />
      ))}
    </svg>
  );
}
