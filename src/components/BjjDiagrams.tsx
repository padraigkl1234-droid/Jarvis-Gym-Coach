'use client';

import React from 'react';
import type { SceneId, Highlight } from '@/lib/bjj';

/**
 * Technique diagrams built from one reusable human-body rig, posed and
 * layered per technique. Each figure is a real skeleton — head, neck,
 * shoulders, elbows, hands, hips, knees, feet — with fixed bone lengths.
 * Limbs can be aimed with explicit joint angles OR with an IK target so a
 * hand lands exactly on the opponent's neck, wrist or ankle. Scenes control
 * draw order limb-by-limb, letting a choking arm wrap OVER the opponent's
 * body while the attacker's torso sits behind it — so each move shows its
 * real mechanics: the RNC forearm crosses the throat, the armbar arm is
 * stretched over the hips, the triangle's legs lock around the neck.
 * The clay figure is the one executing the technique; diagrams loop with a
 * subtle motion and a pulsing ring marks the finishing detail.
 */

type Pt = [number, number];
type LimbId = 'armL' | 'armR' | 'legL' | 'legR';

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

/** Two-bone IK: joint chain root→mid→end with the end pulled to `target`. */
function solveIK(root: Pt, target: Pt, l1: number, l2: number, side: 1 | -1): { mid: Pt; end: Pt } {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const dRaw = Math.hypot(dx, dy) || 0.001;
  const d = Math.min(Math.max(dRaw, Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.5);
  const ux = dx / dRaw;
  const uy = dy / dRaw;
  const end: Pt = [root[0] + ux * d, root[1] + uy * d];
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mid: Pt = [root[0] + ux * a + -uy * h * side, root[1] + uy * a + ux * h * side];
  return { mid, end };
}

/** Rounded-corner closed polygon for the torso silhouette. */
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
    d +=
      (i === 0 ? `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} ` : `L${p1[0].toFixed(1)},${p1[1].toFixed(1)} `) +
      `Q${curr[0].toFixed(1)},${curr[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} `;
  }
  return d + 'Z';
}

/* -------------------------------- the rig --------------------------------- */

type LimbSpec =
  | { angle: number; bend: number; len1?: number; len2?: number }
  | { target: Pt; side?: 1 | -1; len1?: number; len2?: number };

