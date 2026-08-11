'use client';

import React from 'react';
import { AVATAR_GRID_SIZE, AVATAR_PALETTE, AVATAR_POSES, type AvatarPose } from '@/lib/avatarSprites';

// Cells are drawn very slightly oversized so neighbouring rects overlap by a
// hair — otherwise scaling the SVG to an arbitrary size can leave hairline
// gaps between adjacent cells (see PixelRoom for the same fix).
const OVERLAP = 1.06;

export function PixelAvatar({
  state,
  size = 120,
  className = '',
  palette = AVATAR_PALETTE,
}: {
  state: AvatarPose;
  size?: number;
  className?: string;
  /** Letter->hex override, e.g. from the athlete's Settings > Customize avatar picks. Defaults to the stock look. */
  palette?: Record<string, string>;
}) {
  const { width, height } = AVATAR_GRID_SIZE;
  const grid = AVATAR_POSES[state];
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={OVERLAP} height={OVERLAP} fill={palette[ch] ?? '#000'} />);
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
