'use client';

import React from 'react';
import type { SceneId, Highlight } from '@/lib/bjj';

/**
 * Simple, consistent side-view schematic diagrams for the BJJ library —
 * two abstract figures (head + torso capsule + limb lines), the defender
 * (bottom player) neutral/light, the attacker (top/controlling player)
 * solid clay, plus an optional highlight ring marking the finishing detail
 * (neck/arm/leg) for submissions. Not anatomical — a clean, quick-reading
 * position map, matching the app's existing line-icon language.
 */

const COLORS = {
  mat: '#EEEADF',
  matLine: '#E4DFD0',
  defenderFill: '#EFEBDF',
  defenderStroke: '#B0A99A',
  attackerFill: '#B4552F',
  attackerStroke: '#8F3F1F',
  highlight: '#E8895C',
};

/** Head + torso capsule, the shared building block for every figure. */
function Torso({ x, y, w = 62, h = 24, fill, stroke }: { x: number; y: number; w?: number; h?: number; fill: string; stroke: string }) {
  return <rect x={x} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={2} />;
}
function Head({ x, y, r = 12, fill, stroke }: { x: number; y: number; r?: number; fill: string; stroke: string }) {
  return <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={2} />;
}
function Limb({ points, stroke, w = 7 }: { points: string; stroke: string; w?: number }) {
  return <polyline points={points} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

function HighlightRing({ x, y, glyph }: { x: number; y: number; glyph?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill="none" stroke={COLORS.highlight} strokeWidth={2.5} strokeDasharray="4 3" />
      {glyph && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize="13" fontWeight={700} fill={COLORS.highlight}>
          {glyph}
        </text>
      )}
    </g>
  );
}

const HIGHLIGHT_GLYPH: Record<Highlight, string> = { neck: '◆', arm: '↝', leg: '↝', shoulder: '↝' };

function Ground({ y = 156 }: { y?: number }) {
  return <line x1={10} y1={y} x2={290} y2={y} stroke={COLORS.matLine} strokeWidth={2} />;
}

const D = COLORS.defenderFill;
const DS = COLORS.defenderStroke;
const A = COLORS.attackerFill;
const AS = COLORS.attackerStroke;

