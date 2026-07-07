import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_STORE, type JarvisStore } from '@/lib/store';
import { buildStats } from '@/lib/stats';

/**
 * Historical stats endpoint. The athlete's data lives client-side, so the
 * client posts its store and receives the derived analytics — completed
 * sessions, per-exercise progression, and daily macros — plus a summary.
 *
 * Body: { store: JarvisStore, days?: number, exercise?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store: JarvisStore =
      body?.store && typeof body.store === 'object'
        ? { ...structuredClone(DEFAULT_STORE), ...body.store }
        : structuredClone(DEFAULT_STORE);
    const days = typeof body?.days === 'number' ? body.days : undefined;
    const exercise = typeof body?.exercise === 'string' ? body.exercise : undefined;

    return NextResponse.json(buildStats(store, { days, exercise }));
  } catch (err) {
    console.error('JARVIS stats error:', err);
    return NextResponse.json({ error: 'Failed to compute stats.' }, { status: 500 });
  }
}
