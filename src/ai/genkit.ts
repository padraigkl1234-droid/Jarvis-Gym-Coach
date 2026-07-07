import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// The coaching model. Defaults to Gemini 2.5 Flash, which every Google AI
// Studio key can use. To run the deeper (but rate-limited / paid-tier) Pro
// model, set JARVIS_MODEL=googleai/gemini-2.5-pro in the environment — no code
// change needed.
const MODEL = process.env.JARVIS_MODEL || 'googleai/gemini-2.5-flash';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  model: MODEL,
});
