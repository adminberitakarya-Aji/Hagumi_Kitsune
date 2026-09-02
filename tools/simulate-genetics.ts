/**
 * DoD M7 — Simulasi genetika breeding (ROADMAP M7 §DoD, Doc 07 §3).
 * Jalankan: pnpm simulate:genetics  → distribusi 1000 pasangan induk×mitra.
 * Memverifikasi:
 *  1. Distribusi sumber elemen ≈ 70% induk / 25% mix / 5% mutasi mystic
 *  2. Semua elemen anak valid; warna coat selalu hex #RRGGBB
 *  3. Bonus stat awal 1–5%; induk elite selalu 5%
 *  4. Warna anak = mix HSV induk (tidak pernah keluar ruang hex)
 */
import {
  ELEMENT_COAT,
  SeededRng,
  computeChildGenetics,
  previewChildCoat,
  rollDailyPartners,
  type NpcPartner,
  type PetData,
} from "@hagumi/core";
import { MS_PER_DAY } from "@hagumi/core";

const TOTAL = 1000;
const NOW = 1_735_000_000_000;

const PARENTS: PetData[] = (["fire", "water", "wind", "earth"] as const).map((element, i) => ({
  name: `Induk${i + 1}`,
  element,
  birthAt: NOW - 40 * MS_PER_DAY,
  stage: "adult",
  state: "idle",
  stats: { hunger: 80, happiness: 85, energy: 80, hygiene: 75, health: 95 },
  careScore: i % 2 === 0 ? 85 : 55, // setengah elite (bonus 5%), setengah normal (1–4%)
  careHistory: [],
  recoverSince: null,
  tails: 3,
  path: "biasa",
  sickSince: null,
  lastPoopAt: null,
  poopCount: 0,
  lastCuredAt: 0,
  memoryLog: [],
}));

function partnerFor(i: number): NpcPartner {
  const day = new Date(NOW + i * MS_PER_DAY).toISOString().split("T")[0] ?? "1970-01-01";
  return rollDailyPartners(day)[i % 3]!;
}

const sourceTally = new Map<string, number>();
const elementTally = new Map<string, number>();
const bonusTally = new Map<number, number>();
let invalid = 0;
let eliteWrong = 0;

for (let i = 0; i < TOTAL; i++) {
  const parent = PARENTS[i % PARENTS.length]!;
  const partner = partnerFor(i);
  const g = computeChildGenetics({ parent, partner, rng: new SeededRng(i * 13 + 5) });
  sourceTally.set(g.source, (sourceTally.get(g.source) ?? 0) + 1);
  elementTally.set(g.element, (elementTally.get(g.element) ?? 0) + 1);
  bonusTally.set(g.startBonusPct, (bonusTally.get(g.startBonusPct) ?? 0) + 1);
  if (!/^#[0-9A-Fa-f]{6}$/.test(g.coatColor)) invalid++;
  if (parent.careScore >= 80 && g.startBonusPct !== 5) eliteWrong++;
  if (g.startBonusPct < 1 || g.startBonusPct > 5) invalid++;
  // preview deterministik harus cocok dengan warna valid
  if (!/^#[0-9A-Fa-f]{6}$/.test(previewChildCoat(parent, partner))) invalid++;
}

console.log(`=== HAGUMI DoD M7 — distribusi genetika ${TOTAL} breeding ===`);
console.log(`\nSumber elemen anak (target 70/25/5):`);
for (const [source, count] of [...sourceTally.entries()].sort()) {
  const bar = "█".repeat(Math.round((count / TOTAL) * 40));
  console.log(`  ${source.padEnd(9)} ${String(count).padStart(4)} (${((count / TOTAL) * 100).toFixed(1)}%) ${bar}`);
}
console.log(`\nElemen anak:`);
for (const [element, count] of [...elementTally.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${element.padEnd(7)} ${String(count).padStart(4)} (${((count / TOTAL) * 100).toFixed(1)}%)`);
}
console.log(`\nBonus stat awal (%):`);
for (const [pct, count] of [...bonusTally.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  +${pct}%: ${count}`);
}
console.log(`\nPalet dasar elemen (ELEMENT_COAT): ${Object.values(ELEMENT_COAT).join(" ")}`);

const parentLike = (sourceTally.get("parent") ?? 0) + (sourceTally.get("partner") ?? 0);
const mix = sourceTally.get("mix") ?? 0;
const mystic = sourceTally.get("mutation") ?? 0;
const fail =
  parentLike / TOTAL < 0.64 || parentLike / TOTAL > 0.76 ||
  mix / TOTAL < 0.19 || mix / TOTAL > 0.31 ||
  mystic / TOTAL < 0.02 || mystic / TOTAL > 0.09 ||
  invalid > 0 || eliteWrong > 0;

if (fail) {
  console.log(`\n❌ GAGAL: distribusi di luar toleransi / ${invalid} nilai invalid / ${eliteWrong} elite salah`);
  process.exit(1);
}
console.log(`\n✅ LULUS: distribusi 70/25/5 masuk toleransi, semua genetika valid.`);
