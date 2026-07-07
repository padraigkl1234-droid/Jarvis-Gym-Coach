import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { ai } from '@/ai/genkit';
import { DEFAULT_STORE, type JarvisStore } from '@/lib/store';
import { buildStats } from '@/lib/stats';
import { macroConsistency } from '@/lib/analytics';

const SKY = rgb(0.35, 0.78, 0.98);
const AMBER = rgb(0.98, 0.75, 0.24);
const INK_BG = rgb(0.02, 0.035, 0.07);
const PANEL = rgb(0.05, 0.08, 0.14);
const WHITE = rgb(0.95, 0.97, 1);
const DIM = rgb(0.55, 0.62, 0.72);
const FAINT = rgb(0.3, 0.36, 0.46);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(probe, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Three-sentence commander-style summary of the week, with a safe fallback. */
async function writeDebrief(store: JarvisStore): Promise<string> {
  const stats = buildStats(store, { days: 7 });
  const macros = macroConsistency(store, 7);
  const s = stats.summary;
  const fallback = `${s.workoutsCompleted} session${s.workoutsCompleted === 1 ? '' : 's'} completed this week for ${s.totalSets} sets and ${s.totalVolumeKg.toLocaleString()}kg of total volume. Nutrition was logged on ${s.daysNutritionLogged} day${s.daysNutritionLogged === 1 ? '' : 's'}, averaging ${s.avgCalories ?? '–'} kcal and ${s.avgProteinG ?? '–'}g protein against a ${store.profile.proteinTargetG}g target. Hold the standard next week: protein on target every day, and every planned session executed.`;
  try {
    const response = await ai.generate({
      system:
        "You are VALORIS, an elite AI performance coach writing a 'Commander's Debrief' for your athlete's weekly report. Write EXACTLY three sentences: one on training output, one on nutrition adherence, one direct order for next week. Use the concrete numbers provided. Confident military-brief tone, no markdown, no emoji.",
      prompt: `Athlete: ${store.profile.name}. Goal: ${store.profile.goal || 'not set'}. Week summary: ${JSON.stringify({
        workoutsCompleted: s.workoutsCompleted,
        totalSets: s.totalSets,
        totalVolumeKg: s.totalVolumeKg,
        daysNutritionLogged: s.daysNutritionLogged,
        avgCalories: s.avgCalories,
        avgProteinG: s.avgProteinG,
        proteinTargetG: store.profile.proteinTargetG,
        calorieTarget: store.profile.calorieTarget,
        proteinHitRate: macros.proteinHitRate,
        bodyweightKg: s.bodyweightKg,
        sessions: stats.completedSessions.slice(0, 7).map((x) => `${x.date} ${x.label} ${x.totalSets} sets ${x.totalVolumeKg}kg`),
      })}`,
    });
    const text = response.text.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store: JarvisStore =
      body?.store && typeof body.store === 'object'
        ? { ...structuredClone(DEFAULT_STORE), ...body.store }
        : structuredClone(DEFAULT_STORE);

    const stats = buildStats(store, { days: 7 });
    const macros = macroConsistency(store, 7);
    const debrief = await writeDebrief(store);

    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 595;
    const M = 48;

    page.drawRectangle({ x: 0, y: 0, width: W, height: 842, color: INK_BG });

    let y = 842 - 56;
    page.drawText('VALORIS', { x: M, y, size: 22, font: bold, color: SKY });
    page.drawText('WEEKLY BLUEPRINT', { x: M + 110, y: y + 1, size: 12, font: helv, color: DIM });
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const range = `${from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    page.drawText(`${store.profile.name}  ·  ${store.profile.goal || 'No goal set'}  ·  ${range}`, {
      x: M, y: y - 20, size: 9, font: helv, color: DIM,
    });
    page.drawLine({ start: { x: M, y: y - 32 }, end: { x: W - M, y: y - 32 }, thickness: 1, color: SKY, opacity: 0.5 });
    y -= 58;

    // Commander's Debrief
    page.drawText("COMMANDER'S DEBRIEF", { x: M, y, size: 9, font: bold, color: AMBER });
    y -= 8;
    const debriefLines = wrap(debrief, helv, 10, W - M * 2 - 24);
    const boxH = debriefLines.length * 14 + 22;
    page.drawRectangle({ x: M, y: y - boxH, width: W - M * 2, height: boxH, color: PANEL, borderColor: AMBER, borderWidth: 0.75, opacity: 0.9, borderOpacity: 0.5 });
    let ty = y - 20;
    for (const line of debriefLines) {
      page.drawText(line, { x: M + 12, y: ty, size: 10, font: helv, color: WHITE, lineHeight: 14 });
      ty -= 14;
    }
    y -= boxH + 26;

    // Week by the numbers
    const s = stats.summary;
    page.drawText('WEEK BY THE NUMBERS', { x: M, y, size: 9, font: bold, color: SKY });
    y -= 18;
    const tiles: [string, string][] = [
      ['Sessions', String(s.workoutsCompleted)],
      ['Total sets', String(s.totalSets)],
      ['Volume', `${s.totalVolumeKg.toLocaleString()}kg`],
      ['Avg kcal', s.avgCalories != null ? String(s.avgCalories) : '–'],
      ['Avg protein', s.avgProteinG != null ? `${s.avgProteinG}g` : '–'],
      ['Protein hit', macros.proteinHitRate != null ? `${macros.proteinHitRate}%` : '–'],
    ];
    const tileW = (W - M * 2 - 5 * 8) / 6;
    tiles.forEach(([label, value], i) => {
      const x = M + i * (tileW + 8);
      page.drawRectangle({ x, y: y - 34, width: tileW, height: 40, color: PANEL, borderColor: SKY, borderWidth: 0.5, borderOpacity: 0.35 });
      page.drawText(value, { x: x + 8, y: y - 12, size: 12, font: bold, color: WHITE });
      page.drawText(label.toUpperCase(), { x: x + 8, y: y - 27, size: 6, font: helv, color: DIM });
    });
    y -= 62;

    // Training log
    page.drawText('TRAINING LOG', { x: M, y, size: 9, font: bold, color: SKY });
    y -= 16;
    if (stats.completedSessions.length === 0) {
      page.drawText('No sessions recorded this week.', { x: M, y, size: 9, font: helv, color: FAINT });
      y -= 16;
    } else {
      for (const sess of stats.completedSessions.slice(0, 7)) {
        page.drawText(sess.date, { x: M, y, size: 9, font: helv, color: DIM });
        page.drawText(`${sess.label}${sess.status === 'in_progress' ? '  (open)' : ''}`, { x: M + 70, y, size: 9, font: bold, color: WHITE });
        page.drawText(`${sess.totalSets} sets`, { x: M + 250, y, size: 9, font: helv, color: DIM });
        page.drawText(`${sess.totalVolumeKg.toLocaleString()}kg`, { x: M + 320, y, size: 9, font: helv, color: SKY });
        const exLine = sess.exercises.map((e) => `${e.name} ${e.sets}x`).join(' · ');
        for (const line of wrap(exLine, helv, 7.5, W - M - (M + 70)).slice(0, 1)) {
          y -= 11;
          page.drawText(line, { x: M + 70, y, size: 7.5, font: helv, color: FAINT });
        }
        y -= 16;
      }
    }
    y -= 10;

    // Macros: targets vs actuals
    page.drawText('MACROS — TARGET VS ACTUAL', { x: M, y, size: 9, font: bold, color: AMBER });
    y -= 16;
    const header = ['DATE', 'KCAL', 'TARGET', 'PROTEIN', 'TARGET', 'STATUS'];
    const colX = [M, M + 90, M + 160, M + 240, M + 320, M + 400];
    header.forEach((h, i) => page.drawText(h, { x: colX[i], y, size: 7, font: bold, color: DIM }));
    y -= 13;
    const days = stats.dailyMacros.slice(0, 7);
    if (days.length === 0) {
      page.drawText('No nutrition logged this week.', { x: M, y, size: 9, font: helv, color: FAINT });
      y -= 14;
    }
    for (const d of days) {
      const calPct = d.targets.calories ? d.calories / d.targets.calories : 0;
      const protHit = d.targets.proteinG ? d.proteinG / d.targets.proteinG >= 0.9 : false;
      const within = calPct >= 0.9 && calPct <= 1.1;
      page.drawText(d.date, { x: colX[0], y, size: 8.5, font: helv, color: DIM });
      page.drawText(String(d.calories), { x: colX[1], y, size: 8.5, font: helv, color: WHITE });
      page.drawText(String(d.targets.calories), { x: colX[2], y, size: 8.5, font: helv, color: FAINT });
      page.drawText(`${d.proteinG}g`, { x: colX[3], y, size: 8.5, font: helv, color: WHITE });
      page.drawText(`${d.targets.proteinG}g`, { x: colX[4], y, size: 8.5, font: helv, color: FAINT });
      page.drawText(within && protHit ? 'ON TARGET' : protHit ? 'KCAL DRIFT' : 'PROTEIN LOW', {
        x: colX[5], y, size: 7.5, font: bold, color: within && protHit ? SKY : AMBER,
      });
      y -= 13;
    }

    page.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.5, color: FAINT, opacity: 0.5 });
    page.drawText('Generated by VALORIS — voice-operated AI performance coach', { x: M, y: 32, size: 7, font: helv, color: FAINT });

    const bytes = await doc.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="valoris-blueprint-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    console.error('VALORIS blueprint export error:', err);
    return NextResponse.json({ error: 'Failed to generate blueprint.' }, { status: 500 });
  }
}