function Scene({ id, highlight }: { id: SceneId; highlight?: Highlight }) {
  switch (id) {
    case 'mount':
      return (
        <>
          <Ground />
          {/* defender flat on back, legs extended */}
          <Limb points="120,134 168,136" stroke={DS} />
          <Torso x={70} y={132} w={68} h={26} fill={D} stroke={DS} />
          <Head x={62} y={132} fill={D} stroke={DS} />
          <Limb points="78,120 55,105" stroke={DS} w={6} />
          {/* attacker mounted, sitting upright, straddling hips */}
          <Limb points="128,138 118,158" stroke={AS} w={6} />
          <Limb points="150,138 158,158" stroke={AS} w={6} />
          <Torso x={112} y={104} w={36} h={44} fill={A} stroke={AS} />
          <Head x={130} y={72} fill={A} stroke={AS} />
          <Limb points="118,90 100,78" stroke={AS} w={6} />
          <Limb points="142,90 158,80" stroke={AS} w={6} />
          {highlight && <HighlightRing x={62} y={122} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'back-control':
      return (
        <>
          <Ground />
          {/* defender turtled/seated, attacker behind with hooks + seatbelt */}
          <Limb points="150,150 190,140 220,150" stroke={DS} />
          <Torso x={140} y={110} w={30} h={60} fill={D} stroke={DS} />
          <Head x={150} y={72} fill={D} stroke={DS} />
          <Limb points="150,95 175,80" stroke={DS} w={6} />
          <Torso x={108} y={112} w={44} h={38} fill={A} stroke={AS} />
          <Head x={112} y={78} fill={A} stroke={AS} />
          <Limb points="130,100 168,95" stroke={AS} w={6} />
          <Limb points="130,120 168,128" stroke={AS} w={6} />
          <Limb points="115,128 108,150" stroke={AS} w={6} />
          <Limb points="140,128 148,150" stroke={AS} w={6} />
          {highlight && <HighlightRing x={150} y={82} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'side-control':
      return (
        <>
          <Ground />
          <Limb points="60,140 105,148 150,144" stroke={DS} />
          <Torso x={55} y={140} w={70} h={26} fill={D} stroke={DS} />
          <Head x={48} y={140} fill={D} stroke={DS} />
          {/* attacker perpendicular across the chest */}
          <Torso x={95} y={100} w={56} h={22} fill={A} stroke={AS} />
          <Limb points="148,100 158,100" stroke={AS} w={8} />
          <Head x={165} y={100} fill={A} stroke={AS} />
          <Limb points="105,110 90,150" stroke={AS} w={6} />
          <Limb points="128,110 140,150" stroke={AS} w={6} />
          {highlight && <HighlightRing x={90} y={140} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'knee-on-belly':
      return (
        <>
          <Ground />
          <Limb points="60,140 105,148 150,144" stroke={DS} />
          <Torso x={55} y={140} w={70} h={26} fill={D} stroke={DS} />
          <Head x={48} y={140} fill={D} stroke={DS} />
          <Torso x={110} y={98} w={30} h={44} fill={A} stroke={AS} />
          <Head x={122} y={64} fill={A} stroke={AS} />
          <Limb points="102,118 92,140" stroke={AS} w={7} />
          <Limb points="120,120 165,150" stroke={AS} w={6} />
          <Limb points="112,84 90,110" stroke={AS} w={6} />
          <Limb points="130,84 155,95" stroke={AS} w={6} />
          {highlight && <HighlightRing x={90} y={140} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'north-south':
      return (
        <>
          <Ground />
          <Limb points="60,140 105,148 150,144" stroke={DS} />
          <Torso x={55} y={140} w={70} h={26} fill={D} stroke={DS} />
          <Head x={48} y={140} fill={D} stroke={DS} />
          {/* attacker lying across, head toward defender's hips (opposite facing) */}
          <Torso x={85} y={100} w={58} h={22} fill={A} stroke={AS} />
          <Limb points="140,100 150,100" stroke={AS} w={8} />
          <Head x={157} y={100} fill={A} stroke={AS} />
          <Limb points="120,112 130,140" stroke={AS} w={6} />
          <Limb points="72,108 82,140" stroke={AS} w={6} />
          {highlight && <HighlightRing x={72} y={140} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'closed-guard':
      return (
        <>
          <Ground />
          {/* defender on back, legs wrapped around attacker's waist */}
          <Torso x={55} y={132} w={62} h={26} fill={D} stroke={DS} />
          <Head x={48} y={132} fill={D} stroke={DS} />
          <Limb points="115,124 165,105 170,80" stroke={DS} w={7} />
          <Limb points="115,140 165,140 172,100" stroke={DS} w={7} />
          <Limb points="70,120 55,102" stroke={DS} w={6} />
          {/* attacker kneeling inside the guard */}
          <Torso x={158} y={92} w={30} h={40} fill={A} stroke={AS} />
          <Head x={172} y={62} fill={A} stroke={AS} />
          <Limb points="150,112 145,150" stroke={AS} w={6} />
          <Limb points="168,112 178,150" stroke={AS} w={6} />
          <Limb points="160,78 148,60" stroke={AS} w={6} />
          {highlight && <HighlightRing x={172} y={72} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'half-guard':
      return (
        <>
          <Ground />
          <Torso x={55} y={132} w={62} h={26} fill={D} stroke={DS} />
          <Head x={48} y={132} fill={D} stroke={DS} />
          {/* one leg traps attacker's leg */}
          <Limb points="115,140 150,146 160,150" stroke={DS} w={7} />
          <Limb points="115,124 155,110 175,112" stroke={DS} w={7} />
          <Limb points="70,120 55,102" stroke={DS} w={6} />
          <Torso x={155} y={100} w={40} h={32} fill={A} stroke={AS} />
          <Head x={185} y={78} fill={A} stroke={AS} />
          <Limb points="145,114 130,148" stroke={AS} w={6} />
          <Limb points="170,114 190,145" stroke={AS} w={6} />
          <Limb points="168,90 150,72" stroke={AS} w={6} />
          {highlight && <HighlightRing x={185} y={88} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'butterfly-guard':
      return (
        <>
          <Ground />
          {/* defender seated upright, feet hooked under attacker's thighs */}
          <Torso x={72} y={116} w={28} h={44} fill={D} stroke={DS} />
          <Head x={85} y={82} fill={D} stroke={DS} />
          <Limb points="80,132 130,144 150,150" stroke={DS} w={7} />
          <Limb points="60,132 60,150" stroke={DS} w={6} />
          <Torso x={150} y={110} w={40} h={34} fill={A} stroke={AS} />
          <Head x={182} y={86} fill={A} stroke={AS} />
          <Limb points="145,124 130,150" stroke={AS} w={6} />
          <Limb points="168,124 178,150" stroke={AS} w={6} />
          <Limb points="160,98 145,80" stroke={AS} w={6} />
          {highlight && <HighlightRing x={182} y={96} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'delariva-guard':
      return (
        <>
          <Ground />
          <Torso x={60} y={128} w={58} h={26} fill={D} stroke={DS} />
          <Head x={50} y={128} fill={D} stroke={DS} />
          {/* hook from outside behind attacker's leg */}
          <Limb points="118,136 150,150 175,138 190,110" stroke={DS} w={7} />
          <Limb points="118,120 155,105" stroke={DS} w={6} />
          <Torso x={185} y={98} w={30} h={40} fill={A} stroke={AS} />
          <Head x={198} y={68} fill={A} stroke={AS} />
          <Limb points="176,116 168,150" stroke={AS} w={6} />
          <Limb points="196,116 205,150" stroke={AS} w={6} />
          {highlight && <HighlightRing x={198} y={78} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'turtle':
      return (
        <>
          <Ground />
          {/* defender curled on hands and knees */}
          <Torso x={80} y={126} w={54} h={30} fill={D} stroke={DS} />
          <Head x={62} y={140} fill={D} stroke={DS} />
          <Limb points="100,144 100,156" stroke={DS} w={6} />
          <Limb points="115,144 118,156" stroke={DS} w={6} />
          <Torso x={110} y={92} w={40} h={34} fill={A} stroke={AS} />
          <Head x={140} y={68} fill={A} stroke={AS} />
          <Limb points="98,106 85,130" stroke={AS} w={6} />
          <Limb points="122,108 105,140" stroke={AS} w={6} />
          {highlight && <HighlightRing x={62} y={128} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'front-headlock':
      return (
        <>
          <Ground />
          {/* defender bent forward, head trapped under attacker's arm */}
          <Torso x={70} y={112} w={54} h={26} fill={D} stroke={DS} />
          <Head x={112} y={100} fill={D} stroke={DS} />
          <Limb points="60,124 55,155" stroke={DS} w={6} />
          <Limb points="85,124 90,155" stroke={DS} w={6} />
          <Torso x={130} y={92} w={44} h={30} fill={A} stroke={AS} />
          <Head x={168} y={70} fill={A} stroke={AS} />
          <Limb points="120,104 112,100" stroke={AS} w={9} />
          <Limb points="145,78 155,140" stroke={AS} w={6} />
          {highlight && <HighlightRing x={112} y={100} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'fifty-fifty':
      return (
        <>
          <Ground />
          <Torso x={55} y={128} w={54} h={26} fill={D} stroke={DS} />
          <Head x={48} y={128} fill={D} stroke={DS} />
          <Limb points="105,132 150,138 190,132" stroke={DS} w={7} />
          <Torso x={195} y={128} w={54} h={26} fill={A} stroke={AS} />
          <Head x={248} y={128} fill={A} stroke={AS} />
          <Limb points="195,132 150,126 105,132" stroke={AS} w={7} />
          {highlight && <HighlightRing x={150} y={132} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'standing':
      return (
        <>
          <Ground />
          <Torso x={70} y={100} w={22} h={48} fill={D} stroke={DS} />
          <Head x={80} y={68} fill={D} stroke={DS} />
          <Limb points="74,120 65,156" stroke={DS} w={6} />
          <Limb points="86,120 92,156" stroke={DS} w={6} />
          <Limb points="80,90 105,105" stroke={DS} w={6} />
          <Torso x={170} y={100} w={22} h={48} fill={A} stroke={AS} />
          <Head x={182} y={68} fill={A} stroke={AS} />
          <Limb points="176,120 168,156" stroke={AS} w={6} />
          <Limb points="188,120 195,156" stroke={AS} w={6} />
          <Limb points="176,90 150,102" stroke={AS} w={6} />
          {highlight && <HighlightRing x={182} y={78} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'takedown-shot':
      return (
        <>
          <Ground />
          <Torso x={190} y={95} w={22} h={48} fill={D} stroke={DS} />
          <Head x={200} y={63} fill={D} stroke={DS} />
          <Limb points="196,116 188,155" stroke={DS} w={6} />
          <Limb points="208,116 214,155" stroke={DS} w={6} />
          {/* attacker level-changed, driving in low on the legs */}
          <Torso x={90} y={128} w={62} h={26} fill={A} stroke={AS} />
          <Head x={65} y={140} fill={A} stroke={AS} />
          <Limb points="105,142 100,158" stroke={AS} w={6} />
          <Limb points="140,120 178,110" stroke={AS} w={7} />
          <path d="M60,105 Q40,120 55,138" fill="none" stroke={COLORS.highlight} strokeWidth={2.5} strokeDasharray="4 3" markerEnd="url(#arrow)" />
          {highlight && <HighlightRing x={200} y={130} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'guard-pass':
      return (
        <>
          <Ground />
          <Torso x={55} y={132} w={62} h={26} fill={D} stroke={DS} />
          <Head x={48} y={132} fill={D} stroke={DS} />
          <Limb points="115,124 160,100" stroke={DS} w={6} />
          <Limb points="115,140 160,148" stroke={DS} w={6} />
          <Torso x={175} y={104} w={40} h={30} fill={A} stroke={AS} />
          <Head x={205} y={80} fill={A} stroke={AS} />
          <Limb points="165,118 150,148" stroke={AS} w={6} />
          <Limb points="188,118 200,148" stroke={AS} w={6} />
          <path d="M215,90 Q245,120 205,148" fill="none" stroke={COLORS.highlight} strokeWidth={2.5} strokeDasharray="4 3" markerEnd="url(#arrow)" />
          {highlight && <HighlightRing x={205} y={90} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    case 'sweep':
      return (
        <>
          <Ground />
          <Torso x={65} y={124} w={60} h={26} fill={D} stroke={DS} />
          <Head x={58} y={124} fill={D} stroke={DS} />
          <Limb points="122,116 165,95 180,72" stroke={DS} w={7} />
          <Torso x={165} y={70} w={26} h={44} fill={A} stroke={AS} />
          <Head x={178} y={40} fill={A} stroke={AS} />
          <Limb points="172,88 155,120" stroke={AS} w={6} />
          <Limb points="182,88 200,118" stroke={AS} w={6} />
          <path d="M195,45 Q235,55 220,100" fill="none" stroke={COLORS.highlight} strokeWidth={2.5} strokeDasharray="4 3" markerEnd="url(#arrow)" />
          {highlight && <HighlightRing x={178} y={50} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    default:
      return <Ground />;
  }
}

export function TechniqueDiagram({ scene, highlight, className = '' }: { scene: SceneId; highlight?: Highlight; className?: string }) {
  return (
    <svg viewBox="0 0 300 180" className={className} role="img" aria-label={`${scene} diagram`}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.highlight} />
        </marker>
      </defs>
      <rect x={0} y={0} width={300} height={180} rx={16} fill={COLORS.mat} />
      <Scene id={scene} highlight={highlight} />
    </svg>
  );
}

export const SCENE_LABEL: Record<SceneId, string> = {
  mount: 'Mount',
  'back-control': 'Back control',
  'side-control': 'Side control',
  'knee-on-belly': 'Knee on belly',
  'north-south': 'North-south',
  'closed-guard': 'Closed guard',
  'half-guard': 'Half guard',
  'butterfly-guard': 'Butterfly guard',
  'delariva-guard': 'De La Riva guard',
  turtle: 'Turtle',
  'front-headlock': 'Front headlock',
  'fifty-fifty': '50/50 guard',
  standing: 'Standing',
  'guard-pass': 'Passing the guard',
  sweep: 'Sweeping',
  'takedown-shot': 'Shooting a takedown',
};
