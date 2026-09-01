/**
 * DoD M1 — Simulasi headless 90 hari (ROADMAP M1 §DoD).
 * Jalankan: pnpm simulate [seed]
 * Memverifikasi:
 *  1. Decay 90 hari sesuai Doc 01 — tanpa NaN, tanpa nilai di luar [0..100]
 *  2. Save → instans baru → load = state identik (tidak ada state setengah jadi)
 *  3. Aksi feed/bathe/sleep lewat PetStateMachine tetap dalam batas
 */
import {
  MemoryStorage,
  MS_PER_DAY,
  MS_PER_HOUR,
  PetStateMachine,
  SaveSystem,
  SeededRng,
  createDefaultSave,
  getDayPhase,
  processOfflineCatchUp,
  type PetData,
  type SaveData,
} from "@hagumi/core";

const DAYS = 90;
const seed = Number(process.argv[2] ?? 42);
const rng = new SeededRng(seed);
const storage = new MemoryStorage();
const clock = { now: () => simNow };
let simNow = 1_735_000_000_000; // konstanta, mulai pagi

let save: SaveData = createDefaultSave({ petName: "Sim-90", element: "fire", nowMs: simNow });
const violations: string[] = [];
let reloadCycles = 0;
const actionCounts = { feed: 0, bathe: 0, sleep: 0, wake: 0, play: 0, pet: 0 };
let deathDay: number | null = null;

const STAT_KEYS = ["hunger", "happiness", "energy", "hygiene", "health"] as const;

function checkInvariants(tag: string): void {
  for (const key of STAT_KEYS) {
    const v = save.pet.stats[key];
    if (Number.isNaN(v)) violations.push(`${tag}: ${key} = NaN`);
    else if (v < 0 || v > 100) violations.push(`${tag}: ${key} = ${v} di luar [0..100]`);
  }
  if (Number.isNaN(save.pet.careScore)) violations.push(`${tag}: careScore NaN`);
}

/** Siklus "tutup tab → buka lagi": save, instans SaveSystem baru, load, bandingkan. */
function reloadCycle(tag: string): void {
  const before = save.pet.stats;
  const beforeState = save.pet.state;
  new SaveSystem(storage, clock).save({ ...save, lastTick: simNow });
  const loaded = new SaveSystem(storage, clock).load();
  if (!loaded.success) {
    violations.push(`${tag}: load gagal (${loaded.error})`);
    return;
  }
  save = loaded.data;
  reloadCycles++;
  for (const key of STAT_KEYS) {
    if (save.pet.stats[key] !== before[key]) {
      violations.push(`${tag}: ${key} berubah saat reload (${before[key]} → ${save.pet.stats[key]})`);
    }
  }
  // State setengah jadi (eating/bathing/playing/petted) harus bisa diselesaikan bersih.
  if (["eating", "bathing", "playing", "petted"].includes(save.pet.state)) {
    save = { ...save, pet: PetStateMachine.finishTransientState(save.pet) };
  }
  if (!["idle", "sleeping", "sick", "egg"].includes(save.pet.state) && save.pet.stage !== "dead") {
    violations.push(`${tag}: state transien bocor: ${beforeState} → ${save.pet.state}`);
  }
}