interface RigOpts {
  hip: Pt;
  torsoAngle: number; // spine direction hip→shoulders (deg; 0=right, 90=down)
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

function resolveLimb(root: Pt, spec: LimbSpec, d1: number, d2: number): { mid: Pt; end: Pt } {
  const l1 = spec.len1 ?? d1;
  const l2 = spec.len2 ?? d2;
  if ('target' in spec) return solveIK(root, spec.target, l1, l2, spec.side ?? 1);
  const mid = polar(root, spec.angle, l1);
  const end = polar(mid, spec.angle + spec.bend, l2);
  return { mid, end };
}

function buildPose(o: RigOpts): Pose {
  const torsoLen = o.torsoLen ?? 46;
  // Narrow default suits a lying/horizontal spine (the offset runs vertically
  // there); vertical-torso poses pass wider explicit values.
  const shoulderW = o.shoulderW ?? 21;
  const hipW = o.hipW ?? 18;
  const neckLen = o.neckLen ?? 9;
  const headR = o.headR ?? 12.5;

  const shoulderC = polar(o.hip, o.torsoAngle, torsoLen);
  const head = polar(shoulderC, o.torsoAngle, neckLen + headR * 0.9);
  const shoulderL = polar(shoulderC, o.torsoAngle + 90, shoulderW / 2);
  const shoulderR = polar(shoulderC, o.torsoAngle - 90, shoulderW / 2);
  const hipL = polar(o.hip, o.torsoAngle + 90, hipW / 2);
  const hipR = polar(o.hip, o.torsoAngle - 90, hipW / 2);
  const waistC = polar(o.hip, o.torsoAngle, torsoLen * 0.48);
  const waistL = polar(waistC, o.torsoAngle + 90, shoulderW * 0.62);
  const waistR = polar(waistC, o.torsoAngle - 90, shoulderW * 0.62);

  const aL = resolveLimb(shoulderL, o.armL, BONE.upperArm, BONE.forearm);
  const aR = resolveLimb(shoulderR, o.armR, BONE.upperArm, BONE.forearm);
  const lL = resolveLimb(hipL, o.legL, BONE.thigh, BONE.shin);
  const lR = resolveLimb(hipR, o.legR, BONE.thigh, BONE.shin);

  return {
    head,
    headR,
    shoulderC,
    shoulderL,
    shoulderR,
    hip: o.hip,
    hipL,
    hipR,
    waistL,
    waistR,
    elbowL: aL.mid,
    handL: aL.end,
    elbowR: aR.mid,
    handR: aR.end,
    kneeL: lL.mid,
    footL: lL.end,
    kneeR: lR.mid,
    footR: lR.end,
  };
}

/* ------------------------------- rendering -------------------------------- */

function SegLimb({
  a,
  mid,
  b,
  w1,
  w2,
  w3,
  fill,
  stroke,
  extremity,
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
}) {
  const footAngle = (Math.atan2(b[1] - mid[1], b[0] - mid[0]) * 180) / Math.PI;
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={mid[0]} y2={mid[1]} stroke={stroke} strokeWidth={w1 * 2 + 2.4} strokeLinecap="round" />
      <line x1={mid[0]} y1={mid[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={w2 * 2 + 2.4} strokeLinecap="round" />
      <line x1={a[0]} y1={a[1]} x2={mid[0]} y2={mid[1]} stroke={fill} strokeWidth={w1 * 2} strokeLinecap="round" />
      <line x1={mid[0]} y1={mid[1]} x2={b[0]} y2={b[1]} stroke={fill} strokeWidth={w2 * 2} strokeLinecap="round" />
      <circle cx={mid[0]} cy={mid[1]} r={Math.min(w1, w2) * 0.9} fill={fill} stroke={stroke} strokeWidth={1.4} />
      {extremity === 'hand' ? (
        <circle cx={b[0]} cy={b[1]} r={w3 * 0.95} fill={fill} stroke={stroke} strokeWidth={1.4} />
      ) : (
        <ellipse
          cx={b[0] + Math.cos(rad(footAngle)) * 3}
          cy={b[1] + Math.sin(rad(footAngle)) * 3}
          rx={7.5}
          ry={4.4}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.4}
          transform={`rotate(${footAngle} ${b[0]} ${b[1]})`}
        />
      )}
    </g>
  );
}

const LIMB_DEF: Record<LimbId, { root: 'shoulderL' | 'shoulderR' | 'hipL' | 'hipR'; mid: 'elbowL' | 'elbowR' | 'kneeL' | 'kneeR'; end: 'handL' | 'handR' | 'footL' | 'footR'; kind: 'hand' | 'foot' }> = {
  armL: { root: 'shoulderL', mid: 'elbowL', end: 'handL', kind: 'hand' },
  armR: { root: 'shoulderR', mid: 'elbowR', end: 'handR', kind: 'hand' },
  legL: { root: 'hipL', mid: 'kneeL', end: 'footL', kind: 'foot' },
  legR: { root: 'hipR', mid: 'kneeR', end: 'footR', kind: 'foot' },
};

/** One limb, drawable anywhere in a scene's layer order. */
function PoseLimb({ pose, limb, fill, stroke }: { pose: Pose; limb: LimbId; fill: string; stroke: string }) {
  const def = LIMB_DEF[limb];
  const isArm = limb === 'armL' || limb === 'armR';
  return (
    <SegLimb
      a={pose[def.root]}
      mid={pose[def.mid]}
      b={pose[def.end]}
      w1={isArm ? 8.5 : 11.5}
      w2={isArm ? 6 : 8}
      w3={isArm ? 4.2 : 5.5}
      fill={fill}
      stroke={stroke}
      extremity={def.kind}
    />
  );
}

/** Torso + neck + head + any limbs not hidden (hidden ones are drawn later by the scene as overlays). */
function Figure({ pose, fill, stroke, hide = [] }: { pose: Pose; fill: string; stroke: string; hide?: LimbId[] }) {
  const torso = roundedPolygonPath([pose.shoulderL, pose.waistL, pose.hipL, pose.hipR, pose.waistR, pose.shoulderR], 9);
  const show = (l: LimbId) => !hide.includes(l);
  return (
    <g>
      {show('legL') && <PoseLimb pose={pose} limb="legL" fill={fill} stroke={stroke} />}
      {show('legR') && <PoseLimb pose={pose} limb="legR" fill={fill} stroke={stroke} />}
      <path d={torso} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <line x1={pose.shoulderC[0]} y1={pose.shoulderC[1]} x2={pose.head[0]} y2={pose.head[1]} stroke={stroke} strokeWidth={16.4} strokeLinecap="round" />
      <line x1={pose.shoulderC[0]} y1={pose.shoulderC[1]} x2={pose.head[0]} y2={pose.head[1]} stroke={fill} strokeWidth={14} strokeLinecap="round" />
      {show('armR') && <PoseLimb pose={pose} limb="armR" fill={fill} stroke={stroke} />}
      {show('armL') && <PoseLimb pose={pose} limb="armL" fill={fill} stroke={stroke} />}
      <circle cx={pose.head[0]} cy={pose.head[1]} r={pose.headR} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <circle cx={pose.head[0] - pose.headR * 0.32} cy={pose.head[1] - pose.headR * 0.35} r={pose.headR * 0.26} fill="#fff" fillOpacity={0.25} />
    </g>
  );
}

/** Animation wrapper keeping all of a figure's layers moving in sync. */
function Anim({ kind, origin, children }: { kind?: 'press' | 'arc' | 'rock'; origin: Pt; children: React.ReactNode }) {
  if (!kind) return <>{children}</>;
  return (
    <g className={`bjj-${kind}`} style={{ transformOrigin: `${origin[0]}px ${origin[1]}px` }}>
      {children}
    </g>
  );
}

function HighlightRing({ at, glyph }: { at: Pt; glyph?: string }) {
  return (
    <g className="bjj-pulse" style={{ transformOrigin: `${at[0]}px ${at[1]}px` }}>
      <circle cx={at[0]} cy={at[1]} r={12} fill="none" stroke={COLORS.highlight} strokeWidth={2.5} strokeDasharray="4 3" />
      {glyph && (
        <text x={at[0]} y={at[1] + 4} textAnchor="middle" fontSize="13" fontWeight={700} fill={COLORS.highlight}>
          {glyph}
        </text>
      )}
    </g>
  );
}

const HIGHLIGHT_GLYPH: Record<Highlight, string> = { neck: '◆', arm: '↝', leg: '↝', shoulder: '↝' };

function Ground() {
  return <line x1={8} y1={160} x2={292} y2={160} stroke={COLORS.matLine} strokeWidth={2} />;
}

/* --------------------------------- scenes --------------------------------- */
/* Every scene: light figure = opponent, clay figure = the athlete executing
   the technique. Layer order is explicit so wrapping limbs sit on top. */

function Scene({ id, highlight }: { id: SceneId; highlight?: Highlight }) {
  const glyph = highlight ? HIGHLIGHT_GLYPH[highlight] : undefined;

  switch (id) {
    /* ------------------------------ positions ----------------------------- */
    case 'mount': {
      const defender = buildPose({
        hip: [130, 148],
        torsoAngle: 180,
        armL: { angle: 65, bend: 25 },
        armR: { target: [96, 118], side: -1 },
        legL: { angle: 3, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const attacker = buildPose({
        hip: [124, 122],
        torsoAngle: -85,
        torsoLen: 42,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: -35, bend: -55, len1: 22, len2: 20 },
        armR: { target: [96, 116], side: 1, len1: 23, len2: 21 },
        legL: { angle: 145, bend: -25, len1: 26, len2: 22 },
        legR: { angle: 55, bend: 30, len1: 26, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[96, 116]} glyph={glyph} />}
        </>
      );
    }
    case 'back-control': {
      const defender = buildPose({
        hip: [172, 130],
        torsoAngle: -95,
        torsoLen: 44,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 40, bend: 20 },
        armR: { angle: 150, bend: -20 },
        legL: { angle: 55, bend: 55 },
        legR: { angle: 35, bend: 70 },
      });
      const attacker = buildPose({
        hip: [128, 136],
        torsoAngle: -100,
        torsoLen: 42,
        shoulderW: 32,
        hipW: 27,
        armR: { target: [178, 96], side: -1 },
        armL: { target: [176, 66], side: -1 },
        legL: { angle: 145, bend: -30, len1: 25, len2: 22 },
        legR: { target: [186, 138], side: -1, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['armR', 'armL', 'legR']} />
          </Anim>
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armR" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armL" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[176, 68]} glyph={glyph} />}
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
      const attacker = buildPose({
        hip: [152, 96],
        torsoAngle: 12,
        torsoLen: 42,
        armL: { target: [70, 130], side: 1, len1: 25, len2: 23 },
        armR: { target: [112, 132], side: -1, len1: 24, len2: 21 },
        legL: { angle: 100, bend: 10, len1: 27, len2: 24 },
        legR: { angle: 130, bend: -20, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[96, 132]} glyph={glyph} />}
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
        legL: { target: [78, 138], side: -1, len1: 20, len2: 26 },
        legR: { angle: 60, bend: 30, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'north-south': {
      const defender = buildPose({
        hip: [150, 142],
        torsoAngle: 180,
        armL: { angle: 70, bend: 15 },
        armR: { angle: 250, bend: -10 },
        legL: { angle: 6, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const attacker = buildPose({
        hip: [46, 98],
        torsoAngle: 14,
        torsoLen: 44,
        armR: { target: [72, 130], side: -1 },
        armL: { target: [112, 124], side: 1 },
        legL: { angle: 150, bend: -15, len1: 26, len2: 24 },
        legR: { angle: 178, bend: 15, len1: 26, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[80, 138]} glyph={glyph} />}
        </>
      );
    }
    case 'closed-guard': {
      const top = buildPose({
        hip: [216, 124],
        torsoAngle: -100,
        torsoLen: 40,
        shoulderW: 30,
        hipW: 25,
        armL: { target: [160, 116], side: 1 },
        armR: { angle: 300, bend: 30 },
        legL: { angle: 130, bend: -20 },
        legR: { angle: 70, bend: 25 },
      });
      const guard = buildPose({
        hip: [112, 138],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { target: [190, 96], side: -1, len1: 26, len2: 24 },
        legL: { target: [222, 100], side: -1, len1: 32, len2: 30 },
        legR: { target: [226, 132], side: 1, len1: 32, len2: 30 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[192, 94]} glyph={glyph} />}
        </>
      );
    }
    case 'half-guard': {
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
      const guard = buildPose({
        hip: [108, 140],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { target: [186, 100], side: -1, len1: 27, len2: 24 },
        legL: { target: [196, 132], side: -1, len1: 30, len2: 26 },
        legR: { angle: 20, bend: 8 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legL']} />
            <PoseLimb pose={guard} limb="legL" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'butterfly-guard': {
      const top = buildPose({
        hip: [200, 128],
        torsoAngle: -95,
        torsoLen: 38,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 200, bend: -15 },
        armR: { angle: 300, bend: 25 },
        legL: { angle: 130, bend: -15 },
        legR: { angle: 70, bend: 20 },
      });
      const guard = buildPose({
        hip: [104, 138],
        torsoAngle: -100,
        torsoLen: 38,
        shoulderW: 30,
        hipW: 25,
        armL: { target: [172, 100], side: -1 },
        armR: { angle: 320, bend: 15 },
        legL: { target: [178, 128], side: -1, len1: 26, len2: 22 },
        legR: { angle: 40, bend: -55, len1: 26, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'delariva-guard': {
      const top = buildPose({
        hip: [216, 122],
        torsoAngle: -95,
        torsoLen: 40,
        shoulderW: 32,
        hipW: 27,
        armL: { angle: 200, bend: -15 },
        armR: { angle: 300, bend: 25 },
        legL: { target: [188, 156], side: -1 },
        legR: { angle: 78, bend: 10 },
      });
      const guard = buildPose({
        hip: [102, 142],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { target: [186, 148], side: 1, len1: 26, len2: 24 },
        legL: { target: [206, 118], side: -1, len1: 32, len2: 30 },
        legR: { target: [170, 130], side: 1, len1: 30, len2: 26 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legL']} />
            <PoseLimb pose={guard} limb="legL" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'turtle': {
      const defender = buildPose({
        hip: [96, 126],
        torsoAngle: -160,
        torsoLen: 36,
        armL: { angle: 100, bend: 20, len1: 20, len2: 18 },
        armR: { angle: 120, bend: -10, len1: 20, len2: 18 },
        legL: { angle: 120, bend: -95, len1: 20, len2: 16 },
        legR: { angle: 105, bend: -95, len1: 20, len2: 16 },
      });
      const attacker = buildPose({
        hip: [172, 112],
        torsoAngle: -155,
        torsoLen: 40,
        armL: { target: [98, 112], side: 1, len1: 24, len2: 22 },
        armR: { target: [70, 128], side: 1, len1: 28, len2: 26 },
        legL: { angle: 100, bend: -20, len1: 26, len2: 24 },
        legR: { angle: 75, bend: 20, len1: 26, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[70, 126]} glyph={glyph} />}
        </>
      );
    }
    case 'fifty-fifty': {
      const right = buildPose({
        hip: [214, 132],
        torsoAngle: 0,
        armL: { angle: 90, bend: 10 },
        armR: { angle: 300, bend: 10 },
        legL: { target: [128, 136], side: -1, len1: 28, len2: 24 },
        legR: { angle: 200, bend: -10, len1: 24, len2: 20 },
      });
      const left = buildPose({
        hip: [86, 132],
        torsoAngle: 180,
        armR: { angle: 90, bend: 10 },
        armL: { angle: 300, bend: 10 },
        legR: { angle: -8, bend: 8, len1: 30, len2: 26 },
        legL: { target: [172, 128], side: 1, len1: 30, len2: 26 },
      });
      return (
        <>
          <Ground />
          <Figure pose={right} fill={D} stroke={DS} />
          <Anim kind="press" origin={left.hip}>
            <Figure pose={left} fill={A} stroke={AS} hide={['legL']} />
            <PoseLimb pose={left} limb="legL" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[150, 132]} glyph={glyph} />}
        </>
      );
    }
    case 'standing': {
      const defender = buildPose({
        hip: [206, 108],
        torsoAngle: -90,
        shoulderW: 32,
        hipW: 27,
        armL: { target: [162, 100], side: 1 },
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
        armR: { target: [148, 96], side: -1 },
        legL: { angle: 105, bend: -15 },
        legR: { angle: 75, bend: 20 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="rock" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }

    /* ----------------------------- submissions ---------------------------- */
    case 'rnc': {
      // Defender seated; attacker glued to their back, forearm across the
      // throat, other hand behind the head, hooks over the thighs.
      const defender = buildPose({
        hip: [176, 126],
        torsoAngle: -84,
        shoulderW: 30,
        hipW: 26,
        armL: { angle: 60, bend: 20 },
        armR: { target: [198, 74], side: 1 },
        legL: { angle: 8, bend: 78 },
        legR: { angle: -2, bend: 88 },
      });
      const attacker = buildPose({
        hip: [136, 124],
        torsoAngle: -72,
        torsoLen: 44,
        shoulderW: 30,
        hipW: 26,
        armR: { target: [201, 70], side: 1 }, // choking arm — forearm across the throat
        armL: { target: [176, 48], side: -1 }, // palm behind the head
        legL: { angle: 120, bend: -35, len1: 24, len2: 22 },
        legR: { target: [196, 130], side: -1, len1: 27, len2: 24 }, // hook over the thigh
      });
      return (
        <>
          <Ground />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['armR', 'armL', 'legR']} />
          </Anim>
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armL" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[192, 70]} glyph={glyph} />}
        </>
      );
    }
    case 'rear-triangle': {
      // Attacker reclined behind, legs triangled around the neck from the back.
      const defender = buildPose({
        hip: [186, 122],
        torsoAngle: -80,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [206, 66], side: 1 },
        armR: { angle: 60, bend: 20 },
        legL: { angle: 8, bend: 78 },
        legR: { angle: -2, bend: 88 },
      });
      const attacker = buildPose({
        hip: [140, 116],
        torsoAngle: 168,
        torsoLen: 44,
        armR: { angle: -140, bend: -20 },
        armL: { target: [196, 60], side: -1 },
        legR: { target: [212, 72], side: -1, len1: 30, len2: 28 }, // shin across the neck
        legL: { target: [186, 92], side: 1, len1: 30, len2: 26 }, // locks over the first ankle
      });
      return (
        <>
          <Ground />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legR', 'legL', 'armL']} />
          </Anim>
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <PoseLimb pose={attacker} limb="legL" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armL" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[204, 70]} glyph={glyph} />}
        </>
      );
    }
    case 'bow-arrow': {
      // Attacker reclined behind, one hand deep in the collar, the other on
      // the leg — defender arched like a drawn bow.
      const defender = buildPose({
        hip: [176, 118],
        torsoAngle: -110,
        torsoLen: 46,
        shoulderW: 30,
        hipW: 26,
        armL: { angle: 20, bend: 25 },
        armR: { target: [166, 56], side: 1 },
        legL: { target: [236, 128], side: -1 }, // lifted leg, held by the attacker
        legR: { angle: 15, bend: 55 },
      });
      const attacker = buildPose({
        hip: [120, 122],
        torsoAngle: 172,
        torsoLen: 44,
        armR: { target: [164, 60], side: 1 }, // collar grip at the neck
        armL: { target: [214, 118], side: -1, len1: 28, len2: 26 }, // holds the leg
        legR: { target: [188, 88], side: -1, len1: 28, len2: 26 }, // leg over the torso
        legL: { angle: 60, bend: 40, len1: 26, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['armR', 'armL', 'legR']} />
          </Anim>
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armL" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[162, 58]} glyph={glyph} />}
        </>
      );
    }
    case 'triangle': {
      // Guard player on their back, legs locked around the kneeling
      // opponent's neck; one opponent arm trapped inside.
      const guard = buildPose({
        hip: [148, 118],
        torsoAngle: 186,
        armL: { target: [172, 84], side: -1 }, // pulling the head down
        armR: { angle: 130, bend: 15 },
        legR: { target: [188, 94], side: -1, len1: 31, len2: 29 }, // shin across the back of the neck
        legL: { target: [176, 76], side: 1, len1: 31, len2: 29 }, // locks over the ankle
      });
      const defender = buildPose({
        hip: [222, 122],
        torsoAngle: -130,
        torsoLen: 42,
        shoulderW: 30,
        hipW: 25,
        armL: { target: [128, 122], side: 1 }, // trapped arm inside
        armR: { target: [246, 154], side: -1 }, // posting
        legL: { angle: 110, bend: -60, len1: 24, len2: 22 },
        legR: { angle: 80, bend: -70, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legR', 'legL', 'armL']} />
          </Anim>
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <PoseLimb pose={guard} limb="legL" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="armL" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[184, 90]} glyph={glyph} />}
        </>
      );
    }
    case 'armbar': {
      // Attacker on their back perpendicular, legs over the chest and face,
      // the trapped arm stretched over their hips.
      const defender = buildPose({
        hip: [95, 142],
        torsoAngle: 0,
        armR: { target: [172, 104], side: -1 }, // the trapped, extended arm
        armL: { angle: 150, bend: 20 },
        legL: { angle: 172, bend: -6 },
        legR: { angle: 184, bend: 6 },
      });
      const attacker = buildPose({
        hip: [176, 106],
        torsoAngle: -28,
        torsoLen: 44,
        armR: { target: [168, 106], side: -1, len1: 22, len2: 20 }, // clutching the wrist
        armL: { target: [160, 96], side: 1, len1: 22, len2: 20 },
        legL: { target: [122, 148], side: 1, len1: 27, len2: 24 }, // over the chest
        legR: { target: [140, 122], side: 1, len1: 27, len2: 24 }, // over the face
      });
      return (
        <>
          <Ground />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legL', 'legR', 'armR', 'armL']} />
          </Anim>
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <PoseLimb pose={attacker} limb="legL" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armL" fill={A} stroke={AS} />
            <PoseLimb pose={attacker} limb="armR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[158, 116]} glyph={glyph} />}
        </>
      );
    }
    case 'kimura': {
      // Top player wrenching a bent arm behind the bottom player's back —
      // the figure-four grip on the wrist.
      const defender = buildPose({
        hip: [104, 144],
        torsoAngle: 0,
        armR: { target: [188, 118], side: -1 }, // the attacked arm, bent up and back
        armL: { angle: 160, bend: 15 },
        legL: { angle: 172, bend: -8 },
        legR: { angle: 186, bend: 8 },
      });
      const attacker = buildPose({
        hip: [130, 92],
        torsoAngle: 14,
        torsoLen: 42,
        armR: { target: [186, 116], side: -1, len1: 23, len2: 20 }, // pinning the wrist
        armL: { target: [170, 128], side: 1, len1: 25, len2: 22 }, // threaded under the arm
        legL: { angle: 110, bend: 10, len1: 27, len2: 24 },
        legR: { angle: 140, bend: -25, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[186, 116]} glyph={glyph} />}
        </>
      );
    }
    case 'americana': {
      // The bent arm painted up the mat above the head, wrist pinned.
      const defender = buildPose({
        hip: [116, 144],
        torsoAngle: 0,
        armR: { target: [216, 128], side: 1 }, // arm bent above the head, wrist to mat
        armL: { angle: 160, bend: 15 },
        legL: { angle: 172, bend: -8 },
        legR: { angle: 186, bend: 8 },
      });
      const attacker = buildPose({
        hip: [138, 94],
        torsoAngle: 16,
        torsoLen: 42,
        armR: { target: [214, 126], side: -1, len1: 25, len2: 22 }, // pinning the wrist
        armL: { target: [192, 132], side: 1, len1: 25, len2: 22 }, // lifting under the elbow
        legL: { angle: 112, bend: 10, len1: 27, len2: 24 },
        legR: { angle: 142, bend: -25, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[204, 130]} glyph={glyph} />}
        </>
      );
    }
    case 'guillotine': {
      // Head trapped under the armpit, forearm barred under the throat.
      const defender = buildPose({
        hip: [92, 118],
        torsoAngle: -25,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { target: [150, 132], side: -1 },
        armR: { angle: 80, bend: 20 },
        legL: { angle: 100, bend: -10 },
        legR: { angle: 78, bend: 12 },
      });
      const attacker = buildPose({
        hip: [174, 112],
        torsoAngle: -98,
        torsoLen: 44,
        shoulderW: 30,
        hipW: 26,
        armR: { target: [146, 104], side: 1 }, // forearm under the chin
        armL: { target: [154, 96], side: -1 }, // clasping hand
        legL: { angle: 102, bend: -12 },
        legR: { angle: 74, bend: 16 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[148, 100]} glyph={glyph} />}
        </>
      );
    }
    case 'darce': {
      // Opponent sprawled low; the choking arm threads under the near armpit
      // and around the neck to lock a figure-four.
      const defender = buildPose({
        hip: [200, 132],
        torsoAngle: 188,
        torsoLen: 44,
        armL: { angle: 120, bend: -30, len1: 20, len2: 18 },
        armR: { angle: 95, bend: -20, len1: 20, len2: 18 },
        legL: { angle: 30, bend: 60, len1: 26, len2: 22 },
        legR: { angle: 12, bend: 75, len1: 26, len2: 22 },
      });
      const attacker = buildPose({
        hip: [92, 114],
        torsoAngle: -30,
        torsoLen: 42,
        armR: { target: [148, 148], side: -1, len1: 26, len2: 24 }, // threaded under neck/armpit
        armL: { target: [136, 124], side: 1, len1: 24, len2: 22 }, // locks the figure-four
        legL: { angle: 120, bend: -60, len1: 24, len2: 22 },
        legR: { angle: 95, bend: -70, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[150, 144]} glyph={glyph} />}
        </>
      );
    }
    case 'ezekiel': {
      // Mounted, both forearms scissored across the throat.
      const defender = buildPose({
        hip: [130, 148],
        torsoAngle: 180,
        armL: { angle: 65, bend: 25 },
        armR: { angle: 100, bend: -15 },
        legL: { angle: 3, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const attacker = buildPose({
        hip: [124, 122],
        torsoAngle: -95,
        torsoLen: 42,
        shoulderW: 32,
        hipW: 27,
        armL: { target: [80, 142], side: -1, len1: 25, len2: 23 },
        armR: { target: [64, 136], side: 1, len1: 25, len2: 23 },
        legL: { angle: 145, bend: -25, len1: 26, len2: 22 },
        legR: { angle: 55, bend: 30, len1: 26, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[72, 140]} glyph={glyph} />}
        </>
      );
    }
    case 'omoplata': {
      // Guard player sat up, leg over the trapped shoulder; opponent folded
      // face-down with the arm wound behind them.
      const guard = buildPose({
        hip: [116, 126],
        torsoAngle: -70,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armR: { target: [176, 116], side: -1 }, // controlling the far hip
        armL: { angle: 220, bend: -20 },
        legR: { target: [184, 122], side: -1, len1: 30, len2: 28 }, // leg over the shoulder
        legL: { angle: 40, bend: 45, len1: 28, len2: 24 },
      });
      const defender = buildPose({
        hip: [222, 118],
        torsoAngle: 155,
        torsoLen: 42,
        armR: { target: [160, 132], side: 1 }, // the trapped arm, wound back
        armL: { target: [180, 156], side: -1 },
        legL: { angle: 60, bend: 40, len1: 24, len2: 22 },
        legR: { angle: 40, bend: 55, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legR']} />
            <PoseLimb pose={guard} limb="legR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[184, 124]} glyph={glyph} />}
        </>
      );
    }
    case 'heel-hook': {
      // Legs entangled, opponent's foot clutched to the chest.
      const defender = buildPose({
        hip: [206, 122],
        torsoAngle: -60,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { angle: 200, bend: -20 },
        armR: { target: [236, 148], side: -1 }, // posting
        legR: { target: [118, 116], side: -1 }, // the attacked leg
        legL: { angle: 100, bend: 45, len1: 26, len2: 24 },
      });
      const attacker = buildPose({
        hip: [98, 134],
        torsoAngle: 172,
        torsoLen: 44,
        armR: { target: [116, 112], side: 1, len1: 22, len2: 20 }, // clutching the heel
        armL: { target: [108, 122], side: -1, len1: 22, len2: 20 },
        legR: { target: [172, 108], side: -1, len1: 28, len2: 26 }, // leg over their thigh
        legL: { target: [166, 138], side: 1, len1: 28, len2: 26 }, // leg under, triangled
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legR']} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[144, 122]} glyph={glyph} />}
        </>
      );
    }
    case 'ankle-lock': {
      // Both on their backs; the foot trapped in the armpit, hips arching.
      const defender = buildPose({
        hip: [206, 138],
        torsoAngle: -8,
        armL: { angle: 200, bend: -20 },
        armR: { angle: 250, bend: -15 },
        legL: { target: [110, 116], side: -1 }, // trapped leg
        legR: { angle: 150, bend: 50, len1: 28, len2: 24 },
      });
      const attacker = buildPose({
        hip: [88, 128],
        torsoAngle: 168,
        torsoLen: 44,
        armR: { target: [108, 112], side: 1, len1: 22, len2: 20 }, // foot in the armpit
        armL: { target: [100, 120], side: -1, len1: 22, len2: 20 },
        legR: { target: [172, 128], side: -1, len1: 28, len2: 26 }, // foot on the hip
        legL: { angle: 40, bend: 30, len1: 28, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[110, 114]} glyph={glyph} />}
        </>
      );
    }
    case 'kneebar': {
      // Hip-to-hip, the straightened leg clutched to the chest like an armbar.
      const defender = buildPose({
        hip: [196, 138],
        torsoAngle: 5,
        armL: { angle: 130, bend: 20 },
        armR: { angle: 160, bend: 15 },
        legL: { target: [112, 108], side: -1 }, // the attacked, straight leg
        legR: { angle: 150, bend: 55, len1: 28, len2: 24 },
      });
      const attacker = buildPose({
        hip: [102, 126],
        torsoAngle: 192,
        torsoLen: 44,
        armR: { target: [122, 106], side: 1, len1: 22, len2: 20 }, // hugging the ankle
        armL: { target: [112, 114], side: -1, len1: 22, len2: 20 },
        legR: { target: [168, 134], side: -1, len1: 28, len2: 26 }, // scissored over the hip
        legL: { target: [156, 152], side: 1, len1: 28, len2: 26 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legR']} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[148, 122]} glyph={glyph} />}
        </>
      );
    }
    case 'arm-triangle': {
      // Chest down beside the head, arm circling the neck with the opponent's
      // own shoulder squeezed against it.
      const defender = buildPose({
        hip: [110, 144],
        torsoAngle: 0,
        armR: { target: [186, 120], side: -1 }, // their own arm, pressed across the neck
        armL: { angle: 160, bend: 15 },
        legL: { angle: 172, bend: -8 },
        legR: { angle: 186, bend: 8 },
      });
      const attacker = buildPose({
        hip: [120, 92],
        torsoAngle: 22,
        torsoLen: 44,
        headR: 11.5,
        armR: { target: [188, 148], side: -1, len1: 26, len2: 24 }, // wrapped under the neck
        armL: { target: [148, 132], side: 1, len1: 24, len2: 22 },
        legL: { angle: 115, bend: 10, len1: 27, len2: 24 },
        legR: { angle: 145, bend: -25, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[178, 136]} glyph={glyph} />}
        </>
      );
    }
    case 'collar-choke': {
      // From guard: both hands crossed deep in the collars.
      const top = buildPose({
        hip: [216, 124],
        torsoAngle: -105,
        torsoLen: 40,
        shoulderW: 30,
        hipW: 25,
        armL: { target: [160, 118], side: 1 },
        armR: { angle: 300, bend: 30 },
        legL: { angle: 130, bend: -20 },
        legR: { angle: 70, bend: 25 },
      });
      const guard = buildPose({
        hip: [112, 138],
        torsoAngle: 180,
        armL: { target: [196, 84], side: -1, len1: 27, len2: 25 }, // crossed collar grips
        armR: { target: [204, 94], side: -1, len1: 27, len2: 25 },
        legL: { target: [222, 100], side: -1, len1: 32, len2: 30 },
        legR: { target: [226, 132], side: 1, len1: 32, len2: 30 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['armL', 'armR']} />
            <PoseLimb pose={guard} limb="armR" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="armL" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[200, 88]} glyph={glyph} />}
        </>
      );
    }
    case 'ns-choke': {
      // North-south, arm wrapped around the neck from above, shoulder driving.
      const defender = buildPose({
        hip: [150, 142],
        torsoAngle: 180,
        armL: { angle: 70, bend: 15 },
        armR: { angle: 250, bend: -10 },
        legL: { angle: 6, bend: 8 },
        legR: { angle: -6, bend: 10 },
      });
      const attacker = buildPose({
        hip: [46, 104],
        torsoAngle: 10,
        torsoLen: 44,
        armR: { target: [66, 140], side: -1 }, // wrapped under the neck
        armL: { target: [104, 130], side: 1 },
        legL: { angle: 160, bend: -15, len1: 26, len2: 24 },
        legR: { angle: 185, bend: 15, len1: 26, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['armR']} />
            <PoseLimb pose={attacker} limb="armR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[70, 140]} glyph={glyph} />}
        </>
      );
    }
    case 'peruvian': {
      // Opponent turtled; arms locked around the neck, leg thrown over the
      // back, sitting through to load the choke.
      const defender = buildPose({
        hip: [176, 126],
        torsoAngle: -160,
        torsoLen: 36,
        armL: { angle: 100, bend: 20, len1: 20, len2: 18 },
        armR: { angle: 120, bend: -10, len1: 20, len2: 18 },
        legL: { angle: 120, bend: -95, len1: 20, len2: 16 },
        legR: { angle: 105, bend: -95, len1: 20, len2: 16 },
      });
      const attacker = buildPose({
        hip: [92, 136],
        torsoAngle: -75,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armR: { target: [136, 110], side: -1 }, // locked around the neck
        armL: { target: [128, 100], side: 1 },
        legR: { target: [172, 96], side: -1, len1: 28, len2: 26 }, // leg over the back
        legL: { angle: 80, bend: 30, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legR']} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
          </Anim>
          {highlight && <HighlightRing at={[134, 106]} glyph={glyph} />}
        </>
      );
    }

    /* -------------------------------- sweeps ------------------------------- */
    case 'scissor-sweep': {
      // Legs scissoring — one across the chest, one chopping the knee — as
      // the kneeling opponent tips sideways.
      const guard = buildPose({
        hip: [112, 128],
        torsoAngle: 192,
        armL: { target: [176, 96], side: -1, len1: 26, len2: 24 }, // sleeve pull
        armR: { angle: 120, bend: 20 },
        legR: { target: [196, 104], side: -1, len1: 31, len2: 29 }, // across the chest
        legL: { target: [206, 146], side: 1, len1: 31, len2: 29 }, // chopping the knee
      });
      const defender = buildPose({
        hip: [212, 112],
        torsoAngle: -62,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { angle: -40, bend: -20 },
        armR: { angle: -10, bend: 15 },
        legL: { angle: 105, bend: -55, len1: 24, len2: 22 },
        legR: { angle: 80, bend: -60, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legR', 'armL']} />
            <PoseLimb pose={guard} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="armL" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'hip-bump': {
      // Sitting up hard into the opponent, arm over the shoulder, tipping
      // them backwards.
      const guard = buildPose({
        hip: [124, 132],
        torsoAngle: -52,
        torsoLen: 44,
        shoulderW: 28,
        hipW: 24,
        armR: { target: [206, 76], side: -1 }, // arm over the shoulder
        armL: { target: [76, 152], side: 1 }, // posting behind
        legR: { target: [198, 138], side: -1, len1: 30, len2: 26 },
        legL: { angle: 55, bend: 45, len1: 28, len2: 24 },
      });
      const defender = buildPose({
        hip: [212, 116],
        torsoAngle: -55,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { angle: -60, bend: -15 },
        armR: { angle: -20, bend: 15 },
        legL: { angle: 110, bend: -60, len1: 24, len2: 22 },
        legR: { angle: 85, bend: -65, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['armR']} />
            <PoseLimb pose={guard} limb="armR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'butterfly-sweep': {
      // Butterfly hook elevating the opponent as they're pulled over the top.
      const guard = buildPose({
        hip: [122, 134],
        torsoAngle: -122,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armR: { target: [162, 90], side: -1 }, // underhook
        armL: { target: [66, 150], side: 1 }, // posting
        legR: { target: [182, 106], side: -1, len1: 28, len2: 24 }, // hook lifting the thigh
        legL: { angle: 45, bend: 55, len1: 28, len2: 24 },
      });
      const defender = buildPose({
        hip: [192, 96],
        torsoAngle: -42,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { angle: 240, bend: -25 },
        armR: { angle: -60, bend: -10 },
        legL: { angle: 110, bend: -45, len1: 26, len2: 24 },
        legR: { angle: 85, bend: -30, len1: 26, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legR', 'armR']} />
            <PoseLimb pose={guard} limb="legR" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="armR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'x-guard': {
      // Fully underneath the standing opponent, legs making the X on one leg.
      const defender = buildPose({
        hip: [192, 96],
        torsoAngle: -85,
        shoulderW: 30,
        hipW: 26,
        armL: { angle: 220, bend: -20 },
        armR: { angle: -40, bend: -15 },
        legL: { target: [156, 152], side: -1 }, // the attacked leg, forward
        legR: { angle: 82, bend: 8 },
      });
      const guard = buildPose({
        hip: [142, 140],
        torsoAngle: 186,
        armL: { target: [158, 144], side: -1, len1: 24, len2: 22 }, // holding the ankle
        armR: { angle: 140, bend: 15 },
        legR: { target: [182, 116], side: -1, len1: 28, len2: 26 }, // hook behind the knee
        legL: { target: [168, 136], side: 1, len1: 28, len2: 26 }, // hook at the ankle — the X
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legR', 'legL']} />
            <PoseLimb pose={guard} limb="legL" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="legR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'berimbolo-inv': {
      // Inverted underneath — hips high, head to the mat — spinning to the
      // back of the standing opponent.
      const defender = buildPose({
        hip: [204, 98],
        torsoAngle: -85,
        shoulderW: 30,
        hipW: 26,
        armL: { angle: 220, bend: -20 },
        armR: { angle: -40, bend: -15 },
        legL: { angle: 98, bend: -8 },
        legR: { angle: 78, bend: 10 },
      });
      const guard = buildPose({
        hip: [124, 86],
        torsoAngle: 112, // inverted: hips above, head rolling under
        torsoLen: 44,
        armL: { target: [98, 152], side: 1, len1: 24, len2: 22 }, // posting on the mat
        armR: { target: [150, 140], side: -1, len1: 24, len2: 22 },
        legR: { target: [188, 108], side: -1, len1: 30, len2: 28 }, // wrapping the legs
        legL: { target: [200, 130], side: -1, len1: 30, len2: 28 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="press" origin={guard.hip}>
            <Figure pose={guard} fill={A} stroke={AS} hide={['legR', 'legL']} />
            <PoseLimb pose={guard} limb="legL" fill={A} stroke={AS} />
            <PoseLimb pose={guard} limb="legR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }

    /* ------------------------------- escapes ------------------------------- */
    case 'upa': {
      // Bridging high off the shoulders, tipping the mounted player forward.
      const escaper = buildPose({
        hip: [140, 112], // hips punched up off the mat
        torsoAngle: 160,
        torsoLen: 46,
        armL: { target: [176, 70], side: -1 }, // trapping the arm
        armR: { target: [96, 128], side: 1 },
        legL: { angle: 55, bend: 65, len1: 28, len2: 26 }, // feet planted under the bridge
        legR: { angle: 35, bend: 85, len1: 28, len2: 26 },
      });
      const top = buildPose({
        hip: [152, 88],
        torsoAngle: -128, // pitched forward over the head
        torsoLen: 42,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [84, 148], side: 1 }, // posting out to catch the fall
        armR: { target: [106, 140], side: -1 },
        legL: { angle: 120, bend: -40, len1: 24, len2: 22 },
        legR: { angle: 50, bend: 40, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={top.hip}>
            <Figure pose={top} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="press" origin={escaper.hip}>
            <Figure pose={escaper} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'shrimp-escape': {
      // On the side, framing and shooting the knee inside to rebuild guard.
      const escaper = buildPose({
        hip: [124, 138],
        torsoAngle: 172,
        torsoLen: 44,
        armL: { target: [188, 108], side: -1, len1: 24, len2: 22 }, // frame on the hip
        armR: { target: [180, 122], side: 1, len1: 24, len2: 22 },
        legR: { target: [184, 128], side: -1, len1: 26, len2: 24 }, // knee wedging in
        legL: { angle: 40, bend: 60, len1: 28, len2: 26 },
      });
      const top = buildPose({
        hip: [206, 114],
        torsoAngle: -110,
        torsoLen: 42,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [158, 148], side: 1 },
        armR: { angle: -80, bend: 20 },
        legL: { angle: 115, bend: -55, len1: 24, len2: 22 },
        legR: { angle: 75, bend: -60, len1: 24, len2: 22 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={escaper.hip}>
            <Figure pose={escaper} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'frames': {
      // Both forearms framed into the top player, making space to move.
      const escaper = buildPose({
        hip: [110, 144],
        torsoAngle: 180,
        armL: { target: [156, 106], side: -1, len1: 24, len2: 22 }, // frame at the shoulder
        armR: { target: [138, 114], side: 1, len1: 24, len2: 22 }, // frame at the hip
        legL: { angle: 8, bend: 45 },
        legR: { angle: -4, bend: 60 },
      });
      const top = buildPose({
        hip: [166, 94],
        torsoAngle: 10,
        torsoLen: 40,
        armL: { target: [96, 138], side: 1, len1: 25, len2: 22 },
        armR: { target: [130, 140], side: -1, len1: 25, len2: 22 },
        legL: { angle: 105, bend: 10, len1: 27, len2: 24 },
        legR: { angle: 135, bend: -20, len1: 27, len2: 24 },
      });
      return (
        <>
          <Ground />
          <Figure pose={top} fill={D} stroke={DS} />
          <Anim kind="press" origin={escaper.hip}>
            <Figure pose={escaper} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }

    /* ------------------------------ takedowns ------------------------------ */
    case 'double-leg': {
      // Deep penetration step, head outside, both arms wrapping the legs.
      const defender = buildPose({
        hip: [212, 104],
        torsoAngle: -68, // tipping backwards
        shoulderW: 30,
        hipW: 26,
        armL: { angle: -95, bend: -20 },
        armR: { angle: -50, bend: -15 },
        legL: { angle: 100, bend: -12 },
        legR: { angle: 118, bend: -18 },
      });
      const attacker = buildPose({
        hip: [118, 122],
        torsoAngle: -22,
        torsoLen: 44,
        armR: { target: [210, 138], side: -1, len1: 27, len2: 25 }, // wrapping the far leg
        armL: { target: [196, 128], side: 1, len1: 26, len2: 24 }, // wrapping the near leg
        legR: { target: [140, 156], side: -1, len1: 26, len2: 24 }, // lunging knee down
        legL: { target: [60, 152], side: 1, len1: 28, len2: 26 }, // drive leg extended
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="rock" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['armR']} />
            <PoseLimb pose={attacker} limb="armR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'single-leg': {
      // One leg captured and lifted to the chest, opponent hopping.
      const defender = buildPose({
        hip: [200, 106],
        torsoAngle: -100,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [156, 78], side: 1 }, // hand fighting on the attacker
        armR: { angle: -50, bend: -20 },
        legL: { target: [148, 92], side: -1 }, // the captured leg, held high
        legR: { angle: 85, bend: 8 }, // hopping post leg
      });
      const attacker = buildPose({
        hip: [116, 114],
        torsoAngle: -78,
        torsoLen: 44,
        shoulderW: 28,
        hipW: 24,
        armR: { target: [150, 90], side: -1, len1: 24, len2: 22 }, // clutching the ankle
        armL: { target: [142, 100], side: 1, len1: 24, len2: 22 },
        legL: { angle: 104, bend: -12 },
        legR: { angle: 72, bend: 18 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="rock" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'reap': {
      // Clinched; the reaping leg sweeps the support leg out backwards.
      const defender = buildPose({
        hip: [190, 100],
        torsoAngle: -62, // off-balanced to the rear corner
        shoulderW: 30,
        hipW: 26,
        armL: { angle: -110, bend: -15 },
        armR: { angle: -50, bend: -20 },
        legL: { target: [204, 138], side: 1 }, // the reaped leg, lifting
        legR: { angle: 105, bend: -15 },
      });
      const attacker = buildPose({
        hip: [128, 106],
        torsoAngle: -95,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [172, 72], side: -1 }, // collar/lapel grip
        armR: { target: [180, 92], side: -1 }, // sleeve pull
        legR: { target: [216, 126], side: -1, len1: 30, len2: 28 }, // the reaping leg, hooked behind
        legL: { angle: 92, bend: 5 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="rock" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legR']} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'foot-sweep': {
      // The stepping foot swept mid-air, timed to the weightless moment.
      const defender = buildPose({
        hip: [196, 104],
        torsoAngle: -78,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [152, 84], side: 1 },
        armR: { angle: -45, bend: -15 },
        legL: { target: [156, 146], side: -1 }, // mid-step foot being swept
        legR: { angle: 92, bend: 5 },
      });
      const attacker = buildPose({
        hip: [116, 108],
        torsoAngle: -95,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [162, 76], side: -1 }, // collar tie
        armR: { target: [170, 96], side: -1 },
        legR: { target: [162, 152], side: -1, len1: 30, len2: 28 }, // sweeping foot
        legL: { angle: 96, bend: 5 },
      });
      return (
        <>
          <Ground />
          <Anim kind="arc" origin={defender.hip}>
            <Figure pose={defender} fill={D} stroke={DS} />
          </Anim>
          <Anim kind="rock" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legR']} />
            <PoseLimb pose={attacker} limb="legR" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'arm-drag': {
      // The arm yanked across the body, attacker angling off to the back.
      const defender = buildPose({
        hip: [196, 106],
        torsoAngle: -82,
        shoulderW: 30,
        hipW: 26,
        armR: { target: [138, 92], side: -1 }, // the dragged arm, pulled across
        armL: { angle: -70, bend: -15 },
        legL: { angle: 100, bend: -10 },
        legR: { angle: 80, bend: 10 },
      });
      const attacker = buildPose({
        hip: [110, 110],
        torsoAngle: -88,
        shoulderW: 28,
        hipW: 24,
        armR: { target: [142, 88], side: -1 }, // gripping at the triceps
        armL: { target: [134, 98], side: 1 }, // wrist grip
        legL: { angle: 108, bend: -12 },
        legR: { angle: 68, bend: 22 }, // stepping off to the angle
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="rock" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }

    /* ----------------------------- guard passes ---------------------------- */
    case 'toreando': {
      // Both shins pinned aside like a matador's cape, stepping around.
      const defender = buildPose({
        hip: [100, 140],
        torsoAngle: 188,
        armL: { angle: 130, bend: 15 },
        armR: { angle: 100, bend: 20 },
        legL: { target: [166, 110], side: -1 }, // raised legs, caught at the shins
        legR: { target: [172, 126], side: -1 },
      });
      const attacker = buildPose({
        hip: [216, 106],
        torsoAngle: -98,
        torsoLen: 44,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [166, 108], side: 1 }, // pinning a shin each
        armR: { target: [174, 124], side: 1 },
        legL: { angle: 108, bend: -15 },
        legR: { angle: 62, bend: 25 }, // stepping around
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="arc" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'knee-cut': {
      // The knee slicing across the bottom player's thigh, chest heavy.
      const defender = buildPose({
        hip: [104, 142],
        torsoAngle: 184,
        armL: { angle: 110, bend: 20 },
        armR: { angle: 80, bend: 15 },
        legL: { target: [156, 118], side: -1 }, // half-guard leg being cut through
        legR: { angle: 10, bend: 50 },
      });
      const attacker = buildPose({
        hip: [176, 108],
        torsoAngle: -148,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { target: [78, 132], side: 1, len1: 26, len2: 24 }, // cross-face reaching
        armR: { target: [138, 146], side: -1, len1: 24, len2: 22 },
        legL: { target: [130, 138], side: -1, len1: 24, len2: 24 }, // the slicing knee
        legR: { target: [230, 150], side: -1, len1: 28, len2: 26 }, // posted wide
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} hide={['legL']} />
            <PoseLimb pose={attacker} limb="legL" fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'stack': {
      // The bottom player folded up, hips driven over their own head.
      const defender = buildPose({
        hip: [118, 108], // hips high, rolled up
        torsoAngle: 208,
        torsoLen: 44,
        armL: { angle: 90, bend: 25, len1: 20, len2: 18 },
        armR: { angle: 120, bend: 15, len1: 20, len2: 18 },
        legL: { target: [70, 106], side: 1, len1: 26, len2: 24 }, // legs folded over the head
        legR: { target: [84, 92], side: 1, len1: 26, len2: 24 },
      });
      const attacker = buildPose({
        hip: [196, 100],
        torsoAngle: -132,
        torsoLen: 42,
        shoulderW: 28,
        hipW: 24,
        armL: { target: [92, 100], side: 1, len1: 26, len2: 24 }, // driving the legs down
        armR: { target: [116, 88], side: 1, len1: 26, len2: 24 },
        legL: { angle: 100, bend: -18 },
        legR: { angle: 62, bend: 25 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
        </>
      );
    }
    case 'leg-drag': {
      // One leg dragged across the attacker's hip and pinned.
      const defender = buildPose({
        hip: [104, 142],
        torsoAngle: 184,
        armL: { angle: 110, bend: 20 },
        armR: { angle: 80, bend: 15 },
        legR: { target: [186, 120], side: -1 }, // the dragged leg, across the hip
        legL: { angle: 25, bend: 40 },
      });
      const attacker = buildPose({
        hip: [196, 110],
        torsoAngle: -95,
        torsoLen: 42,
        shoulderW: 30,
        hipW: 26,
        armL: { target: [178, 114], side: 1, len1: 24, len2: 22 }, // pinning the dragged leg
        armR: { target: [168, 126], side: 1, len1: 24, len2: 22 },
        legL: { angle: 112, bend: -35, len1: 24, len2: 24 },
        legR: { angle: 66, bend: 25 },
      });
      return (
        <>
          <Ground />
          <Figure pose={defender} fill={D} stroke={DS} />
          <Anim kind="press" origin={attacker.hip}>
            <Figure pose={attacker} fill={A} stroke={AS} />
          </Anim>
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
        @keyframes bjj-pulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes bjj-arc { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(6px,-4px) rotate(4deg); } }
        @keyframes bjj-rock { 0%,100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(4px) rotate(-2deg); } }
        .bjj-press { animation: bjj-press 2.6s ease-in-out infinite; }
        .bjj-pulse { animation: bjj-pulse 1.7s ease-in-out infinite; }
        .bjj-arc { animation: bjj-arc 2.6s ease-in-out infinite; }
        .bjj-rock { animation: bjj-rock 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .bjj-press, .bjj-pulse, .bjj-arc, .bjj-rock { animation: none; }
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
  'fifty-fifty': '50/50 guard',
  standing: 'Standing',
  rnc: 'Rear naked choke',
  'rear-triangle': 'Rear triangle',
  'bow-arrow': 'Bow and arrow choke',
  triangle: 'Triangle choke',
  armbar: 'Armbar',
  kimura: 'Kimura',
  americana: 'Americana',
  guillotine: 'Guillotine',
  darce: 'Darce / Anaconda',
  ezekiel: 'Ezekiel choke',
  omoplata: 'Omoplata',
  'heel-hook': 'Heel hook',
  'ankle-lock': 'Straight ankle lock',
  kneebar: 'Kneebar',
  'arm-triangle': 'Arm triangle',
  'collar-choke': 'Cross collar choke',
  'ns-choke': 'North-south choke',
  peruvian: 'Peruvian necktie',
  'scissor-sweep': 'Scissor sweep',
  'hip-bump': 'Hip bump sweep',
  'butterfly-sweep': 'Butterfly sweep',
  'x-guard': 'X-guard sweep',
  'berimbolo-inv': 'Berimbolo',
  upa: 'Upa / bridge escape',
  'shrimp-escape': 'Shrimp escape',
  frames: 'Framing escape',
  'double-leg': 'Double leg',
  'single-leg': 'Single leg',
  reap: 'Osoto gari / reap',
  'foot-sweep': 'Foot sweep',
  'arm-drag': 'Arm drag',
  toreando: 'Toreando pass',
  'knee-cut': 'Knee cut pass',
  stack: 'Stack pass',
  'leg-drag': 'Leg drag pass',
};
