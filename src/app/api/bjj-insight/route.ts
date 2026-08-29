import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const maxDuration = 30;

/**
 * BJJ-specific coaching narrative layered on top of the rule-based brain in
 * lib/bjj.ts. Client sends a compact stats summary (top techniques, category
 * breakdown, rule-based suggestions) — this just turns those numbers into
 * one grounded, specific coaching sentence or two.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name: string = typeof body?.name === 'string' ? body.name : 'Athlete';
    const experience: string = typeof body?.experience === 'string' ? body.experience : '';
    const topTechniques = Array.isArray(body?.topTechniques) ? body.topTechniques.slice(0, 8) : [];
    const categoryBreakdown = body?.categoryBreakdown && typeof body.categoryBreakdown === 'object' ? body.categoryBreakdown : {};
    const ruleSuggestions: string[] = Array.isArray(body?.ruleSuggestions)
      ? body.ruleSuggestions.filter((s: unknown) => typeof s === 'string').slice(0, 5)
      : [];

    const response = await ai.generate({
      system: `You are VALORIS, a personal AI Brazilian Jiu-Jitsu coach with real technical BJJ knowledge — positions, submissions, sweeps, escapes, guard passes, and their common variants. Write ONE short, personalized coaching message for today, grounded in the specific technique stats you're given. Rules: maximum two short sentences, spoken-aloud style, no markdown or emoji, address ${name} directly, reference at least one concrete technique or number you were given, end with one specific, technically correct action for their next session (a technique, a variant, or a drilling focus). Confident and warm, like a training partner who's paying attention, never generic filler.`,
      prompt: `Experience: ${experience || 'not set'}. Top techniques (name/category/attempted/landed/landRate): ${JSON.stringify(
        topTechniques
      )}. Category breakdown (attempted/landed per category): ${JSON.stringify(categoryBreakdown)}. Rule-based suggestions already surfaced in-app: ${
        ruleSuggestions.length ? ruleSuggestions.join(' | ') : 'none yet'
      }.`,
      config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 },
    });

    const message = response.text.trim();
    if (!message) throw new Error('empty phrasing');
    return NextResponse.json({ message });
  } catch (err) {
    console.error('VALORIS bjj-insight error:', err);
    return NextResponse.json({ error: 'Failed to generate a BJJ insight.' }, { status: 500 });
  }
}
