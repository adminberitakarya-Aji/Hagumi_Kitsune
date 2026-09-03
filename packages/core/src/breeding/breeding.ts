/**
 * HAGUMI core — Breeding, Genetika & Warisan (M7 — Doc 07, GDD §15).
 * Semua fungsi murni & deterministik-terhadap-RNG: angka dari breeding.json,
 * warna dasar dari tabel elemen, acak hanya via IRng (Doc 09 §1).
 */
import { breedingConfig, getMixElement, mixKey, type BreedingConfig } from "@hagumi/data";
import { MS_PER_DAY } from "../time/time-service";
import { clampStat } from "../pet/stats";
import { PET_ELEMENTS, type PetData, type PetElement, type PetStats } from "../pet/types";
import type { IRng } from "../ports";
import type {
  BreedingGateReason,
  BreedingGateResult,
  BreedingEgg,
  ChildGenetics,
  LineageNode,
  LineageParent,
  NpcPartner,
} from "./types";

/** Syarat & genetika dari data (nol hard-code — Doc 07 §1 & §3). */
const REQ = breedingConfig.requirements;
const GEN = breedingConfig.genetics;
const LEGACY = breedingConfig.legacy;

/** Warna bulu dasar per elemen — satu sumber genetika warna (senada palet M5). */
export const ELEMENT_COAT: Record<PetElement, string> = {
  fire: "#E8874A",
  water: "#8FB6D9",
  wind: "#EFE3C0",
  earth: "#A98F5C",
  mystic: "#A98BC4",
};

// ===== Syarat breeding (Doc 07 §1) =====

export interface BreedingStateInput {
  childrenCount: number;
  cooldownUntil: number;
}

/** Gerbang breeding: tombol nonaktif + daftar alasan untuk UI (Doc 07 §6). */
export function checkBreedingRequirements(
  pet: PetData,
  breeding: BreedingStateInput,
  nowMs: number,
): BreedingGateResult {
  if (pet.stage === "dead" || pet.state === "dead") {
    return { allowed: false, reasons: ["IS_DEAD"] };
  }
  if (pet.stage === "egg" || pet.state === "egg") {
    return { allowed: false, reasons: ["IS_EGG"] };
  }
  const reasons: string[] = [];
  const ageDays = (nowMs - pet.birthAt) / MS_PER_DAY;
  if (ageDays < REQ.minAgeDays) reasons.push("TOO_YOUNG");
  if (pet.stats.health < REQ.minHealth) reasons.push("LOW_HEALTH");
  if (pet.stats.happiness < REQ.minHappiness) reasons.push("LOW_HAPPINESS");
  if (breeding.cooldownUntil > nowMs) reasons.push("ON_COOLDOWN");
  if (breeding.childrenCount >= REQ.maxChildren) reasons.push("QUOTA_FULL");
  if (reasons.length === 0) return { allowed: true };
  return { allowed: false, reasons: reasons as BreedingGateReason[] };
}

/** Sisa cooldown breeding dalam ms (0 = boleh). */
export function cooldownRemainingMs(breeding: BreedingStateInput, nowMs: number): number {
  return Math.max(0, breeding.cooldownUntil - nowMs);
}

// ===== Mitra NPC harian (Doc 07 §2A — 3 pilihan, elemen berbeda) =====

/** Hash FNV-1a string → uint32 (mitra harian & checksum breeding code sama sepanjang hari). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG deterministik dari seed (dipakai ulang jalur breeding online M8). */
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

/**
 * 3 mitra NPC harian dengan elemen berbeda (Doc 12 §9.2).
 * Deterministik terhadap `dayKey` — pilihan sama sepanjang hari, acak antarhari.
 */
export function rollDailyPartners(dayKey: string): NpcPartner[] {
  const cfg = breedingConfig.npc;
  const rand = mulberry32(hashString(dayKey));
  const pool = [...cfg.elementPool] as PetElement[];
  const partners: NpcPartner[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    const element = pool.splice(idx, 1)[0]!;
    const name = cfg.names[(hashString(dayKey + element) + i) % cfg.names.length]!;
    partners.push({ id: element, name, element });
  }
  return partners;
}
// ===== Warna: hex ↔ HSV (mix HSV induk — Doc 07 §3) =====

