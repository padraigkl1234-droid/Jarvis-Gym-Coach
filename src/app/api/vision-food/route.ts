import { NextRequest, NextResponse } from 'next/server';
import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { requirePremium } from '@/lib/tier';

// Vision analysis of a real photo can take a while — don't let the platform
// kill the function at its short default.
export const maxDuration = 60;

const VisionResult = z.object({
  found: z.boolean().describe('true only if the photo clearly shows food or drink'),
  name: z.string().describe('Short dish-like name, e.g. "Tomato Chicken Pasta"'),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  confidence: z.enum(['low', 'medium', 'high']),
  note: z.string().describe('One short line on portion assumptions, or why no food was found'),
});

/**
 * Vision food recognition: takes a photo of a meal (base64 data URL) and
 * returns identified food with estimated macros, so the client can prompt
 * "I detected X (~N kcal). Log this?" without going through text chat.
 * Premium-gated.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const gate = requirePremium(body?.subscriptionTier);
    if (gate) return gate;

    const image: string = typeof body?.image === 'string' ? body.image : '';
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'image must be a data URL' }, { status: 400 });
    }
    // Keep payloads sane (client downscales; this is a backstop).
    if (image.length > 4_500_000) {
      return NextResponse.json({ error: 'image too large' }, { status: 413 });
    }

    const response = await ai.generate({
      system:
        'You are a sports nutritionist analysing a photo of food. Identify the meal, estimate portion size from visual cues (plate size, utensils), and estimate calories and macros. Round numbers sensibly; the name should be short and dish-like. If the photo does not show food or drink, set found to false and explain in note.',
      prompt: [{ media: { url: image } }, { text: 'Identify this food and estimate its macros.' }],
      output: { schema: VisionResult },
      // Skip the thinking phase — photo answers should come back fast.
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    let parsed = response.output;
    if (!parsed) {
      // Fall back to salvaging JSON from free text.
      const raw = response.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error(`unparseable vision response: ${raw.slice(0, 120)}`);
      parsed = VisionResult.parse(JSON.parse(raw.slice(start, end + 1)));
    }

    if (!parsed.found) {
      return NextResponse.json({ found: false, note: parsed.note || 'No food detected in that photo.' });
    }
    return NextResponse.json({
      found: true,
      name: parsed.name || 'Meal',
      calories: Math.max(0, Math.round(parsed.calories)),
      proteinG: Math.max(0, Math.round(parsed.proteinG)),
      carbsG: Math.max(0, Math.round(parsed.carbsG)),
      fatG: Math.max(0, Math.round(parsed.fatG)),
      confidence: parsed.confidence,
      note: parsed.note ?? '',
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('VALORIS vision error:', detail);
    return NextResponse.json({ error: `Vision analysis failed: ${detail.slice(0, 200)}` }, { status: 500 });
  }
}
