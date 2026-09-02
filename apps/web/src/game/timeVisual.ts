/**
 * Visual fase pagi–malam (Doc 03 §3): warna langit diinterpolasi mulus dalam
 * 15 menit di sekitar batas fase (bukan switch), plus overlay & fx per fase.
 * Fungsi murni — dipakai scene outdoor (Taman, Matsuri) & jendela Home.
 */
import { getDayPhase, type DayPhase } from "@hagumi/core";

export interface SkyState {
  /** Warna langit atas & bawah (interpolasi 15 menit di sekitar batas fase). */
  top: number;
  bottom: number;
  /** Fase dominan saat ini. */
  phase: DayPhase;
  /** Overlay suasana: warna + alpha (kabut pagi, hangat senja, gelap malam). */
  overlay: number;
  overlayAlpha: number;
  /** true bila malam (lentera/andon menyala, Doc 03 §3). */
  night: boolean;
}

/** Palet langit per fase (atas, bawah). */
const PHASE_SKY: Record<DayPhase, { top: number; bottom: number }> = {
  morning: { top: 0xffd9a0, bottom: 0xffb08a }, // langit jingga + kabut tipis
  day: { top: 0x8fd0ff, bottom: 0xcdeeff }, // terang penuh
  evening: { top: 0xff9e6b, bottom: 0xd96a8a }, // hangat, bayangan panjang
  night: { top: 0x1b2340, bottom: 0x2b2b51 }, // gelap
};

/** Overlay suasana per fase. */
const PHASE_OVERLAY: Record<DayPhase, { color: number; alpha: number }> = {
  morning: { color: 0xffffff, alpha: 0.12 }, // kabut tipis
  day: { color: 0xffffff, alpha: 0 },
  evening: { color: 0xff8c5a, alpha: 0.1 }, // kehangatan senja
  night: { color: 0x0a1030, alpha: 0.22 }, // gelap malam
};

/** Batas pergantian fase (Doc 03 §3): 05:00, 10:00, 15:00, 19:00. */
const BLEND_MS = 15 * 60_000; // transisi 15 menit (Doc 03 §3)

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function lerpSky(a: DayPhase, b: DayPhase, t: number): { top: number; bottom: number } {
  return {
    top: lerpColor(PHASE_SKY[a].top, PHASE_SKY[b].top, t),
    bottom: lerpColor(PHASE_SKY[a].bottom, PHASE_SKY[b].bottom, t),
  };
}

/** Hitung status langit dari jam simulasi (ms epoch). */
export function getSky(nowMs: number): SkyState {
  const d = new Date(nowMs);
  const hours = d.getHours() + d.getMinutes() / 60;
  const phase = getDayPhase(nowMs);

  // Fase sebelumnya + jam batas fase terakhir (malam dini hari: batas = 19:00 kemarin)
  let boundaryHour: number;
  let prevPhase: DayPhase;
  let boundaryYesterday = false;
  if (hours >= 19) {
    boundaryHour = 19;
    prevPhase = "evening";
  } else if (hours >= 15) {
    boundaryHour = 15;
    prevPhase = "day";
  } else if (hours >= 10) {
    boundaryHour = 10;
    prevPhase = "morning";
  } else if (hours >= 5) {
    boundaryHour = 5;
    prevPhase = "night";
  } else {
    boundaryHour = 19;
    prevPhase = "evening";
    boundaryYesterday = true;
  }

  const dBoundary = new Date(d);
  dBoundary.setHours(boundaryHour, 0, 0, 0);
  if (boundaryYesterday) dBoundary.setDate(dBoundary.getDate() - 1);

  const sinceBoundary = nowMs - dBoundary.getTime();
  const t = Math.min(1, Math.max(0, sinceBoundary / BLEND_MS));
  const sky = t >= 1 ? PHASE_SKY[phase] : lerpSky(prevPhase, phase, t);

  const cur = PHASE_OVERLAY[phase];
  const prev = PHASE_OVERLAY[prevPhase];
  const overlayAlpha = t >= 1 ? cur.alpha : prev.alpha + (cur.alpha - prev.alpha) * t;

  return { top: sky.top, bottom: sky.bottom, phase, overlay: cur.color, overlayAlpha, night: phase === "night" };
}
