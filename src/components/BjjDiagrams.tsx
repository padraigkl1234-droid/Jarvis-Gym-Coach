'use client';

import React from 'react';
import type { SceneId, Highlight } from '@/lib/bjj';

/**
 * A single reusable human-body rig, posed differently for every diagram.
 * One figure = one skeleton (head, neck, shoulders, elbows, hands, hips,
 * knees, feet) built from joint angles and fixed bone lengths, rendered as
 * a real silhouette: a tapered torso, tapered limb segments with rounded
 * joints, hands, and feet — not lines and blobs. The figure executing each
 * technique is clay-colored; the other stays neutral/light. Every diagram
 * loops through the actual motion, and for submissions the finishing limb
 * swings toward a pulsing ring at the target, computed from its own hand
 * or foot position so the two always line up exactly.
 */

type Pt = [number, number];

const COLORS = {
  mat: '#EEEADF',
  matLine: '#E4DFD0',
  defenderFill: '#F2EFE6',
  defenderStroke: '#ADA695',
  attackerFill: '#C4633B',
  attackerStroke: '#8A3B1E',
  highlight: '#E8895C',
};
const D = COLORS.defenderFill;
const DS = COLORS.defenderStroke;
const A = COLORS.attackerFill;
const AS = COLORS.attackerStroke;

/* ---------------------------- geometry helpers --------------------------- */

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}
function polar(o: Pt, deg: number, len: number): Pt {
  return [o[0] + Math.cos(rad(deg)) * len, o[1] + Math.sin(rad(deg)) * len];
}
function norm(v: Pt): Pt {
  const len = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / len, v[1] / len];
}

/** Rounded-corner closed polygon (Catmull-style corner cut + quadratic curve). */
function roundedPolygonPath(points: Pt[], r: number): string {
  const n = points.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const toPrev = norm([prev[0] - curr[0], prev[1] - curr[1]]);
    const toNext = norm([next[0] - curr[0], next[1] - curr[1]]);
    const p1: Pt = [curr[0] + toPrev[0] * r, curr[1] + toPrev[1] * r];
    const p2: Pt = [curr[0] + toNext[0] * r, curr[1] + toNext[1] * r];
    d += (i === 0 ? `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} ` : `L${p1[0].toFixed(1)},${p1[1].toFixed(1)} `) + `Q${curr[0].toFixed(1)},${curr[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} `;
  }
  return d + 'Z';
}

/* -------------------------------- the rig --------------------------------- */

interface LimbSpec {
  angle: number; // absolute direction of the first bone (deg, 0=right, 90=down)
  bend: number; // relative turn at the joint for the second bone
  len1?: number;
  len2?: number;
}

interface RigOpts {
  hip: Pt;
  torsoAngle: number; // direction from hip to shoulder line (spine vector)
  torsoLen?: number;
  shoulderW?: number;
  hipW?: number;
  neckLen?: number;
  headR?: number;
  armL: LimbSpec;
  armR: LimbSpec;
  legL: LimbSpec;
  legR: LimbSpec;
}

interface Pose {
  head: Pt;
  headR: number;
  neckBase: Pt;
  shoulderC: Pt;
  shoulderL: Pt;
  shoulderR: Pt;
  hip: Pt;
  hipL: Pt;
  hipR: Pt;
  waistL: Pt;
  waistR: Pt;
  elbowL: Pt;
  handL: Pt;
  elbowR: Pt;
  handR: Pt;
  kneeL: Pt;
  footL: Pt;
  kneeR: Pt;
  footR: Pt;
}

const BONE = { upperArm: 25, forearm: 22, thigh: 31, shin: 29 };

