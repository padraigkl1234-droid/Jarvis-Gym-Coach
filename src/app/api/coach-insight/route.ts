import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requirePremium } from '@/lib/tier';

export const maxDuration = 30;

/**
 * General-purpose personalization: one short coaching message that actually
 * reads the athlete's goal, experience, equipment, coach notes, and a recent
 * activity summary — the fields Settings collects but the app otherwise never
 * revisits. Client sends a compact, pre-shaped payload (no raw log dump).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const gate = requirePremium(body?.subscriptionTier);
    if (gate) return gate;

    const name: string = typeof body?.name === 'string' ? body.name : 'Athlete';
    const goal: string = typeof body?.goal === 'string' ? body.goal : '';
    const experience: string = typeof body?.experience === 'string' ? body.experience : '';
    const equipment: string[] = Array.isArray(body?.equipment) ? body.equipment.filter((e: unknown) => typeof e === 'string') : [];
    const notes: string[] = Array.isArray(body?.notes) ? body.notes.filter((n: unknown) => typeof n === 'string').slice(0, 20) : [];
    const summary = body?.summary && typeof body.summary === 'object' ? body.summary : {};

    const response = await ai.generate({
      system: `You are VALORIS, a personal AI performance coach. Write ONE short, personalized coaching message for today, grounded in the specific facts you're given about this athlete — their goal, experience, equipment, any coach notes (injuries, preferences, records), and their recent training/nutrition numbers. Rules: maximum two short sentences, spoken-aloud style, no markdown or emoji, address ${name} directly, reference at least one concrete fact you were given, end with one specific action for today. If a coach note flags an injury or limitation, factor it into the advice (e.g. suggest a safer alternative) rather than ignoring it. Confident and warm, never scolding.`,
      prompt: `Goal: ${goal || 'not set'}. Experience: ${experience || 'not set'}. Equipment: ${
        equipment.length ? equipment.join(', ') : 'not set'
      }. Coach notes: ${notes.length ? notes.join(' | ') : 'none'}. Recent activity summary: ${JSON.stringify(summary)}`,
      config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 },
    });

    const message = response.text.trim();
    if (!message) throw new Error('empty phrasing');
    return NextResponse.json({ message });
  } catch (err) {
    console.error('VALORIS coach-insight error:', err);
    return NextResponse.json({ error: 'Failed to generate a coaching insight.' }, { status: 500 });
  }
}
