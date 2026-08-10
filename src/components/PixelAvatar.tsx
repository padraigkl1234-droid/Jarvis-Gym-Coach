'use client';

import React from 'react';
import { AVATAR_GRID_SIZE, AVATAR_PALETTE, AVATAR_POSES, type AvatarPose } from '@/lib/avatarSprites';

export function PixelAvatar({ state, size = 120, className = '' }: { state: AvatarPose; size?: number; className?: string }) {
  const { width, height } = AVATAR_GRID_SIZE;
  const grid = AVATAR_POSES[state];
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={AVATAR_PALETTE[ch] ?? '#000'} />);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={(size * height) / width}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Avatar: ${state}`}
      className={className}
    >
      {rects}
    </svg>
  );
}