function buildPose(o: RigOpts): Pose {
  const torsoLen = o.torsoLen ?? 46;
  // Default is narrow — right for a lying/horizontal spine, where the
  // shoulder/hip offset runs perpendicular (i.e. vertically); scenes with a
  // near-vertical torso (standing, seated, mounted) pass a wider explicit
  // value since there the same offset runs naturally left-right.
  const shoulderW = o.shoulderW ?? 21;
  const hipW = o.hipW ?? 18;
  const neckLen = o.neckLen ?? 9;
  const headR = o.headR ?? 12.5;

  const shoulderC = polar(o.hip, o.torsoAngle, torsoLen);
  const neckBase = shoulderC;
  const head = polar(shoulderC, o.torsoAngle, neckLen + headR * 0.9);
  const shoulderL = polar(shoulderC, o.torsoAngle + 90, shoulderW / 2);
  const shoulderR = polar(shoulderC, o.torsoAngle - 90, shoulderW / 2);
  const hipL = polar(o.hip, o.torsoAngle + 90, hipW / 2);
  const hipR = polar(o.hip, o.torsoAngle - 90, hipW / 2);
  const waistC = polar(o.hip, o.torsoAngle, torsoLen * 0.48);
  const waistL = polar(waistC, o.torsoAngle + 90, shoulderW * 0.36);
  const waistR = polar(waistC, o.torsoAngle - 90, shoulderW * 0.36);

  const armLen1 = o.armL.len1 ?? BONE.upperArm;
  const armLen2 = o.armL.len2 ?? BONE.forearm;
  const elbowL = polar(shoulderL, o.armL.angle, armLen1);
  const handL = polar(elbowL, o.armL.angle + o.armL.bend, armLen2);

  const armRen1 = o.armR.len1 ?? BONE.upperArm;
  const armRen2 = o.armR.len2 ?? BONE.forearm;
  const elbowR = polar(shoulderR, o.armR.angle, armRen1);
  const handR = polar(elbowR, o.armR.angle + o.armR.bend, armRen2);

  const legLen1 = o.legL.len1 ?? BONE.thigh;
  const legLen2 = o.legL.len2 ?? BONE.shin;
  const kneeL = polar(hipL, o.legL.angle, legLen1);
  const footL = polar(kneeL, o.legL.angle + o.legL.bend, legLen2);

  const legRen1 = o.legR.len1 ?? BONE.thigh;
  const legRen2 = o.legR.len2 ?? BONE.shin;
  const kneeR = polar(hipR, o.legR.angle, legRen1);
  const footR = polar(kneeR, o.legR.angle + o.legR.bend, legRen2);

  return { head, headR, neckBase, shoulderC, shoulderL, shoulderR, hip: o.hip, hipL, hipR, waistL, waistR, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR };
}

/* ------------------------------- rendering -------------------------------- */

