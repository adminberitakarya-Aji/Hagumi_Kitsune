/**
 * SALINAN SERVER-SIDE dari packages/core/src/online + src/breeding (M8 — Doc 07 §3).
 * Edge function Deno tidak bisa mengimpor workspace pnpm — angka di bawah WAJIB
 * identik dengan `packages/data/data/breeding.json` (diuji paralel di core).
 * Jika breeding.json berubah → perbarui berkas ini di tempat yang sama.
 */

export const PET_ELEMENTS = ["fire", "water", "wind", "earth", "mystic"] as const;
export type PetElement = (typeof PET_ELEMENTS)[number];

// ===== breeding.json — genetics =====
const PARENT_CHANCE = 0.7; // Doc 07 §3: 70%
const MIX_CHANCE = 0.95; // 70–95% → 25% mix, sisanya 5% mystic
const COLOR_MIX_PARENT_A = 0.6; // warna 60/40
const HUE_JITTER_DEG = 6; // ±6°
const PERSONALITY_INHERIT_CHANCE = 0.6; // 60% waris / 40% variasi
const START_BONUS_MIN_PCT = 1;
const START_BONUS_MAX_PCT = 4;
const START_BONUS_ELITE_PCT = 5;
const START_BONUS_ELITE_CARE_SCORE = 80;
/** Tabel kombinasi elemen mix — kunci "a+b" alfabetis (breeding.json). */
const MIX_TABLE: Record<string, string> = {
  "earth+fire": "wind",
  "earth+water": "wind",
  "earth+wind": "water",
  "fire+water": "earth",
  "fire+wind": "water",
  "water+wind": "fire",
};

const ELEMENT_COAT: Record<PetElement, string> = {
  fire: "#E8874A",
  water: "#8FB6D9",
  wind: "#EFE3C0",
  earth: "#A98F5C",
  mystic: "#A98BC4",
};

export function mixKey(a: string, b: string): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`;
}

export function getMixElement(a: string, b: string): string | null {
  return MIX_TABLE[mixKey(a, b)] ?? null;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  const int = m ? Number.parseInt(m[1]!, 16) : 0x888888;
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  const rgb: [number, number, number] =
    hh < 60 ? [c, x, 0] :
    hh < 120 ? [x, c, 0] :
    hh < 180 ? [0, c, x] :
    hh < 240 ? [0, x, c] :
    hh < 300 ? [x, 0, c] : [c, 0, x];
  const to255 = (n: number) =>
    Math.round(clamp01((n + m) * 100) * 2.55)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(rgb[0]!)}${to255(rgb[1]!)}${to255(rgb[2]!)}`;
}

function mixHsv(a: Hsv, b: Hsv, weightA: number): Hsv {
  const radA = (a.h * Math.PI) / 180;
  const radB = (b.h * Math.PI) / 180;
  const x = Math.cos(radA) * weightA + Math.cos(radB) * (1 - weightA);
  const y = Math.sin(radA) * weightA + Math.sin(radB) * (1 - weightA);
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { h, s: a.s * weightA + b.s * (1 - weightA), v: a.v * weightA + b.v * (1 - weightA) };
}

export function mixCoatColors(colorA: string, colorB: string, next: () => number | null): string {
  const mixed = mixHsv(hexToHsv(colorA), hexToHsv(colorB), COLOR_MIX_PARENT_A);
  if (next && HUE_JITTER_DEG > 0) mixed.h += (next() * 2 - 1) * HUE_JITTER_DEG;
  return hsvToHex(mixed);
}

export interface RolledGenetics {
  element: PetElement;
  personalityElement: PetElement;
  coatColor: string;
  startBonusPct: number;
  source: "parent" | "partner" | "mix" | "mutation";
}

/** Algoritma genetika inti (Doc 07 §3) — identik dengan core rollChildGenetics. */
export function rollChildGenetics(opts: {
  next: () => number;
  parentElement: PetElement;
  partnerElement: PetElement;
  parentCoat: string;
  partnerCoat: string;
  parentCareScore: number;
}): RolledGenetics {
  const { next, parentElement, partnerElement, parentCoat, partnerCoat, parentCareScore } = opts;
  const r = next();
  let element: PetElement;
  let source: RolledGenetics["source"];
  let elementGiver: PetElement | null = null;

  if (r < PARENT_CHANCE) {
    const fromParent = next() < 0.5;
    element = fromParent ? parentElement : partnerElement;
    source = fromParent ? "parent" : "partner";
    elementGiver = element;
  } else if (r < MIX_CHANCE) {
    element = ((getMixElement(parentElement, partnerElement) ?? parentElement) as PetElement);
    source = "mix";
  } else {
    element = "mystic";
    source = "mutation";
  }

  let personalityElement: PetElement;
  if (elementGiver !== null && next() < PERSONALITY_INHERIT_CHANCE) {
    personalityElement = elementGiver;
  } else {
    personalityElement = PET_ELEMENTS[Math.floor(next() * PET_ELEMENTS.length)]!;
  }

  const coatColor = mixCoatColors(parentCoat, partnerCoat, next);

  const startBonusPct =
    parentCareScore >= START_BONUS_ELITE_CARE_SCORE
      ? START_BONUS_ELITE_PCT
      : START_BONUS_MIN_PCT + Math.floor(next() * (START_BONUS_MAX_PCT + 1 - START_BONUS_MIN_PCT));

  return { element, personalityElement, coatColor, startBonusPct, source };
}
