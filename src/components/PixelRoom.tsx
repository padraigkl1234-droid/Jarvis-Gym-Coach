'use client';

import React from 'react';
import { ROOM_GRID, ROOM_GRID_SIZE, ROOM_PALETTE } from '@/lib/roomSprites';

export function PixelRoom({ className = '' }: { className?: string }) {
  const { width, height } = ROOM_GRID_SIZE;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = ROOM_GRID[y][x];
      if (ch === '.') continue;
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ROOM_PALETTE[ch] ?? '#000'} className={ch === 'g' ? 'tv-glow' : undefined} />
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} shapeRendering="crispEdges" preserveAspectRatio="none" role="img" aria-label="Apartment">
      {rects}
    </svg>
  );
}