function Limb({
  a,
  mid,
  b,
  w1,
  w2,
  w3,
  fill,
  stroke,
  extremity,
  animate,
  origin,
}: {
  a: Pt;
  mid: Pt;
  b: Pt;
  w1: number;
  w2: number;
  w3: number;
  fill: string;
  stroke: string;
  extremity: 'hand' | 'foot';
  animate?: boolean;
  origin?: Pt;
}) {
  const footAngle = (Math.atan2(b[1] - mid[1], b[0] - mid[0]) * 180) / Math.PI;
  return (
    <g className={animate ? 'bjj-sway-in' : undefined} style={animate ? { transformOrigin: `${(origin ?? a)[0]}px ${(origin ?? a)[1]}px` } : undefined}>
      {/* outline pass (wider, stroke color) then fill pass (narrower, body color) per segment */}
      <line x1={a[0]} y1={a[1]} x2={mid[0]} y2={mid[1]} stroke={stroke} strokeWidth={w1 * 2 + 2.4} strokeLinecap="round" />
      <line x1={mid[0]} y1={mid[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={w2 * 2 + 2.4} strokeLinecap="round" />
      <line x1={a[0]} y1={a[1]} x2={mid[0]} y2={mid[1]} stroke={fill} strokeWidth={w1 * 2} strokeLinecap="round" />
      <line x1={mid[0]} y1={mid[1]} x2={b[0]} y2={b[1]} stroke={fill} strokeWidth={w2 * 2} strokeLinecap="round" />
      <circle cx={mid[0]} cy={mid[1]} r={Math.min(w1, w2) * 0.92} fill={fill} stroke={stroke} strokeWidth={1.4} />
      {extremity === 'hand' ? (
        <circle cx={b[0]} cy={b[1]} r={w3 * 0.95} fill={fill} stroke={stroke} strokeWidth={1.4} />
      ) : (
        <ellipse cx={b[0] + Math.cos(rad(footAngle)) * 3} cy={b[1] + Math.sin(rad(footAngle)) * 3} rx={7.5} ry={4.4} fill={fill} stroke={stroke} strokeWidth={1.4} transform={`rotate(${footAngle} ${b[0]} ${b[1]})`} />
      )}
    </g>
  );
}

function HumanFigure({
  pose,
  fill,
  stroke,
  activeLimb,
}: {
  pose: Pose;
  fill: string;
  stroke: string;
  activeLimb?: 'armL' | 'armR' | 'legL' | 'legR';
}) {
  const torso = roundedPolygonPath([pose.shoulderL, pose.waistL, pose.hipL, pose.hipR, pose.waistR, pose.shoulderR], 9);
  return (
    <g>
      <Limb a={pose.hipL} mid={pose.kneeL} b={pose.footL} w1={11.5} w2={8} w3={5.5} fill={fill} stroke={stroke} extremity="foot" animate={activeLimb === 'legL'} origin={pose.hipL} />
      <Limb a={pose.hipR} mid={pose.kneeR} b={pose.footR} w1={11.5} w2={8} w3={5.5} fill={fill} stroke={stroke} extremity="foot" animate={activeLimb === 'legR'} origin={pose.hipR} />
      <path d={torso} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <line x1={pose.shoulderC[0]} y1={pose.shoulderC[1]} x2={pose.head[0]} y2={pose.head[1]} stroke={stroke} strokeWidth={16.4} strokeLinecap="round" />
      <line x1={pose.shoulderC[0]} y1={pose.shoulderC[1]} x2={pose.head[0]} y2={pose.head[1]} stroke={fill} strokeWidth={14} strokeLinecap="round" />
      <Limb a={pose.shoulderR} mid={pose.elbowR} b={pose.handR} w1={8.5} w2={6} w3={4.2} fill={fill} stroke={stroke} extremity="hand" animate={activeLimb === 'armR'} origin={pose.shoulderR} />
      <Limb a={pose.shoulderL} mid={pose.elbowL} b={pose.handL} w1={8.5} w2={6} w3={4.2} fill={fill} stroke={stroke} extremity="hand" animate={activeLimb === 'armL'} origin={pose.shoulderL} />
      <circle cx={pose.head[0]} cy={pose.head[1]} r={pose.headR} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <circle cx={pose.head[0] - pose.headR * 0.32} cy={pose.head[1] - pose.headR * 0.35} r={pose.headR * 0.26} fill="#fff" fillOpacity={0.25} />
    </g>
  );
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

function Ground({ y = 160 }: { y?: number }) {
  return <line x1={8} y1={y} x2={292} y2={y} stroke={COLORS.matLine} strokeWidth={2} />;
}

/** Which of the active figure's four limbs its hand/foot lands on, keyed per scene. */
function handOf(pose: Pose, limb: 'armL' | 'armR' | 'legL' | 'legR'): Pt {
  return limb === 'armL' ? pose.handL : limb === 'armR' ? pose.handR : limb === 'legL' ? pose.footL : pose.footR;
}

/* --------------------------------- scenes --------------------------------- */

function Scene({ id, highlight }: { id: SceneId; highlight?: Highlight }) {
  const wrapClass = (kind: 'press' | 'arc', origin: Pt) => ({ className: `bjj-${kind}`, style: { transformOrigin: `${origin[0]}px ${origin[1]}px` } as React.CSSProperties });

  switch (id) {
    case 'mount': {
      const defender = buildPose({
        hip: [130, 148],
        torsoAngle: 180,
        armL: { angle: 65, bend: 25 },
        armR: { angle: 100, bend: -15 },
        legL: { angle: 3, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const active: 'armR' = 'armR';
      const attacker = buildPose({
        hip: [124, 122],
        torsoAngle: -85,
        torsoLen: 42,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: -35, bend: -55, len1: 22, len2: 20 },
        armR: { angle: highlight ? 195 : 160, bend: highlight ? -35 : -10, len1: 23, len2: 21 },
        legL: { angle: 145, bend: -25, len1: 26, len2: 22 },
        legR: { angle: 55, bend: 30, len1: 26, len2: 22 },
      });
      const t = handOf(attacker, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'back-control': {
      const defender = buildPose({
        hip: [172, 132],
        torsoAngle: -95,
        torsoLen: 44,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 40, bend: 20 },
        armR: { angle: 150, bend: -20 },
        legL: { angle: 95, bend: 15 },
        legR: { angle: 75, bend: -10 },
      });
      const active: 'armL' = 'armL';
      const attacker = buildPose({
        hip: [116, 138],
        torsoAngle: -100,
        torsoLen: 40,
        shoulderW: 32,
        hipW: 27,
        armR: { angle: 15, bend: 35, len1: 23, len2: 20 },
        armL: { angle: highlight ? -100 : -70, bend: highlight ? 30 : 10, len1: 24, len2: 22 },
        legL: { angle: 165, bend: -25, len1: 24, len2: 22 },
        legR: { angle: 15, bend: 30, len1: 24, len2: 22 },
      });
      const t = handOf(attacker, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'side-control': {
      const defender = buildPose({
        hip: [110, 144],
        torsoAngle: 180,
        armL: { angle: 70, bend: 20 },
        armR: { angle: 250, bend: -10 },
        legL: { angle: 8, bend: 6 },
        legR: { angle: -4, bend: 10 },
      });
      const active: 'armR' = 'armR';
      const attacker = buildPose({
        hip: [128, 96],
        torsoAngle: 8,
        torsoLen: 40,
        armL: { angle: 150, bend: 10, len1: 22, len2: 20 },
        armR: { angle: highlight ? 250 : 220, bend: highlight ? -55 : -25, len1: 23, len2: 20 },
        legL: { angle: 110, bend: 10, len1: 27, len2: 24 },
        legR: { angle: 135, bend: -20, len1: 27, len2: 24 },
      });
      const t = handOf(attacker, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'knee-on-belly': {
      const defender = buildPose({
        hip: [104, 146],
        torsoAngle: 180,
        armL: { angle: 70, bend: 15 },
        armR: { angle: 250, bend: -10 },
        legL: { angle: 6, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const attacker = buildPose({
        hip: [126, 92],
        torsoAngle: -85,
        torsoLen: 40,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 150, bend: -10, len1: 22, len2: 20 },
        armR: { angle: 210, bend: -25, len1: 22, len2: 20 },
        legL: { angle: 145, bend: -35, len1: 20, len2: 30 },
        legR: { angle: 60, bend: 30, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'north-south': {
      const defender = buildPose({
        hip: [104, 144],
        torsoAngle: 180,
        armL: { angle: 70, bend: 15 },
        armR: { angle: 250, bend: -10 },
        legL: { angle: 6, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const active: 'armL' = 'armL';
      const attacker = buildPose({
        hip: [128, 100],
        torsoAngle: 0,
        torsoLen: 38,
        armR: { angle: 130, bend: 20, len1: 20, len2: 18 },
        armL: { angle: highlight ? 195 : 170, bend: highlight ? -30 : -10, len1: 26, len2: 24 },
        legL: { angle: 235, bend: -15, len1: 24, len2: 22 },
        legR: { angle: 105, bend: 10, len1: 24, len2: 22 },
      });
      const t = handOf(attacker, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'closed-guard': {
      // Guard player (clay) executes every submission mapped here.
      const active: 'armL' = 'armL';
      const guard = buildPose({
        hip: [110, 140],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { angle: highlight ? 320 : 300, bend: highlight ? -45 : -20, len1: 26, len2: 24 },
        legL: { angle: 320, bend: -70, len1: 32, len2: 30 },
        legR: { angle: 20, bend: 70, len1: 32, len2: 30 },
      });
      const top = buildPose({
        hip: [222, 128],
        torsoAngle: -95,
        torsoLen: 40,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 200, bend: -20 },
        armR: { angle: 300, bend: 30 },
        legL: { angle: 130, bend: -20 },
        legR: { angle: 70, bend: 25 },
      });
      const t = handOf(guard, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={top} fill={D} stroke={DS} />
          <g {...wrapClass('press', guard.hip)}>
            <HumanFigure pose={guard} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'half-guard': {
      const guard = buildPose({
        hip: [108, 140],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { angle: 300, bend: 10, len1: 27, len2: 24 },
        legL: { angle: 320, bend: -30, len1: 30, len2: 26 },
        legR: { angle: 20, bend: 8 },
      });
      const top = buildPose({
        hip: [212, 122],
        torsoAngle: -95,
        torsoLen: 40,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 200, bend: -15 },
        armR: { angle: 300, bend: 25 },
        legL: { angle: 130, bend: -15 },
        legR: { angle: 70, bend: 20 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={top} fill={D} stroke={DS} />
          <g {...wrapClass('press', guard.hip)}>
            <HumanFigure pose={guard} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'butterfly-guard': {
      const guard = buildPose({
        hip: [92, 140],
        torsoAngle: -100,
        torsoLen: 38,
        shoulderW: 30,
        hipW: 25,
        armL: { angle: 210, bend: -25 },
        armR: { angle: 320, bend: 15 },
        legL: { angle: 60, bend: -75, len1: 26, len2: 22 },
        legR: { angle: 40, bend: -55, len1: 26, len2: 22 },
      });
      const top = buildPose({
        hip: [206, 128],
        torsoAngle: -95,
        torsoLen: 38,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 200, bend: -15 },
        armR: { angle: 300, bend: 25 },
        legL: { angle: 130, bend: -15 },
        legR: { angle: 70, bend: 20 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={top} fill={D} stroke={DS} />
          <g {...wrapClass('press', guard.hip)}>
            <HumanFigure pose={guard} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'delariva-guard': {
      const guard = buildPose({
        hip: [98, 142],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { angle: 300, bend: 15, len1: 26, len2: 22 },
        legL: { angle: 330, bend: -85, len1: 32, len2: 30 },
        legR: { angle: 15, bend: 20, len1: 30, len2: 26 },
      });
      const top = buildPose({
        hip: [220, 122],
        torsoAngle: -95,
        torsoLen: 40,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 200, bend: -15 },
        armR: { angle: 300, bend: 25 },
        legL: { angle: 130, bend: -15 },
        legR: { angle: 70, bend: 20 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={top} fill={D} stroke={DS} />
          <g {...wrapClass('press', guard.hip)}>
            <HumanFigure pose={guard} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'turtle': {
      const defender = buildPose({
        hip: [96, 128],
        torsoAngle: -160,
        torsoLen: 34,
        armL: { angle: 100, bend: 20, len1: 20, len2: 18 },
        armR: { angle: 120, bend: -10, len1: 20, len2: 18 },
        legL: { angle: 120, bend: -95, len1: 20, len2: 16 },
        legR: { angle: 105, bend: -95, len1: 20, len2: 16 },
      });
      const active: 'armR' = 'armR';
      const attacker = buildPose({
        hip: [186, 118],
        torsoAngle: -155,
        torsoLen: 40,
        armL: { angle: 155, bend: -15, len1: 22, len2: 20 },
        armR: { angle: highlight ? 180 : 165, bend: highlight ? 50 : 20, len1: 30, len2: 26 },
        legL: { angle: 100, bend: -20, len1: 26, len2: 24 },
        legR: { angle: 75, bend: 20, len1: 26, len2: 24 },
      });
      const t = handOf(attacker, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'front-headlock': {
      const defender = buildPose({
        hip: [58, 130],
        torsoAngle: -30,
        torsoLen: 38,
        armL: { angle: 100, bend: 15 },
        armR: { angle: 120, bend: -10 },
        legL: { angle: 100, bend: -10 },
        legR: { angle: 80, bend: 15 },
      });
      const active: 'armR' = 'armR';
      const attacker = buildPose({
        hip: [172, 118],
        torsoAngle: -150,
        torsoLen: 38,
        armL: { angle: 140, bend: -10, len1: 22, len2: 20 },
        armR: { angle: highlight ? 172 : 160, bend: highlight ? 30 : 10, len1: 24, len2: 22 },
        legL: { angle: 95, bend: -15, len1: 26, len2: 24 },
        legR: { angle: 70, bend: 20, len1: 26, len2: 24 },
      });
      const t = handOf(attacker, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('press', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'fifty-fifty': {
      const right = buildPose({
        hip: [214, 132],
        torsoAngle: 0,
        armL: { angle: 90, bend: 10 },
        armR: { angle: 300, bend: 10 },
        legL: { angle: 195, bend: -20, len1: 28, len2: 24 },
        legR: { angle: 200, bend: -10, len1: 24, len2: 20 },
      });
      const active: 'legL' = 'legL';
      const left = buildPose({
        hip: [86, 132],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { angle: 300, bend: 10 },
        legR: { angle: highlight ? -15 : -8, bend: highlight ? 10 : 8, len1: 30, len2: 26 },
        legL: { angle: highlight ? 20 : 12, bend: highlight ? -35 : -10, len1: 30, len2: 26 },
      });
      const t = handOf(left, active);
      return (
        <>
          <Ground />
          <HumanFigure pose={right} fill={D} stroke={DS} />
          <g {...wrapClass('press', left.hip)}>
            <HumanFigure pose={left} fill={A} stroke={AS} activeLimb={highlight ? active : undefined} />
          </g>
          {highlight && <HighlightRing x={t[0]} y={t[1]} glyph={HIGHLIGHT_GLYPH[highlight]} />}
        </>
      );
    }
    case 'standing': {
      const defender = buildPose({
        hip: [206, 108],
        torsoAngle: -90,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 220, bend: -15 },
        armR: { angle: 320, bend: 15 },
        legL: { angle: 100, bend: -10 },
        legR: { angle: 80, bend: 10 },
      });
      const attacker = buildPose({
        hip: [92, 112],
        torsoAngle: -100,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 240, bend: -20 },
        armR: { angle: 10, bend: 30 },
        legL: { angle: 105, bend: -15 },
        legR: { angle: 75, bend: 20 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('arc', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'guard-pass': {
      const defender = buildPose({
        hip: [100, 142],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { angle: 300, bend: 10 },
        legL: { angle: 330, bend: -65, len1: 30, len2: 26 },
        legR: { angle: 15, bend: 55, len1: 30, len2: 26 },
      });
      const attacker = buildPose({
        hip: [206, 118],
        torsoAngle: -110,
        torsoLen: 40,
        shoulderW: 30,
        hipW: 25,
        armL: { angle: 230, bend: -20 },
        armR: { angle: 320, bend: 20 },
        legL: { angle: 140, bend: -15 },
        legR: { angle: 60, bend: 20 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('arc', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'sweep': {
      const top = buildPose({
        hip: [214, 84],
        torsoAngle: -70,
        torsoLen: 40,
        shoulderW: 28,
        hipW: 23,
        armL: { angle: 210, bend: -15 },
        armR: { angle: 260, bend: -25 },
        legL: { angle: 130, bend: -10 },
        legR: { angle: 110, bend: -20 },
      });
      const bottom = buildPose({
        hip: [96, 130],
        torsoAngle: -155,
        torsoLen: 42,
        armL: { angle: 100, bend: 15 },
        armR: { angle: 120, bend: -10 },
        legL: { angle: 40, bend: -60, len1: 30, len2: 26 },
        legR: { angle: 25, bend: -35, len1: 30, len2: 26 },
      });
      return (
        <>
          <Ground />
          <g {...wrapClass('arc', top.hip)}>
            <HumanFigure pose={top} fill={D} stroke={DS} />
          </g>
          <g {...wrapClass('press', bottom.hip)}>
            <HumanFigure pose={bottom} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
    case 'takedown-shot': {
      const defender = buildPose({
        hip: [216, 108],
        torsoAngle: -90,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 220, bend: -15 },
        armR: { angle: 320, bend: 15 },
        legL: { angle: 100, bend: -10 },
        legR: { angle: 80, bend: 10 },
      });
      const attacker = buildPose({
        hip: [100, 138],
        torsoAngle: 165,
        torsoLen: 40,
        armL: { angle: 15, bend: 25, len1: 26, len2: 24 },
        armR: { angle: 40, bend: 15, len1: 26, len2: 24 },
        legL: { angle: 235, bend: -20, len1: 26, len2: 24 },
        legR: { angle: 100, bend: 15, len1: 26, len2: 24 },
      });
      return (
        <>
          <Ground />
          <HumanFigure pose={defender} fill={D} stroke={DS} />
          <g {...wrapClass('arc', attacker.hip)}>
            <HumanFigure pose={attacker} fill={A} stroke={AS} />
          </g>
        </>
      );
    }
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
        @keyframes bjj-arc { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(8px,-4px) rotate(4deg); } }
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
