'use client';

import React from 'react';
import type { SceneId, Highlight } from '@/lib/bjj';

/**
 * Animated, articulated side-view diagrams for the BJJ library — two
 * jointed figures (head, torso, upper/lower arms with elbows and hands,
 * upper/lower legs with knees and feet). The figure actually executing
 * each technique is drawn in clay (the other figure stays neutral/light),
 * and for submissions its finishing limb loops toward a pulsing highlight
 * ring at the target — so the diagram shows the move happening, not a
 * frozen pose. Still line-art, matching the app's icon language, not a
 * photo or a full pixel-grid illustration.
 */

type Pt = [number, number];

const COLORS = {
  mat: '#EEEADF',
  matLine: '#E4DFD0',
  defenderFill: '#F4F1E8',
  defenderStroke: '#B0A99A',
  attackerFill: '#C4633B',
  attackerStroke: '#8F3F1F',
  highlight: '#E8895C',
};
const D = COLORS.defenderFill;
const DS = COLORS.defenderStroke;
const A = COLORS.attackerFill;
const AS = COLORS.attackerStroke;

function bend(a: Pt, b: Pt, amt: number, side: 1 | -1): Pt {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [mx + nx * amt * side, my + ny * amt * side];
}

/** Two-segment articulated limb (shoulder→elbow→hand, or hip→knee→foot) with visible joints. */
function Limb({
  a,
  b,
  bendAmt = 9,
  side = 1,
  stroke,
  fill,
  w = 7,
  animate,
  origin,
}: {
  a: Pt;
  b: Pt;
  bendAmt?: number;
  side?: 1 | -1;
  stroke: string;
  fill: string;
  w?: number;
  animate?: 'sway-in';
  origin?: Pt;
}) {
  const mid = bend(a, b, bendAmt, side);
  const o = origin ?? a;
  return (
    <g className={animate ? 'bjj-sway-in' : undefined} style={animate ? { transformOrigin: `${o[0]}px ${o[1]}px` } : undefined}>
      <line x1={a[0]} y1={a[1]} x2={mid[0]} y2={mid[1]} stroke={stroke} strokeWidth={w} strokeLinecap="round" />
      <line x1={mid[0]} y1={mid[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={Math.max(4.5, w - 1.5)} strokeLinecap="round" />
      <circle cx={mid[0]} cy={mid[1]} r={2.8} fill={fill} stroke={stroke} strokeWidth={1.3} />
      <circle cx={b[0]} cy={b[1]} r={3.6} fill={fill} stroke={stroke} strokeWidth={1.3} />
    </g>
  );
}

function Torso({ x, y, w = 60, h = 26, fill, stroke, rotate = 0 }: { x: number; y: number; w?: number; h?: number; fill: string; stroke: string; rotate?: number }) {
  return (
    <g transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={2} />
      <line
        x1={x - w / 2 + h / 2}
        y1={y - h / 2 + 3}
        x2={x + w / 2 - h / 2}
        y2={y - h / 2 + 3}
        stroke="#fff"
        strokeOpacity={0.3}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function Head({ x, y, r = 11, fill, stroke }: { x: number; y: number; r?: number; fill: string; stroke: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={2} />
      <circle cx={x - r * 0.32} cy={y - r * 0.35} r={r * 0.28} fill="#fff" fillOpacity={0.25} />
    </g>
  );
}

function Neck({ a, b, stroke, w = 9 }: { a: Pt; b: Pt; stroke: string; w?: number }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={w} strokeLinecap="round" />;
}

function HighlightRing({ x, y, glyph }: { x: number; y: number; glyph?: string }) {
  return (
    <g className="bjj-pulse" style={{ transformOrigin: `${x}px ${y}px` }}>
      <circle cx={x} cy={y} r={12} fill="none" stroke={COLORS.highlight} strokeWidth={2.5} strokeDasharray="4 3" />
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

function targetFor(map: Partial<Record<Highlight, Pt>>, highlight: Highlight | undefined, fallback: Pt): Pt {
  if (!highlight) return fallback;
  return map[highlight] ?? Object.values(map)[0] ?? fallback;
}

function Scene({ id, highlight }: { id: SceneId; highlight?: Highlight }) {
  switch (id) {
    case 'mount': {
      const targets: Partial<Record<Highlight, Pt>> = { neck: [80, 126], arm: [96, 118], shoulder: [94, 122] };
      const t = targetFor(targets, highlight, [80, 126]);
      return (
        <>
          <Ground />
          {/* defender flat on back */}
          <Head x={42} y={144} fill={D} stroke={DS} />
          <Neck a={[42, 144]} b={[64, 144]} stroke={DS} />
          <Torso x={106} y={144} w={68} h={26} fill={D} stroke={DS} />
          <Limb a={[140, 150]} b={[206, 152]} bendAmt={9} side={1} stroke={DS} fill={D} />
          <Limb a={[78, 134]} b={[62, 122]} bendAmt={4} side={-1} stroke={DS} fill={D} w={5.5} />
          {/* attacker mounted */}
          <g className="bjj-press" style={{ transformOrigin: '112px 100px' }}>
            <Limb a={[124, 136]} b={[104, 158]} bendAmt={8} side={-1} stroke={AS} fill={A} />
            <Limb a={[150, 136]} b={[168, 158]} bendAmt={8} side={1} stroke={AS} fill={A} />
            <Torso x={112} y={98} w={34} h={42} fill={A} stroke={AS} />
            <Neck a={[112, 76]} b={[128, 64]} stroke={AS} />
            <Head x={132} y={60} fill={A} stroke={AS} />
            <Limb a={[142, 84]} b={[160, 68]} bendAmt={7} side={-1} stroke={AS} fill={A} w={5.5} />
            <Limb a={[118, 88]} b={t} bendAmt={8} side={1} stroke={AS} fill={A} w={5.5} animate={highlight && 'sway-in'} origin={[118, 88]} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'back-control': {
      const targets: Partial<Record<Highlight, Pt>> = { neck: [166, 66] };
      const t = targetFor(targets, highlight, [166, 66]);
      return (
        <>
          <Ground />
          {/* defender, upright, facing away */}
          <Torso x={168} y={104} w={26} h={56} fill={D} stroke={DS} />
          <Neck a={[168, 78]} b={[168, 64]} stroke={DS} />
          <Head x={168} y={58} fill={D} stroke={DS} />
          <Limb a={[166, 130]} b={[204, 144]} bendAmt={8} side={1} stroke={DS} fill={D} />
          {/* attacker, behind and below, hooks + seatbelt + choking arm */}
          <g className="bjj-press" style={{ transformOrigin: '112px 112px' }}>
            <Limb a={[126, 128]} b={[142, 154]} bendAmt={6} side={1} stroke={AS} fill={A} />
            <Limb a={[100, 128]} b={[86, 152]} bendAmt={6} side={-1} stroke={AS} fill={A} />
            <Torso x={112} y={108} w={46} h={36} fill={A} stroke={AS} />
            <Neck a={[128, 84]} b={[120, 74]} stroke={AS} />
            <Head x={116} y={70} fill={A} stroke={AS} />
            <Limb a={[132, 98]} b={[178, 92]} bendAmt={7} side={1} stroke={AS} fill={A} w={5.5} />
            <Limb a={[128, 88]} b={t} bendAmt={7} side={-1} stroke={AS} fill={A} w={5.5} animate={highlight && 'sway-in'} origin={[128, 88]} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'side-control': {
      const targets: Partial<Record<Highlight, Pt>> = { shoulder: [88, 130], neck: [78, 132] };
      const t = targetFor(targets, highlight, [88, 130]);
      return (
        <>
          <Ground />
          <Head x={46} y={142} fill={D} stroke={DS} />
          <Neck a={[46, 142]} b={[66, 142]} stroke={DS} />
          <Torso x={96} y={142} w={64} h={26} fill={D} stroke={DS} />
          <Limb a={[128, 146]} b={[172, 152]} bendAmt={9} side={1} stroke={DS} fill={D} />
          <g className="bjj-press" style={{ transformOrigin: '108px 94px' }}>
            <Limb a={[90, 104]} b={[50, 150]} bendAmt={7} side={-1} stroke={AS} fill={A} w={6} />
            <Limb a={[124, 104]} b={[186, 150]} bendAmt={7} side={1} stroke={AS} fill={A} w={6} />
            <Torso x={108} y={94} w={58} h={22} fill={A} stroke={AS} />
            <Neck a={[137, 94]} b={[148, 94]} stroke={AS} />
            <Head x={156} y={94} fill={A} stroke={AS} />
            <Limb a={[92, 100]} b={t} bendAmt={7} side={1} stroke={AS} fill={A} w={5.5} animate={highlight && 'sway-in'} origin={[92, 100]} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'knee-on-belly':
      return (
        <>
          <Ground />
          <Head x={48} y={140} fill={D} stroke={DS} />
          <Neck a={[48, 140]} b={[66, 140]} stroke={DS} />
          <Torso x={96} y={140} w={64} h={26} fill={D} stroke={DS} />
          <Limb a={[128, 144]} b={[172, 150]} bendAmt={9} side={1} stroke={DS} fill={D} />
          <g className="bjj-press" style={{ transformOrigin: '112px 100px' }}>
            <Limb a={[104, 120]} b={[92, 144]} bendAmt={6} side={-1} stroke={AS} fill={A} w={8} />
            <Limb a={[118, 124]} b={[168, 150]} bendAmt={9} side={1} stroke={AS} fill={A} />
            <Torso x={112} y={96} w={30} h={42} fill={A} stroke={AS} />
            <Neck a={[112, 78]} b={[122, 66]} stroke={AS} />
            <Head x={126} y={62} fill={A} stroke={AS} />
            <Limb a={[104, 84]} b={[82, 106]} bendAmt={7} side={-1} stroke={AS} fill={A} w={6} />
            <Limb a={[128, 84]} b={[152, 96]} bendAmt={7} side={1} stroke={AS} fill={A} w={6} />
          </g>
        </>
      );
    case 'north-south': {
      const targets: Partial<Record<Highlight, Pt>> = { neck: [60, 138] };
      const t = targetFor(targets, highlight, [60, 138]);
      return (
        <>
          <Ground />
          <Head x={48} y={140} fill={D} stroke={DS} />
          <Neck a={[48, 140]} b={[66, 140]} stroke={DS} />
          <Torso x={96} y={140} w={64} h={26} fill={D} stroke={DS} />
          <Limb a={[128, 144]} b={[172, 150]} bendAmt={9} side={1} stroke={DS} fill={D} />
          <g className="bjj-press" style={{ transformOrigin: '100px 100px' }}>
            <Limb a={[112, 110]} b={[122, 140]} bendAmt={6} side={1} stroke={AS} fill={A} w={6} />
            <Torso x={100} y={100} w={56} h={22} fill={A} stroke={AS} />
            <Neck a={[128, 100]} b={[138, 100]} stroke={AS} />
            <Head x={146} y={100} fill={A} stroke={AS} />
            <Limb a={[76, 106]} b={t} bendAmt={8} side={-1} stroke={AS} fill={A} w={6} animate={highlight && 'sway-in'} origin={[76, 106]} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'closed-guard': {
      // The guard player (bottom) executes every submission mapped to this scene, so they're clay.
      const targets: Partial<Record<Highlight, Pt>> = { neck: [190, 78], shoulder: [196, 86], leg: [176, 148] };
      const t = targetFor(targets, highlight, [190, 78]);
      return (
        <>
          <Ground />
          <g className="bjj-press" style={{ transformOrigin: '100px 128px' }}>
            <Head x={54} y={130} fill={A} stroke={AS} />
            <Neck a={[54, 130]} b={[74, 130]} stroke={AS} />
            <Torso x={100} y={130} w={56} h={26} fill={A} stroke={AS} />
            <Limb a={[128, 122]} b={[182, 86]} bendAmt={12} side={1} stroke={AS} fill={A} />
            <Limb a={[128, 138]} b={[186, 118]} bendAmt={10} side={-1} stroke={AS} fill={A} />
            <Limb a={[70, 120]} b={t} bendAmt={8} side={-1} stroke={AS} fill={A} w={6} animate={highlight && 'sway-in'} origin={[70, 120]} />
          </g>
          <Torso x={200} y={96} w={30} h={40} fill={D} stroke={DS} />
          <Neck a={[196, 78]} b={[206, 64]} stroke={DS} />
          <Head x={210} y={60} fill={D} stroke={DS} />
          <Limb a={[190, 116]} b={[184, 152]} bendAmt={7} side={-1} stroke={DS} fill={D} />
          <Limb a={[210, 116]} b={[218, 152]} bendAmt={7} side={1} stroke={DS} fill={D} />
          <Limb a={[196, 86]} b={[178, 68]} bendAmt={7} side={-1} stroke={DS} fill={D} w={6} />
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'half-guard':
      return (
        <>
          <Ground />
          <g className="bjj-press" style={{ transformOrigin: '100px 126px' }}>
            <Head x={54} y={130} fill={A} stroke={AS} />
            <Neck a={[54, 130]} b={[74, 130]} stroke={AS} />
            <Torso x={100} y={130} w={56} h={26} fill={A} stroke={AS} />
            <Limb a={[128, 138]} b={[172, 146]} bendAmt={8} side={1} stroke={AS} fill={A} />
            <Limb a={[128, 122]} b={[168, 102]} bendAmt={9} side={-1} stroke={AS} fill={A} />
            <Limb a={[70, 120]} b={[150, 90]} bendAmt={9} side={-1} stroke={AS} fill={A} w={6} />
          </g>
          <Torso x={168} y={92} w={40} h={32} fill={D} stroke={DS} />
          <Neck a={[168, 74]} b={[174, 62]} stroke={DS} />
          <Head x={182} y={58} fill={D} stroke={DS} />
          <Limb a={[158, 106]} b={[144, 148]} bendAmt={7} side={-1} stroke={DS} fill={D} />
          <Limb a={[180, 106]} b={[196, 150]} bendAmt={7} side={1} stroke={DS} fill={D} />
        </>
      );
    case 'butterfly-guard':
      return (
        <>
          <Ground />
          <g className="bjj-press" style={{ transformOrigin: '76px 108px' }}>
            <Torso x={76} y={110} w={26} h={42} fill={A} stroke={AS} />
            <Neck a={[76, 90]} b={[86, 76]} stroke={AS} />
            <Head x={92} y={70} fill={A} stroke={AS} />
            <Limb a={[82, 128]} b={[140, 140]} bendAmt={9} side={1} stroke={AS} fill={A} />
            <Limb a={[68, 128]} b={[64, 152]} bendAmt={7} side={-1} stroke={AS} fill={A} />
            <Limb a={[60, 102]} b={[40, 120]} bendAmt={7} side={-1} stroke={AS} fill={A} w={6} />
          </g>
          <Torso x={154} y={104} w={40} h={32} fill={D} stroke={DS} />
          <Neck a={[154, 86]} b={[160, 74]} stroke={DS} />
          <Head x={168} y={70} fill={D} stroke={DS} />
          <Limb a={[144, 118]} b={[130, 150]} bendAmt={7} side={-1} stroke={DS} fill={D} />
          <Limb a={[166, 118]} b={[176, 150]} bendAmt={7} side={1} stroke={DS} fill={D} />
        </>
      );
    case 'delariva-guard':
      return (
        <>
          <Ground />
          <g className="bjj-press" style={{ transformOrigin: '96px 122px' }}>
            <Head x={46} y={124} fill={A} stroke={AS} />
            <Neck a={[46, 124]} b={[64, 124]} stroke={AS} />
            <Torso x={96} y={124} w={58} h={26} fill={A} stroke={AS} />
            <Limb a={[124, 132]} b={[176, 150]} bendAmt={9} side={1} stroke={AS} fill={A} />
            <Limb a={[124, 116]} b={[166, 98]} bendAmt={9} side={-1} stroke={AS} fill={A} />
            <Limb a={[70, 112]} b={[110, 90]} bendAmt={7} side={-1} stroke={AS} fill={A} w={6} />
          </g>
          <Torso x={198} y={98} w={30} h={40} fill={D} stroke={DS} />
          <Neck a={[198, 78]} b={[198, 66]} stroke={DS} />
          <Head x={198} y={60} fill={D} stroke={DS} />
          <Limb a={[188, 118]} b={[176, 152]} bendAmt={7} side={-1} stroke={DS} fill={D} />
          <Limb a={[208, 118]} b={[218, 152]} bendAmt={7} side={1} stroke={DS} fill={D} />
        </>
      );
    case 'turtle': {
      const targets: Partial<Record<Highlight, Pt>> = { neck: [50, 136] };
      const t = targetFor(targets, highlight, [50, 136]);
      return (
        <>
          <Ground />
          <Torso x={78} y={126} w={46} h={28} fill={D} stroke={DS} />
          <Head x={48} y={140} r={10} fill={D} stroke={DS} />
          <Neck a={[48, 140]} b={[62, 132]} stroke={DS} />
          <Limb a={[92, 140]} b={[90, 152]} bendAmt={3} side={1} stroke={DS} fill={D} w={5.5} />
          <Limb a={[104, 140]} b={[108, 152]} bendAmt={3} side={-1} stroke={DS} fill={D} w={5.5} />
          <g className="bjj-press" style={{ transformOrigin: '140px 98px' }}>
            <Limb a={[128, 112]} b={[112, 148]} bendAmt={7} side={-1} stroke={AS} fill={A} />
            <Limb a={[152, 112]} b={[156, 150]} bendAmt={7} side={1} stroke={AS} fill={A} />
            <Torso x={140} y={98} w={40} h={32} fill={A} stroke={AS} />
            <Neck a={[156, 80]} b={[162, 68]} stroke={AS} />
            <Head x={168} y={64} fill={A} stroke={AS} />
            <Limb a={[122, 90]} b={t} bendAmt={7} side={1} stroke={AS} fill={A} w={5.5} animate={highlight && 'sway-in'} origin={[122, 90]} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'front-headlock': {
      const targets: Partial<Record<Highlight, Pt>> = { neck: [98, 102] };
      const t = targetFor(targets, highlight, [98, 102]);
      return (
        <>
          <Ground />
          <Torso x={62} y={112} w={46} h={26} fill={D} stroke={DS} />
          <Head x={96} y={104} r={10} fill={D} stroke={DS} />
          <Neck a={[82, 108]} b={[96, 104]} stroke={DS} />
          <Limb a={[52, 124]} b={[46, 152]} bendAmt={5} side={-1} stroke={DS} fill={D} w={5.5} />
          <Limb a={[74, 124]} b={[80, 152]} bendAmt={5} side={1} stroke={DS} fill={D} w={5.5} />
          <g className="bjj-press" style={{ transformOrigin: '148px 90px' }}>
            <Torso x={148} y={92} w={42} h={30} fill={A} stroke={AS} />
            <Neck a={[168, 78]} b={[176, 66]} stroke={AS} />
            <Head x={182} y={60} fill={A} stroke={AS} />
            <Limb a={[158, 78]} b={[168, 132]} bendAmt={7} side={-1} stroke={AS} fill={A} w={6} />
            <Limb a={[132, 100]} b={t} bendAmt={5} side={1} stroke={AS} fill={A} w={7} animate={highlight && 'sway-in'} origin={[132, 100]} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'fifty-fifty': {
      const legEnd: Pt = highlight ? [150, 134] : [168, 136];
      return (
        <>
          <Ground />
          <g className="bjj-press" style={{ transformOrigin: '92px 128px' }}>
            <Head x={46} y={128} r={10.5} fill={A} stroke={AS} />
            <Neck a={[46, 128]} b={[64, 128]} stroke={AS} />
            <Torso x={92} y={128} w={52} h={26} fill={A} stroke={AS} />
            <Limb a={[118, 132]} b={legEnd} bendAmt={9} side={1} stroke={AS} fill={A} animate={highlight && 'sway-in'} origin={[118, 132]} />
          </g>
          <Head x={254} y={128} r={10.5} fill={D} stroke={DS} />
          <Neck a={[254, 128]} b={[236, 128]} stroke={DS} />
          <Torso x={208} y={128} w={52} h={26} fill={D} stroke={DS} />
          <Limb a={[182, 132]} b={[132, 136]} bendAmt={9} side={-1} stroke={DS} fill={D} />
          {highlight && <HighlightRing x={150} y={134} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'standing':
      return (
        <>
          <Ground />
          <g className="bjj-arc" style={{ transformOrigin: '74px 110px' }}>
            <Torso x={74} y={98} w={22} h={46} fill={A} stroke={AS} rotate={-6} />
            <Neck a={[74, 74]} b={[80, 64]} stroke={AS} />
            <Head x={84} y={58} r={10.5} fill={A} stroke={AS} />
            <Limb a={[70, 120]} b={[62, 154]} bendAmt={5} side={-1} stroke={AS} fill={A} w={6} />
            <Limb a={[80, 120]} b={[90, 154]} bendAmt={5} side={1} stroke={AS} fill={A} w={6} />
            <Limb a={[82, 90]} b={[112, 102]} bendAmt={6} side={1} stroke={AS} fill={A} w={6} />
          </g>
          <Torso x={188} y={96} w={22} h={48} fill={D} stroke={DS} />
          <Neck a={[188, 72]} b={[188, 62]} stroke={DS} />
          <Head x={188} y={56} r={10.5} fill={D} stroke={DS} />
          <Limb a={[184, 118]} b={[176, 154]} bendAmt={5} side={-1} stroke={DS} fill={D} w={6} />
          <Limb a={[192, 118]} b={[200, 154]} bendAmt={5} side={1} stroke={DS} fill={D} w={6} />
          <Limb a={[184, 88]} b={[158, 100]} bendAmt={6} side={-1} stroke={DS} fill={D} w={6} />
        </>
      );
    case 'guard-pass':
      return (
        <>
          <Ground />
          <Head x={48} y={132} fill={D} stroke={DS} />
          <Neck a={[48, 132]} b={[68, 132]} stroke={DS} />
          <Torso x={100} y={132} w={64} h={26} fill={D} stroke={DS} />
          <Limb a={[132, 124]} b={[168, 100]} bendAmt={9} side={1} stroke={DS} fill={D} />
          <Limb a={[132, 140]} b={[172, 146]} bendAmt={8} side={-1} stroke={DS} fill={D} />
          <g className="bjj-arc" style={{ transformOrigin: '192px 120px' }}>
            <Limb a={[180, 122]} b={[168, 152]} bendAmt={7} side={-1} stroke={AS} fill={A} />
            <Limb a={[204, 122]} b={[214, 152]} bendAmt={7} side={1} stroke={AS} fill={A} />
            <Torso x={192} y={108} w={44} h={30} fill={A} stroke={AS} />
            <Neck a={[210, 90]} b={[216, 78]} stroke={AS} />
            <Head x={222} y={74} fill={A} stroke={AS} />
          </g>
        </>
      );
    case 'sweep':
      return (
        <>
          <Ground />
          <g className="bjj-press" style={{ transformOrigin: '110px 112px' }}>
            <Head x={58} y={120} fill={A} stroke={AS} />
            <Neck a={[58, 120]} b={[76, 116]} stroke={AS} />
            <Torso x={110} y={110} w={64} h={26} fill={A} stroke={AS} rotate={-8} />
            <Limb a={[140, 118]} b={[190, 90]} bendAmt={10} side={1} stroke={AS} fill={A} />
          </g>
          <g className="bjj-arc" style={{ transformOrigin: '200px 80px' }}>
            <Torso x={200} y={70} w={26} h={44} fill={D} stroke={DS} rotate={20} />
            <Neck a={[212, 50]} b={[218, 38]} stroke={DS} />
            <Head x={222} y={32} r={10.5} fill={D} stroke={DS} />
            <Limb a={[196, 90]} b={[178, 120]} bendAmt={7} side={-1} stroke={DS} fill={D} />
          </g>
        </>
      );
    case 'takedown-shot':
      return (
        <>
          <Ground />
          <Torso x={210} y={94} w={22} h={48} fill={D} stroke={DS} />
          <Neck a={[210, 70]} b={[210, 60]} stroke={DS} />
          <Head x={210} y={54} r={10.5} fill={D} stroke={DS} />
          <Limb a={[206, 116]} b={[198, 154]} bendAmt={5} side={-1} stroke={DS} fill={D} w={6} />
          <Limb a={[214, 116]} b={[222, 154]} bendAmt={5} side={1} stroke={DS} fill={D} w={6} />
          <g className="bjj-arc" style={{ transformOrigin: '100px 132px' }}>
            <Torso x={100} y={130} w={62} h={26} fill={A} stroke={AS} rotate={-4} />
            <Neck a={[66, 128]} b={[46, 138]} stroke={AS} />
            <Head x={40} y={142} r={10.5} fill={A} stroke={AS} />
            <Limb a={[130, 138]} b={[158, 152]} bendAmt={8} side={1} stroke={AS} fill={A} />
            <Limb a={[118, 138]} b={[112, 156]} bendAmt={6} side={-1} stroke={AS} fill={A} w={6} />
            <Limb a={[86, 120]} b={[168, 132]} bendAmt={9} side={1} stroke={AS} fill={A} w={6} />
          </g>
        </>
      );
    default:
      return <Ground />;
  }
}

export function TechniqueDiagram({ scene, highlight, className = '' }: { scene: SceneId; highlight?: Highlight; className?: string }) {
  return (
    <svg viewBox="0 0 300 180" className={className} role="img" aria-label={`${scene} diagram`}>
      <style>{`
        @keyframes bjj-press { 0%,100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        @keyframes bjj-sway-in { 0%,100% { transform: rotate(-3deg); } 55% { transform: rotate(11deg); } }
        @keyframes bjj-pulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes bjj-arc { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(9px,-4px) rotate(5deg); } }
        .bjj-press { animation: bjj-press 2.6s ease-in-out infinite; }
        .bjj-sway-in { animation: bjj-sway-in 2.1s ease-in-out infinite; }
        .bjj-pulse { animation: bjj-pulse 1.7s ease-in-out infinite; }
        .bjj-arc { animation: bjj-arc 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .bjj-press, .bjj-sway-in, .bjj-pulse, .bjj-arc { animation: none; }
        }
      `}</style>
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
