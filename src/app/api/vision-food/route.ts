import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requirePremium } from '@/lib/tier';

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
        'You are a sports nutritionist analysing a photo of food. Identify the meal, estimate portion size from visual cues (plate size, utensils), and estimate calories and macros. Respond with ONLY a JSON object, no markdown fences, matching: {"found": boolean, "name": string, "calories": number, "proteinG": number, "carbsG": number, "fatG": number, "confidence": "low"|"medium"|"high", "note": string}. If the photo does not show food, set found to false and explain in note. Round numbers sensibly; name should be short and dish-like, e.g. "Tomato Chicken Pasta".',
      prompt: [{ media: { url: image } }, { text: 'Identify this food and estimate its macros.' }],
    });

    const raw = response.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('unparseable vision response');
    const parsed = JSON.parse(raw.slice(start, end + 1));

    if (!parsed.found) {
      return NextResponse.json({ found: false, note: String(parsed.note ?? 'No food detected in that photo.') });
    }
    return NextResponse.json({
      found: true,
      name: String(parsed.name ?? 'Meal'),
      calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
      proteinG: Math.max(0, Math.round(Number(parsed.proteinG) || 0)),
      carbsG: Math.max(0, Math.round(Number(parsed.carbsG) || 0)),
      fatG: Math.max(0, Math.round(Number(parsed.fatG) || 0)),
      confidence: parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium',
      note: String(parsed.note ?? ''),
    });
  } catch (err) {
    console.error('VALORIS vision error:', err);
    return NextResponse.json({ error: 'Could not analyse that photo.' }, { status: 500 });
  }
}
