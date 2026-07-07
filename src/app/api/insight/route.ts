import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

/**
 * Phrases a detected insight as a short proactive coaching nudge in VALORIS's
 * voice. Detection happens client-side (src/lib/insights.ts); this endpoint
 * only turns the facts into natural language. The client falls back to the
 * deterministic message if this call fails.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name: string = typeof body?.name === 'string' ? body.name : 'Athlete';
    const goal: string = typeof body?.goal === 'string' ? body.goal : '';
    const kind: string = typeof body?.kind === 'string' ? body.kind : '';
    const facts = body?.facts && typeof body.facts === 'object' ? body.facts : {};
    if (!kind) return NextResponse.json({ error: 'kind is required' }, { status: 400 });

    const response = await ai.generate({
      system: `You are VALORIS, a personal AI performance coach. Write ONE proactive nudge to your athlete based on a pattern you spotted in their recent data. Rules: maximum two short sentences, spoken-aloud style, no markdown or emoji, use the concrete numbers you are given, address ${name} directly, end with one specific action for today. Confident and warm, never scolding.`,
      prompt: `Pattern detected: ${kind}. Athlete goal: ${goal || 'not set'}. Facts: ${JSON.stringify(facts)}`,
    });

    const message = response.text.trim();
    if (!message) throw new Error('empty phrasing');
    return NextResponse.json({ message });
  } catch (err) {
    console.error('VALORIS insight error:', err);
    return NextResponse.json({ error: 'Failed to phrase insight.' }, { status: 500 });
  }
}
