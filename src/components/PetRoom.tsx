'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRoom } from '@/components/PixelRoom';
import { PixelAvatar } from '@/components/PixelAvatar';
import { ROOM_SPOTS, type RoomSpot } from '@/lib/roomSprites';
import { type AvatarState, type AvatarPose } from '@/lib/avatarSprites';
import { Eyebrow } from '@/components/ui';

const WALK_MS = 2200;
const MIN_DWELL_MS = 6000;
const DWELL_JITTER_MS = 5000;

function poseFor(spot: RoomSpot, mood: AvatarState): AvatarPose {
  if (spot === 'sofa') return 'sitting';
  if (spot === 'bench') return mood === 'charged' ? 'charged' : 'flexed';
  return mood;
}

const COPY: Record<AvatarState, string> = {
  idle: 'is pottering around the flat.',
  full: 'is fully fuelled and having a nap.',
  flexed: "trained today — feeling strong.",
  charged: 'is fed and trained — unstoppable today.',
};
const LABEL: Record<AvatarState, string> = {
  idle: 'Ready',
  full: 'Fuelled up',
  flexed: 'Trained',
  charged: 'Fully charged',
};

/**
 * A little pixel apartment behind the avatar. He wanders on his own between
 * the TV, the sofa, and the weight bench (skipped once today's session is
 * done — nothing left to do there), matching whatever pose fits where he's
 * standing. Purely decorative/for-fun; today's actual mood still comes from
 * real calorie/workout data, same as before.
 */
export function PetRoom({ mood, name }: { mood: AvatarState; name: string }) {
  const spots = useMemo<RoomSpot[]>(() => (mood === 'flexed' || mood === 'charged' ? ['tv', 'sofa'] : ['tv', 'sofa', 'bench']), [mood]);
  const [spot, setSpot] = useState<RoomSpot>('tv');
  const [moving, setMoving] = useState(false);
  const spotRef = useRef(spot);
  spotRef.current = spot;

  useEffect(() => {
    if (!spots.includes(spotRef.current)) setSpot('tv');
  }, [spots]);

  useEffect(() => {
    let dwellTimer: ReturnType<typeof setTimeout>;
    let walkTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function tick() {
      const dwell = MIN_DWELL_MS + Math.random() * DWELL_JITTER_MS;
      dwellTimer = setTimeout(() => {
        if (cancelled) return;
        const options = spots.filter((s) => s !== spotRef.current);
        if (options.length === 0) {
          tick();
          return;
        }
        const next = options[Math.floor(Math.random() * options.length)];
        setSpot(next);
        setMoving(true);
        walkTimer = setTimeout(() => {
          if (cancelled) return;
          setMoving(false);
          tick();
        }, WALK_MS);
      }, dwell);
    }
    tick();

    return () => {
      cancelled = true;
      clearTimeout(dwellTimer);
      clearTimeout(walkTimer);
    };
  }, [spots]);

  const pose = moving ? 'idle' : poseFor(spot, mood);
  const { left, bottom } = ROOM_SPOTS[spot];

  return (
    <div className="mt-7">
      <div className="relative overflow-hidden rounded-[22px]" style={{ aspectRatio: '40 / 24' }}>
        <PixelRoom className="absolute inset-0 h-full w-full" />
        <div
          className={`absolute ${moving ? 'pet-walking' : ''}`}
          style={{
            left: `${left}%`,
            bottom: `${bottom}%`,
            transform: 'translateX(-50%)',
            transition: `left ${WALK_MS}ms ease-in-out, bottom ${WALK_MS}ms ease-in-out`,
          }}
        >
          <PixelAvatar state={pose} size={56} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Eyebrow clay className="!text-[10px]">
          {LABEL[mood]}
        </Eyebrow>
        <span className="text-[12px] text-faint">
          {name} {COPY[mood]}
        </span>
      </div>
    </div>
  );
}