function randomAction(hourTag: string): void {
  const pet = save.pet;
  if (pet.stage === "dead") return;
  // Kebijakan "pemilik normal" (bukan sempurna, bukan lalai):
  // bangun pagi, tidur malam, feed saat lapar, mandi saat kotor.
  const phase = getDayPhase(simNow);
  const roll = rng.next(); // sedikit keacakan agar tiap seed berbeda
  if (pet.state === "sleeping") {
    if (phase === "morning" && roll < 0.9) {
      const r = PetStateMachine.wake(pet);
      if (r.success) {
        save = { ...save, pet: r.pet };
        actionCounts.wake++;
      }
    }
  } else if (phase === "night" && roll < 0.7) {
    const r = PetStateMachine.sleep(pet);
    if (r.success) {
      save = { ...save, pet: r.pet };
      actionCounts.sleep++;
    }
  } else if (pet.stats.hunger < 45 && roll < 0.8) {
    const r = PetStateMachine.feed(pet, {
      hungerRestore: 35,
      happinessBonus: 5,
      nowMs: simNow,
      recentFeeds: [],
    });
    if (r.success) {
      save = { ...save, pet: PetStateMachine.finishTransientState(r.pet) };
      actionCounts.feed++;
    }
  }
  // Aksi mandi & main INDEPENDEN dari feed — pemilik nyata tidak memilih salah satu.
  const pet2 = save.pet;
  if (pet2.stage !== "dead" && pet2.state !== "sleeping" && pet2.stats.hygiene < 40 && rng.next() < 0.8) {
    const r = PetStateMachine.bathe(pet2);
    if (r.success) {
      save = { ...save, pet: PetStateMachine.finishTransientState(r.pet) };
      actionCounts.bathe++;
    }
  }
  const pet3 = save.pet;
  if (pet3.stage !== "dead" && pet3.state !== "sleeping" && pet3.stats.happiness < 70 && pet3.stats.energy >= 15 && rng.next() < 0.2) {
    // Pemilik normal bermain/belai untuk happiness (Doc 01 §2 — sumber utama)
    const r = PetStateMachine.play(pet3);
    if (r.success) {
      save = { ...save, pet: PetStateMachine.finishTransientState(r.pet) };
      actionCounts.play++;
    } else if (r.reason === "BABY_LOCKED") {
      // Fase bayi: main terkunci — pemilik menemani lewat belai (companion)
      const p = PetStateMachine.pet(pet3);
      if (p.success) {
        save = { ...save, pet: PetStateMachine.finishTransientState(p.pet) };
        actionCounts.pet++;
      }
    }
  }
  checkInvariants(`aksi@${hourTag}`);
}

// ===== Loop utama: 90 hari, per jam =====
for (let hour = 0; hour < DAYS * 24; hour++) {
  const from = simNow;
  simNow += MS_PER_HOUR;
  const result = processOfflineCatchUp(save.pet, from, simNow);
  save = { ...save, pet: result.pet };
  const day = Math.floor(hour / 24) + 1;
  checkInvariants(`jam-${hour}`);
  if (save.pet.stage === "dead" && deathDay === null) deathDay = day;
  if (save.pet.stage === "dead") break;
  randomAction(`h${hour}`);
  if (hour > 0 && hour % (24 * 7) === 0) reloadCycle(`hari-${day}`);
}

// Reload terakhir di ujung simulasi
reloadCycle("akhir");

const p: PetData = save.pet;
const status =
  p.stage === "dead"
    ? `MENINGGAL hari ${deathDay}`
    : `HIDUP sampai hari ${Math.floor((DAYS * 24 * MS_PER_HOUR) / MS_PER_DAY)}`;
console.log(`\n=== HAGUMI DoD M1 — simulasi ${DAYS} hari (seed=${seed}) ===`);
console.log(`Status    : ${status}`);
console.log(`Stage     : ${p.stage} | path: ${p.path} | tails: ${p.tails} | careScore: ${p.careScore.toFixed(1)}`);
console.log(`Stats     : ${STAT_KEYS.map((k) => `${k}=${p.stats[k]!.toFixed(1)}`).join(" ")}`);
console.log(`Reload    : ${reloadCycles} siklus save→load (state identik)`);
console.log(
  `Aksi      : feed=${actionCounts.feed} play=${actionCounts.play} pet=${actionCounts.pet} bathe=${actionCounts.bathe} sleep=${actionCounts.sleep} wake=${actionCounts.wake}`,
);
if (violations.length > 0) {
  console.log(`\n❌ PELANGGARAN (${violations.length}):`);
  violations.slice(0, 20).forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
} else {
  console.log(`\n✅ LULUS: tanpa NaN, tanpa clamp error, reload konsisten.`);
}