export interface Hsv {
  h: number; // 0–360
  s: number; // 0–1
  v: number; // 0–1
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
    Math.round(clampStat((n + m) * 100) * 2.55)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(rgb[0])}${to255(rgb[1])}${to255(rgb[2])}`;
}

/** Rata-rata hue melingkar berbobot (60/40) + komponen s/v linear. */
function mixHsv(a: Hsv, b: Hsv, weightA: number): Hsv {
  // rata-rata melingkar: hue 350°+10° = 0°, bukan 180°
  const radA = (a.h * Math.PI) / 180;
  const radB = (b.h * Math.PI) / 180;
  const x = Math.cos(radA) * weightA + Math.cos(radB) * (1 - weightA);
  const y = Math.sin(radA) * weightA + Math.sin(radB) * (1 - weightA);
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (h < 0) h += 360;
  return {
    h,
    s: a.s * weightA + b.s * (1 - weightA),
    v: a.v * weightA + b.v * (1 - weightA),
  };
}

/** Warna coat pet: field coatColor bila ada, warna dasar elemen bila tidak. */
export function coatColorOf(element: PetElement, coatColor?: string): string {
  return coatColor ?? ELEMENT_COAT[element];
}

/** Campuran warna dua induk (60/40 + jitter hue — Doc 07 §3). jitterHue=0 → preview deterministik. */
export function mixCoatColors(
  colorA: string,
  colorB: string,
  rng: Pick<IRng, "next"> | null,
  jitterHueDeg: number = GEN.hueJitterDeg,
): string {
  const mixed = mixHsv(hexToHsv(colorA), hexToHsv(colorB), GEN.colorMixParentA);
  if (rng && jitterHueDeg > 0) {
    mixed.h += (rng.next() * 2 - 1) * jitterHueDeg;
  }
  return hsvToHex(mixed);
}

/** Preview warna anak tanpa RNG (kartu mitra — Doc 12 §9.2). */
export function previewChildCoat(parent: PetData, partner: NpcPartner): string {
  return mixCoatColors(coatColorOf(parent.element, parent.coatColor), coatColorOf(partner.element), null, 0);
}

/** Elemen preview anak (deterministik): mix tabel bila induk berbeda, else elemen induk. */
export function previewChildElement(parentElement: PetElement, partnerElement: PetElement): PetElement {
  if (parentElement === partnerElement) return parentElement;
  return (getMixElement(parentElement, partnerElement) ?? parentElement) as PetElement;
}

// ===== Algoritma genetika (Doc 07 §3 — pseudocode wajib identik) =====

export interface GeneticsInput {
  parent: PetData;
  partner: NpcPartner;
  rng: IRng;
}

/** Input genetika generik — dipakai jalur NPC (M7) & antar-pemain online (M8). */
export interface RollGeneticsInput {
  rng: IRng;
  parentElement: PetElement;
  partnerElement: PetElement;
  parentCoat: string;
  partnerCoat: string;
  parentCareScore: number;
}

/**
 * Algoritma genetika inti (Doc 07 §3) — SATU sumber untuk breeding NPC & online.
 * Deterministik terhadap rng; angka dari breeding.json (nol hard-code).
 */
export function rollChildGenetics({
  rng,
  parentElement,
  partnerElement,
  parentCoat,
  partnerCoat,
  parentCareScore,
}: RollGeneticsInput): ChildGenetics {
  const r = rng.next();
  let element: PetElement;
  let source: ChildGenetics["source"];
  /** Pemberi elemen utk pewarisan kepribadian (null = variasi baru). */
  let elementGiver: PetElement | null = null;

  if (r < GEN.parentChance) {
    // 70%: elemen salah satu induk (50/50)
    const fromParent = rng.next() < 0.5;
    element = fromParent ? parentElement : partnerElement;
    source = fromParent ? "parent" : "partner";
    elementGiver = element;
  } else if (r < GEN.mixChance) {
    // 25%: elemen "mix" dari tabel kombinasi (Doc 07 §3)
    const mixed = getMixElement(parentElement, partnerElement);
    element = (mixed ?? parentElement) as PetElement;
    source = "mix";
  } else {
    // 5%: mutasi mystic ✨
    element = "mystic";
    source = "mutation";
  }

  // Kepribadian: 60% waris dari induk yang memberi elemen · 40% variasi baru
  let personalityElement: PetElement;
  if (elementGiver !== null && rng.next() < GEN.personalityInheritChance) {
    personalityElement = elementGiver;
  } else {
    personalityElement = rng.pick(PET_ELEMENTS)!;
  }

  // Warna: mix HSV induk A (60%) + B (40%) + jitter ±6°
  const coatColor = mixCoatColors(parentCoat, partnerCoat, rng);

  // Bonus stat awal: 1..4%; induk elite (careScore ≥ ambang) → 5% (Doc 07 §3)
  const startBonusPct =
    parentCareScore >= GEN.startBonusEliteCareScore
      ? GEN.startBonusElitePct
      : rng.int(GEN.startBonusMinPct, GEN.startBonusMaxPct + 1);

  return { element, personalityElement, coatColor, startBonusPct, source };
}

export function computeChildGenetics({ parent, partner, rng }: GeneticsInput): ChildGenetics {
  return rollChildGenetics({
    rng,
    parentElement: parent.element,
    partnerElement: partner.element,
    parentCoat: coatColorOf(parent.element, parent.coatColor),
    partnerCoat: coatColorOf(partner.element),
    parentCareScore: parent.careScore,
  });
}

/** Rata-rata 4 stat utama induk (dasar bonus stat anak). */
export function averageParentStats(stats: PetStats): number {
  return (stats.hunger + stats.happiness + stats.energy + stats.hygiene) / 4;
}

/**
 * Stat awal anak = dasar newborn + pct% × rata-rata stat induk (Doc 07 §3).
 * Health tetap 100 (anak lahir sehat).
 */
export function applyStartBonus(base: PetStats, parent: PetData, pct: number): PetStats {
  const bonus = (averageParentStats(parent.stats) * pct) / 100;
  return {
    hunger: clampStat(base.hunger + bonus),
    happiness: clampStat(base.happiness + bonus),
    energy: clampStat(base.energy + bonus),
    hygiene: clampStat(base.hygiene + bonus),
    health: 100,
  };
}

// ===== Lineage (Doc 07 §4) =====

/** Node silsilah anak: gen = gen induk + 1, induk masuk daftar parents. */
export function buildChildLineage(
  parentLineage: LineageNode | null,
  parents: LineageParent[],
  childGen: number,
): LineageNode {
  return { gen: childGen, parents, ancestors: parentLineage ? [parentLineage] : [] };
}

/** Induk pet (kartu hidup/telur Album) → entri silsilah. */
export function petToLineageParent(pet: PetData, livedDays: number): LineageParent {
  return {
    name: pet.name,
    element: pet.element,
    path: pet.path,
    coatColor: pet.coatColor,
    livedDays,
    careScore: Math.round(pet.careScore),
  };
}

/** Kumpulkan silsilah maks 3 generasi (Doc 07 §4: parents + ancestors rekursif). */
export function lineageGenerations(node: LineageNode, maxGenerations = 3): LineageParent[][] {
  const generations: LineageParent[][] = [];
  let current: LineageNode | undefined = node;
  while (current && generations.length < maxGenerations) {
    generations.push(current.parents);
    current = current.ancestors[0];
  }
  return generations;
}

// ===== Warisan (Doc 07 §5) =====

/**
 * Koin kenangan: 100 + 10×(livedDays − 30), maks 600 (Doc 07 §5),
 * dikali bonus generasi +10%/gen kumulatif maks +50% (Doc 07 §4).
 */
export function computeLegacyCoins(livedDays: number, gen: number): number {
  const base = Math.min(
    LEGACY.memoryCoinMax,
    LEGACY.memoryCoinBase + LEGACY.memoryCoinPerDayOver30 * Math.max(0, livedDays - 30),
  );
  const genBonusPct = Math.min(
    LEGACY.generationBonusMaxPct,
    LEGACY.generationBonusPctPerGen * Math.max(0, gen - 1),
  );
  return Math.floor(base * (1 + genBonusPct / 100));
}

/** Bangun telur keturunan dari hasil breeding (inkubasi di altar — Doc 07 §2A). */
export function createBreedingEgg(
  genetics: ChildGenetics,
  parents: LineageParent[],
  childGen: number,
  nowMs: number,
  bonusPoints = 0,
): BreedingEgg {
  return {
    createdAt: nowMs,
    element: genetics.element,
    coatColor: genetics.coatColor,
    personalityElement: genetics.personalityElement,
    startBonusPct: genetics.startBonusPct,
    bonusPoints,
    gen: childGen,
    parents,
  };
}

/** Nama default anak: nama induk + angka romawi generasi (garis keluarga). */
export function childDefaultName(parentName: string, gen: number): string {
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const suffix = ROMAN[gen] ?? String(gen);
  return `${parentName} ${suffix}`.trim().slice(0, 12);
}

/** Kunci tabel mix selalu alfabetis "a+b" (konsistensi Doc 07 §3). */
export const breedingMixKey = mixKey;

