'use client';

import { useEffect, useRef } from 'react';
import { LAND } from '@/data/earthLand';

export type OrbState = 'idle' | 'listening' | 'speaking';

// Precompute the continent points (lon,lat → radians) once, so each frame just
// rotates and projects them onto the sphere to draw the Earth's landmasses.
const D2R = Math.PI / 180;
const LAND_COUNT = LAND.length / 2;
const LAND_LON = new Float32Array(LAND_COUNT);
const LAND_LAT = new Float32Array(LAND_COUNT);
for (let i = 0, j = 0; i < LAND.length; i += 2, j++) {
  LAND_LON[j] = LAND[i] * D2R;
  LAND_LAT[j] = LAND[i + 1] * D2R;
}

// Land colour (idle blue-green vs. speaking gold), lerped like the rest of the orb.
const LAND_BLUE = [86, 214, 158];
const LAND_GOLD = [242, 204, 120];

const BLUE_CORE = [3, 16, 40];
const BLUE_ACCENT = [56, 189, 248];
const GOLD_CORE = [44, 30, 4];
const GOLD_ACCENT = [251, 191, 36];
const BLUE_LIT = [125, 205, 255];
const GOLD_LIT = [255, 224, 150];
const BLUE_DARK = [1, 5, 14];
const GOLD_DARK = [12, 8, 1];

// Latitudes (deg) that get a wireframe ring drawn.
const LAT_LINES = [-60, -40, -20, 0, 20, 40, 60].map((d) => (d * Math.PI) / 180);
// Base longitudes (deg) for the rotating meridians.
const MERIDIANS = [0, 30, 60, 90, 120, 150].map((d) => (d * Math.PI) / 180);
// Axial tilt so latitude rings read as ellipses and the globe feels 3D.
const TILT = 0.42;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: number[], c2: number[], t: number): string {
  return `rgb(${Math.round(lerp(c1[0], c2[0], t))}, ${Math.round(lerp(c1[1], c2[1], t))}, ${Math.round(lerp(c1[2], c2[2], t))})`;
}

