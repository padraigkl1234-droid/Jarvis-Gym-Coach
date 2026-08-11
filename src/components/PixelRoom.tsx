'use client';

import React from 'react';
import { ROOM_GRID, ROOM_GRID_SIZE, ROOM_PALETTE, TV_CONTENT_KEYS } from '@/lib/roomSprites';

export function PixelRoom({ className = '' }: { className?: string }) {
  const { width, height } = ROOM_GRID_SIZE;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = ROOM_GRID[y][x];
      if (ch === '.') continue;
      const isTvContent = TV_CONTENT_KEYS.includes(ch);
      // Each on-screen content cell flickers on its own offset so the TV
      // reads as something actually playing, not one uniform pulsing glow.
      const style = isTvContent
        ? { animationDelay: `${((x * 31 + y * 17) % 24) / 10}s`, animationDuration: `${1.6 + ((x + y) % 5) * 0.2}s` }
        : undefined;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
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
    </svg>
  );
}
