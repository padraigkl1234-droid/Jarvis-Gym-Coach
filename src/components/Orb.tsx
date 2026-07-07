'use client';

import { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'listening' | 'speaking';

const BLUE_ACCENT = [56, 189, 248];
const GOLD_ACCENT = [251, 191, 36];
// Warm tint blended into the texture while JARVIS speaks.
const GOLD_TINT = [255, 196, 110];
// Greeny-blue atmosphere halo around the planet.
const ATMO = [80, 220, 200];
// Axial tilt so the globe reads as 3D.
const TILT = 0.41;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Tex {
  data: Uint8ClampedArray;
  w: number;
  h: number;
}

interface Globe {
  off: HTMLCanvasElement;
  offCtx: CanvasRenderingContext2D;
  img: ImageData;
  D: number;
  baseR: number; // CSS-px radius the mapping was built for
  count: number;
  PX: Int32Array; // byte offset into the image buffer
  ROW: Int32Array; // texture row offset (row * texW)
  LON: Float32Array; // base longitude before rotation
  SHADE: Float32Array; // baked diffuse shading
  ALPHA: Uint8ClampedArray; // edge-antialiased coverage
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
  const texRef = useRef<Tex | null>(null);
  const globeRef = useRef<Globe | null>(null);
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

    const R = size / 2;
    const displayFont =
      getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || '"Exo 2"';

    // Build the screen→globe mapping once (independent of rotation).
    const buildGlobe = (tex: Tex) => {
      const ct = Math.cos(TILT);
      const st = Math.sin(TILT);
      // Light from the upper-left-front, in view space.
      let lx = -0.45,
        ly = 0.55,
        lz = 0.72;
      const ll = Math.hypot(lx, ly, lz);
      lx /= ll;
      ly /= ll;
      lz /= ll;

      const baseR = R * 0.72; // CSS-px radius
      const Rg = Math.round(baseR * dpr); // device-px radius
      const D = Rg * 2 + 2;
      const off = document.createElement('canvas');
      off.width = D;
      off.height = D;
      const offCtx = off.getContext('2d')!;
      const img = offCtx.createImageData(D, D);

      const max = D * D;
      const PX = new Int32Array(max);
      const ROW = new Int32Array(max);
      const LON = new Float32Array(max);
      const SHADE = new Float32Array(max);
      const ALPHA = new Uint8ClampedArray(max);
      let k = 0;

      for (let iy = 0; iy < D; iy++) {
        for (let ix = 0; ix < D; ix++) {
          const nx = (ix - Rg) / Rg;
          const ny = (iy - Rg) / Rg;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) continue;
          const d = Math.sqrt(r2);
          const nz = Math.sqrt(1 - r2);
          const vx = nx;
          const vyUp = -ny; // canvas y is down
          const vz = nz;
          // Undo the axial tilt to recover sphere coordinates.
          const y0 = vyUp * ct + vz * st;
          const z0 = -vyUp * st + vz * ct;
          const x0 = vx;
          const lat = Math.asin(Math.max(-1, Math.min(1, y0)));
          const lon = Math.atan2(x0, z0);
          const v = (Math.PI / 2 - lat) / Math.PI;
          const row = Math.min(tex.h - 1, Math.max(0, (v * tex.h) | 0));
          const diff = vx * lx + vyUp * ly + vz * lz;
          PX[k] = (iy * D + ix) * 4;
          ROW[k] = row * tex.w;
          LON[k] = lon;
          SHADE[k] = 0.28 + Math.max(0, diff) * 0.95;
          ALPHA[k] = Math.max(0, Math.min(1, (1 - d) * Rg)) * 255;
          k++;
        }
      }
      globeRef.current = {
        off,
        offCtx,
        img,
        D,
        baseR,
        count: k,
        PX: PX.subarray(0, k),
        ROW: ROW.subarray(0, k),
        LON: LON.subarray(0, k),
        SHADE: SHADE.subarray(0, k),
        ALPHA: ALPHA.subarray(0, k),
      };
    };

    // Load the Earth texture, then build the mapping.
    const texImg = new Image();
    texImg.onload = () => {
      const tc = document.createElement('canvas');
      tc.width = texImg.width;
      tc.height = texImg.height;
      const tctx = tc.getContext('2d');
      if (!tctx) return;
      tctx.drawImage(texImg, 0, 0);
      const id = tctx.getImageData(0, 0, tc.width, tc.height);
      const tex: Tex = { data: id.data, w: tc.width, h: tc.height };
      texRef.current = tex;
      buildGlobe(tex);
    };
    texImg.src = '/earth.jpg';

    const renderGlobe = (mix: number, amp: number, rot: number) => {
      const tex = texRef.current;
      const g = globeRef.current;
      if (!tex || !g) return false;
      const td = tex.data;
      const tw = tex.w;
      const out = g.img.data;
      const { PX, ROW, LON, SHADE, ALPHA, count } = g;
      const tint = mix * 0.5;
      const g0 = GOLD_TINT[0],
        g1 = GOLD_TINT[1],
        g2 = GOLD_TINT[2];
      const INV = 1 / (Math.PI * 2);
      for (let k = 0; k < count; k++) {
        let u = (LON[k] - rot) * INV;
        u -= Math.floor(u);
        const ti = (ROW[k] + ((u * tw) | 0)) * 4;
        let r = td[ti];
        let gg = td[ti + 1];
        let b = td[ti + 2];
        if (tint > 0) {
          r += (g0 - r) * tint;
          gg += (g1 - gg) * tint;
          b += (g2 - b) * tint;
        }
        const sh = SHADE[k];
        const px = PX[k];
        out[px] = r * sh;
        out[px + 1] = gg * sh;
        out[px + 2] = b * sh;
        out[px + 3] = ALPHA[k];
      }
      g.offCtx.putImageData(g.img, 0, 0);
      return true;
    };

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
      rotRef.current += dt * (0.16 + amp * 0.35);
      const rot = rotRef.current;

      const ar = Math.round(lerp(BLUE_ACCENT[0], GOLD_ACCENT[0], mix));
      const ag = Math.round(lerp(BLUE_ACCENT[1], GOLD_ACCENT[1], mix));
      const ab = Math.round(lerp(BLUE_ACCENT[2], GOLD_ACCENT[2], mix));
      const accent = `rgb(${ar}, ${ag}, ${ab})`;
      const rgba = (a: number) => `rgba(${ar}, ${ag}, ${ab}, ${a})`;
      const atmo = (a: number) =>
        `rgba(${Math.round(lerp(ATMO[0], GOLD_ACCENT[0], mix))}, ${Math.round(lerp(ATMO[1], GOLD_ACCENT[1], mix))}, ${Math.round(lerp(ATMO[2], GOLD_ACCENT[2], mix))}, ${a})`;

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

      // Counter-rotating radar sweep.
      if (typeof ctx.createConicGradient === 'function') {
        const sweep = ctx.createConicGradient(-(t / 1000) * 0.9, 0, 0);
        sweep.addColorStop(0, rgba(0.12));
        sweep.addColorStop(0.08, rgba(0));
        sweep.addColorStop(1, rgba(0));
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = sweep;
        ctx.globalAlpha = 0.5 + amp * 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const geoR = R * 0.72 * (1 + amp * 0.05);

      // Soft outer atmosphere glow behind the planet.
      const bloom = ctx.createRadialGradient(0, 0, geoR * 0.85, 0, 0, geoR * 1.3);
      bloom.addColorStop(0, atmo(0.22 + amp * 0.15));
      bloom.addColorStop(1, atmo(0));
      ctx.beginPath();
      ctx.arc(0, 0, geoR * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = bloom;
      ctx.fill();

      // The textured, rotating Earth.
      if (renderGlobe(mix, amp, rot)) {
        const g = globeRef.current!;
        const scale = geoR / g.baseR;
        const Dcss = (g.D / dpr) * scale;
        ctx.drawImage(g.off, -Dcss / 2, -Dcss / 2, Dcss, Dcss);
      } else {
        // Placeholder while the texture loads.
        const ph = ctx.createRadialGradient(-geoR * 0.3, -geoR * 0.3, geoR * 0.1, 0, 0, geoR);
        ph.addColorStop(0, 'rgba(30,80,140,1)');
        ph.addColorStop(1, 'rgba(2,10,26,1)');
        ctx.beginPath();
        ctx.arc(0, 0, geoR, 0, Math.PI * 2);
        ctx.fillStyle = ph;
        ctx.fill();
      }

      // Atmospheric rim light on the limb.
      const rim = ctx.createRadialGradient(0, 0, geoR * 0.86, 0, 0, geoR * 1.14);
      rim.addColorStop(0, atmo(0));
      rim.addColorStop(0.72, atmo(0));
      rim.addColorStop(0.9, atmo(0.5 + amp * 0.25));
      rim.addColorStop(1, atmo(0));
      ctx.beginPath();
      ctx.arc(0, 0, geoR * 1.14, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      // "VALORIS" ribbon wrapped around the planet's middle, spinning with it.
      const word = 'VALORIS';
      const n = word.length;
      const spread = 2.3;
      const step = spread / n;
      const fs = size * 0.06;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fs}px ${displayFont}, "Exo 2", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < n; i++) {
        const lon = (i - (n - 1) / 2) * step + rot;
        const depth = Math.cos(lon);
        if (depth <= 0.03) continue;
        const sx = Math.sin(lon) * geoR * 0.98;
        const fade = Math.min(1, (depth - 0.03) / 0.4);
        ctx.save();
        ctx.translate(sx, 0);
        ctx.scale(depth, 1);
        ctx.globalAlpha = 0.95 * fade;
        ctx.shadowBlur = 6 * depth;
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