export function Orb({
  state,
  amplitude,
  size = 280,
}: {
  state: OrbState;
  amplitude: number;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorMixRef = useRef(0);
  const ampSmoothRef = useRef(0);
  const rotRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const ampRef = useRef(amplitude);

  stateRef.current = state;
  ampRef.current = amplitude;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const ct = Math.cos(TILT);
    const st = Math.sin(TILT);

    // Project a (lat, lon) on the unit sphere to screen space + depth.
    // Rotation happens about the polar axis; the whole sphere is tilted about x.
    const project = (lat: number, lon: number) => {
      const cl = Math.cos(lat);
      const x0 = cl * Math.sin(lon);
      const y0 = Math.sin(lat);
      const z0 = cl * Math.cos(lon);
      const y1 = y0 * ct - z0 * st;
      const z1 = y0 * st + z0 * ct;
      return { x: x0, y: -y1, z: z1 }; // canvas y points down
    };

    // The display family (next/font exposes its generated name here).
    const displayFont =
      getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || '"Exo 2"';

    let last = performance.now();

    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;

      const targetMix = stateRef.current === 'speaking' ? 1 : 0;
      colorMixRef.current = lerp(colorMixRef.current, targetMix, 1 - Math.pow(0.0015, dt));

      const idleBreath = 0.08 + 0.05 * Math.sin((t / 1000) * 1.1);
      const targetAmp = stateRef.current === 'idle' ? idleBreath : ampRef.current;
      ampSmoothRef.current = lerp(ampSmoothRef.current, targetAmp, 1 - Math.pow(0.0008, dt));

      const mix = colorMixRef.current;
      const amp = ampSmoothRef.current;
      // Steady, planetary rotation — a little faster while active.
      rotRef.current += dt * (0.24 + amp * 0.55);
      const rot = rotRef.current;

      const core = lerpColor(BLUE_CORE, GOLD_CORE, mix);
      const lit = lerpColor(BLUE_LIT, GOLD_LIT, mix);
      const dark = lerpColor(BLUE_DARK, GOLD_DARK, mix);
      const accent = lerpColor(BLUE_ACCENT, GOLD_ACCENT, mix);
      const ar = Math.round(lerp(BLUE_ACCENT[0], GOLD_ACCENT[0], mix));
      const ag = Math.round(lerp(BLUE_ACCENT[1], GOLD_ACCENT[1], mix));
      const ab = Math.round(lerp(BLUE_ACCENT[2], GOLD_ACCENT[2], mix));
      const rgba = (a: number) => `rgba(${ar}, ${ag}, ${ab}, ${a})`;

      const R = size / 2;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(R, R);

      // Outer decorative rings.
      for (let i = 0; i < 3; i++) {
        const ringR = R * (0.8 + i * 0.07) * (1 + amp * 0.05);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = (0.14 - i * 0.035) * (0.5 + amp);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Counter-rotating radar sweep — a soft trailing wedge of light.
      if (typeof ctx.createConicGradient === 'function') {
        const sweep = ctx.createConicGradient(-(t / 1000) * 0.9, 0, 0);
        sweep.addColorStop(0, rgba(0.16));
        sweep.addColorStop(0.08, rgba(0));
        sweep.addColorStop(1, rgba(0));
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = sweep;
        ctx.globalAlpha = 0.5 + amp * 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- The 3D globe ---
      const geoR = R * 0.72 * (1 + amp * 0.05);
      const lightX = -geoR * 0.4;
      const lightY = -geoR * 0.4;

      // Outer atmospheric bloom.
      const bloom = ctx.createRadialGradient(0, 0, geoR * 0.2, 0, 0, geoR * 1.35);
      bloom.addColorStop(0, rgba(0.3 + amp * 0.25));
      bloom.addColorStop(0.55, rgba(0.08));
      bloom.addColorStop(1, rgba(0));
      ctx.beginPath();
      ctx.arc(0, 0, geoR * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = bloom;
      ctx.fill();

      // Shaded sphere body — lit from the upper-left, dark terminator lower-right.
      const body = ctx.createRadialGradient(lightX, lightY, geoR * 0.08, lightX, lightY, geoR * 1.95);
      body.addColorStop(0, lit);
      body.addColorStop(0.4, core);
      body.addColorStop(1, dark);
      ctx.beginPath();
      ctx.arc(0, 0, geoR, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // Draw the surface (wireframe + points), clipped to the sphere and
      // showing only the front-facing hemisphere.
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, geoR, 0, Math.PI * 2);
      ctx.clip();

      // Latitude rings (static — invariant under polar rotation).
      ctx.lineWidth = 0.8;
      for (const lat of LAT_LINES) {
        let started = false;
        ctx.beginPath();
        for (let s = 0; s <= 64; s++) {
          const lon = (s / 64) * Math.PI * 2;
          const p = project(lat, lon);
          if (p.z <= 0.02) {
            started = false;
            continue;
          }
          const sx = p.x * geoR;
          const sy = p.y * geoR;
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.1;
        ctx.stroke();
      }

      // Meridians (rotate with the globe → the visible spin).
      for (const m of MERIDIANS) {
        let started = false;
        ctx.beginPath();
        for (let s = 0; s <= 48; s++) {
          const lat = -Math.PI / 2 + (s / 48) * Math.PI;
          const p = project(lat, m + rot);
          if (p.z <= 0.02) {
            started = false;
            continue;
          }
          const sx = p.x * geoR;
          const sy = p.y * geoR;
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.07;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // The continents: real coastline data, rotated with the globe and lit from
      // the upper-left, drawn only on the front-facing hemisphere.
      const lr = Math.round(lerp(LAND_BLUE[0], LAND_GOLD[0], mix));
      const lg = Math.round(lerp(LAND_BLUE[1], LAND_GOLD[1], mix));
      const lb = Math.round(lerp(LAND_BLUE[2], LAND_GOLD[2], mix));
      const dotR = geoR * 0.011;
      const dotSize = Math.max(1, dotR * 2);
      const cosLon = Math.cos(rot);
      const sinLon = Math.sin(rot);
      ctx.fillStyle = `rgb(${lr}, ${lg}, ${lb})`;
      for (let j = 0; j < LAND_COUNT; j++) {
        const lat = LAND_LAT[j];
        const cl = Math.cos(lat);
        const sl = Math.sin(lat);
        // longitude + rotation, expanded so cos/sin of rot are computed once
        const lo = LAND_LON[j];
        const sinLo = Math.sin(lo) * cosLon + Math.cos(lo) * sinLon;
        const cosLo = Math.cos(lo) * cosLon - Math.sin(lo) * sinLon;
        const x0 = cl * sinLo;
        const z0 = cl * cosLo;
        const y1 = sl * ct - z0 * st;
        const z1 = sl * st + z0 * ct; // depth: >0 front
        if (z1 <= 0.03) continue;
        // diffuse light from upper-left-front; normal = (x0, y1, z1)
        const bright = x0 * -0.45 + y1 * 0.55 + z1 * 0.7;
        ctx.globalAlpha = (0.25 + amp * 0.3) + Math.max(0, bright) * 0.6;
        ctx.fillRect(x0 * geoR - dotR, -y1 * geoR - dotR, dotSize, dotSize);
      }
      ctx.globalAlpha = 1;

      // Specular highlight near the light source for a glossy read.
      const spec = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, geoR * 0.55);
      spec.addColorStop(0, rgba(0.22 + amp * 0.2));
      spec.addColorStop(1, rgba(0));
      ctx.beginPath();
      ctx.arc(lightX, lightY, geoR * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      ctx.restore();

      // Base limb + bright lit crescent on the upper-left edge.
      ctx.beginPath();
      ctx.arc(0, 0, geoR, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.32 + amp * 0.2;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, geoR, Math.PI * 0.95, Math.PI * 1.62);
      ctx.strokeStyle = lit;
      ctx.globalAlpha = 0.55 + amp * 0.35;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // "VALORIS" as a ribbon wrapped around the globe's middle, spinning with
      // it. Each letter's longitude drives a steady horizontal slide; near a
      // limb it foreshortens (squishes) and fades, so it wraps smoothly with
      // no pop-in and no wobble.
      const word = 'VALORIS';
      const n = word.length;
      const spread = 1.85; // angular width of the word band (radians)
      const step = spread / n;
      const fs = size * 0.062;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${fs}px ${displayFont}, "Exo 2", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < n; i++) {
        const lon = (i - (n - 1) / 2) * step + rot;
        const depth = Math.cos(lon); // 1 facing front, 0 at the limb, <0 behind
        if (depth <= 0.03) continue; // on the far side — hidden
        const sx = Math.sin(lon) * geoR * 0.98;
        const fade = Math.min(1, (depth - 0.03) / 0.4); // smooth edge fade
        ctx.save();
        ctx.translate(sx, 0);
        ctx.scale(depth, 1); // horizontal foreshortening toward the limb
        ctx.globalAlpha = 0.98 * fade;
        ctx.shadowBlur = 10 * depth;
        ctx.fillText(word[i], 0, 0);
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />;
}
