'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRoom } from '@/components/PixelRoom';
import { PixelAvatar } from '@/components/PixelAvatar';
import { ROOM_SPOTS, ROOM_GRID_SIZE, buildRoomPalette, type RoomSpot } from '@/lib/roomSprites';
import { buildAvatarPalette, type AvatarState, type AvatarPose } from '@/lib/avatarSprites';
import { DEFAULT_AVATAR_CUSTOMIZATION, DEFAULT_ROOM_CUSTOMIZATION, type AvatarCustomization, type RoomCustomization } from '@/lib/customization';
import { Eyebrow } from '@/components/ui';

// A walk breaks into three beats so it reads as a person, not a teleport:
// stand up in place -> walk across the floor at a steady height -> settle
// into the destination's pose (sit down / step up to the bench).
const STAND_MS = 350;
const GLIDE_MS = 1700;
const SETTLE_MS = 350;
const WALK_BOTTOM = 6; // floor-level height used only mid-walk
const WALK_FRAME_MS = 260; // how often the lead foot swaps during the walk

const MIN_DWELL_MS = 6000;
const DWELL_JITTER_MS = 5000;

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

type Phase = 'resting' | 'standing' | 'gliding' | 'settling';

function poseFor(spot: RoomSpot, mood: AvatarState): AvatarPose {
  if (spot === 'sofa') return mood === 'full' ? 'sleeping' : 'sitting';
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
 * standing. Once he's fully fuelled he heads straight for the sofa and stays
 * there for a nap, rather than dozing wherever he happens to be standing.
 * Purely decorative/for-fun; today's actual mood still comes from real
 * calorie/workout data, same as before.
 */
export function PetRoom({
  mood,
  name,
  avatarCustomization = DEFAULT_AVATAR_CUSTOMIZATION,
  roomCustomization = DEFAULT_ROOM_CUSTOMIZATION,
}: {
  mood: AvatarState;
  name: string;
  avatarCustomization?: AvatarCustomization;
  roomCustomization?: RoomCustomization;
}) {
  const avatarPalette = useMemo(() => buildAvatarPalette(avatarCustomization), [avatarCustomization]);
  const roomPalette = useMemo(() => buildRoomPalette(roomCustomization), [roomCustomization]);
  const spots = useMemo<RoomSpot[]>(() => {
    if (mood === 'full') return ['sofa']; // nap spot only — no wandering while asleep
    if (mood === 'flexed' || mood === 'charged') return ['tv', 'sofa'];
    return ['tv', 'sofa', 'bench'];
  }, [mood]);
  const [spot, setSpot] = useState<RoomSpot>('tv');
  const [phase, setPhase] = useState<Phase>('resting');
  const [walkFrame, setWalkFrame] = useState<'walk1' | 'walk2'>('walk1');
  const spotRef = useRef(spot);
  spotRef.current = spot;

  useEffect(() => {
    if (!spots.includes(spotRef.current)) setSpot(spots[0]);
  }, [spots]);

  // Swap the lead foot on a steady beat while walking, so it reads as an
  // actual stride (one foot in front of the other) instead of a static pose
  // gliding across the floor.
  useEffect(() => {
    if (phase !== 'gliding') return;
    setWalkFrame('walk1');
    const id = setInterval(() => {
      setWalkFrame((f) => (f === 'walk1' ? 'walk2' : 'walk1'));
    }, WALK_FRAME_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function tick() {
      const dwell = MIN_DWELL_MS + Math.random() * DWELL_JITTER_MS;
      t1 = setTimeout(() => {
        if (cancelled) return;
        const options = spots.filter((s) => s !== spotRef.current);
        if (options.length === 0) {
          tick();
          return;
        }
        const next = options[Math.floor(Math.random() * options.length)];

        // Beat 1: stand up in place.
        setPhase('standing');
        t2 = setTimeout(() => {
          if (cancelled) return;
          // Beat 2: walk across the floor toward the new spot.
          setSpot(next);
          setPhase('gliding');
          t3 = setTimeout(() => {
            if (cancelled) return;
            // Beat 3: settle into the destination's pose/height.
            setPhase('settling');
            t4 = setTimeout(() => {
              if (cancelled) return;
              setPhase('resting');
              tick();
            }, SETTLE_MS);
          }, GLIDE_MS);
        }, STAND_MS);
      }, dwell);
    }
    tick();

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [spots]);

  const walking = phase === 'gliding';
  const pose: AvatarPose = phase === 'standing' ? 'idle' : phase === 'gliding' ? walkFrame : poseFor(spot, mood);
  const bottom = phase === 'gliding' ? WALK_BOTTOM : ROOM_SPOTS[spot].bottom;
  const bottomMs = phase === 'gliding' ? GLIDE_MS : SETTLE_MS;

  return (
    <div className="mt-7">
      <div className="relative overflow-hidden rounded-[22px]" style={{ aspectRatio: `${ROOM_GRID_SIZE.width} / ${ROOM_GRID_SIZE.height}` }}>
        <PixelRoom className="absolute inset-0 h-full w-full" palette={roomPalette} />
        <div
          className="absolute"
          style={{
            left: `${ROOM_SPOTS[spot].left}%`,
            bottom: `${bottom}%`,
            transform: 'translateX(-50%)',
            transition: `left ${GLIDE_MS}ms ${EASE}, bottom ${bottomMs}ms ${EASE}`,
          }}
        >
          <div className={walking ? 'pet-walking' : ''}>
            <PixelAvatar state={pose} size={56} palette={avatarPalette} />
          </div>
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
