import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// The coaching model. Defaults to Gemini 2.5 Pro for the deepest reasoning;
// override with JARVIS_MODEL in the environment (e.g. googleai/gemini-2.5-flash)
// to trade some nuance for faster, cheaper replies — no code change needed.
const MODEL = process.env.JARVIS_MODEL || 'googleai/gemini-2.5-pro';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  model: MODEL,
});
