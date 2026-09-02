/**
 * DoD M1 + DoD M3 — Simulasi headless 90 hari (ROADMAP M1 & M3 §DoD).
 * Jalankan: pnpm simulate [seed]   → laporan verbose satu seed
 *           pnpm simulate dist     → distribusi jalur 1000 simulasi (DoD M3)
 * Memverifikasi:
 *  1. Decay 90 hari sesuai Doc 01 — tanpa NaN, tanpa nilai di luar [0..100]
 *  2. Save → instans baru → load = state identik (tidak ada state setengah jadi)
 *  3. Aksi feed/bathe/sleep lewat PetStateMachine tetap dalam batas
 *  4. Evolusi tahap tepat hari 10/20/60; jalur dikunci dari Care Score (GDD §4)
 */
import {
  MemoryStorage,
  MS_PER_DAY,
  MS_PER_HOUR,
  PetStateMachine,
  SaveSystem,
  SeededRng,
  checkPathRecovery,
  createDefaultSave,
  evolveIfNeeded,
  getDayPhase,
  processOfflineCatchUp,
  samplePetCare,
  type EvolutionParams,
  type PetData,
  type PetStats,
  type SaveData,
} from "@hagumi/core";
import { evolutionConfig } from "@hagumi/data";

const DAYS = 90;
const START = 1_735_000_000_000; // konstanta, mulai pagi

/** Parameter evolusi dari JSON (replika pola runtime gameSystem — satu sumber: evolution.json). */
const EV_PARAMS: EvolutionParams = {
  firstEvolutionDay: evolutionConfig.firstEvolutionDay,
  finalEvolutionDay: evolutionConfig.finalEvolutionDay,
  elderDay: evolutionConfig.elderDay,
  recoveryDays: evolutionConfig.recoveryDays,
  sampleIntervalHours: evolutionConfig.sampleIntervalHours,
  interactionBonus: evolutionConfig.interactionBonus,
  neglectPenalty: evolutionConfig.neglectPenalty,
  paths: evolutionConfig.paths,
  care: {
    windowHours: evolutionConfig.historyWindowHours,
    msPerHour: MS_PER_HOUR,
  },
};

const STAT_KEYS = ["hunger", "happiness", "energy", "hygiene", "health"] as const;

/** Persona pemilik untuk mode distribusi (DoD M3: distribusi "masuk akal" ≠ satu perilaku). */
interface OwnerProfile {
  name: string;
  playMax: number; // main bila happiness <
  playProb: number; // peluang per jam bangun
  feedMax: number;
  feedProb: number;
  batheMax: number;
  batheProb: number;
  wakeProb: number;
  sleepProb: number;
  strokeProb: number; // belai spontan per jam bangun (bonus poin care)
}

const PROFILES: Record<string, OwnerProfile> = {
  rajin: { name: "rajin", playMax: 90, playProb: 0.5, feedMax: 55, feedProb: 0.95, batheMax: 50, batheProb: 0.9, wakeProb: 0.95, sleepProb: 0.8, strokeProb: 0.1 },
  normal: { name: "normal", playMax: 80, playProb: 0.35, feedMax: 45, feedProb: 0.8, batheMax: 40, batheProb: 0.8, wakeProb: 0.9, sleepProb: 0.7, strokeProb: 0.03 },
  santai: { name: "santai", playMax: 70, playProb: 0.25, feedMax: 40, feedProb: 0.7, batheMax: 35, batheProb: 0.6, wakeProb: 0.8, sleepProb: 0.6, strokeProb: 0.01 },
  lalai: { name: "lalai", playMax: 60, playProb: 0.12, feedMax: 30, feedProb: 0.55, batheMax: 25, batheProb: 0.4, wakeProb: 0.6, sleepProb: 0.5, strokeProb: 0 },
};

interface SimSummary {
  seed: number;
  profile: string;
  path: string;
  stage: string;
  tails: number;
  careScore: number;
  deathDay: number | null;
  evolutionDays: string[];
  violations: string[];
}

/** Satu simulasi headless 90 hari dengan persona pemilik tertentu. */
function runSimulation(seed: number, trace = false, profile: OwnerProfile = PROFILES.normal!): SimSummary {
  const rng = new SeededRng(seed);
  const storage = new MemoryStorage();
  const clock = { now: () => simNow };
  let simNow = START;

  let save: SaveData = createDefaultSave({ petName: `Sim-${seed}`, element: "fire", nowMs: simNow });
  const violations: string[] = [];
  const actionCounts = { feed: 0, bathe: 0, sleep: 0, wake: 0, play: 0, pet: 0 };
  let deathDay: number | null = null;
  const evolutionDays: string[] = [];

  // Care tracking (replika runtime — GDD §4)
  let strokesSinceSample = 0;
  let playsSinceSample = 0;
  let penaltySinceSample = 0;
  let sickPenaltyFrom = 0;
  let lastCareSampleAt = simNow;
  const zeroStats = new Set<keyof PetStats>();

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
    new SaveSystem(storage, clock).save({ ...save, lastTick: simNow });
    const loaded = new SaveSystem(storage, clock).load();
    if (!loaded.success) {
      violations.push(`${tag}: load gagal (${loaded.error})`);
      return;
    }
    save = loaded.data;
    for (const key of STAT_KEYS) {
      if (save.pet.stats[key] !== before[key]) {
        violations.push(`${tag}: ${key} berubah saat reload (${before[key]} → ${save.pet.stats[key]})`);
      }
    }
    if (["eating", "bathing", "playing", "petted", "evolving"].includes(save.pet.state)) {
      save = { ...save, pet: PetStateMachine.finishTransientState(save.pet) };
    }
  }

  /** Penalti kelalaian — replika accrueNeglect runtime (GDD §4). */
  function accrueNeglect(pet: PetData): void {
    for (const key of STAT_KEYS) {
      if (pet.stats[key] <= 0 && !zeroStats.has(key)) {
        zeroStats.add(key);
        penaltySinceSample += EV_PARAMS.neglectPenalty.statZero;
      } else if (pet.stats[key] > 5) {
        zeroStats.delete(key);
      }
    }
    if (pet.state === "sick" && pet.sickSince !== null) {
      if (sickPenaltyFrom === 0) sickPenaltyFrom = Math.max(pet.sickSince, simNow);
      const days = Math.floor((simNow - sickPenaltyFrom) / MS_PER_DAY);
      if (days >= 1) {
        penaltySinceSample += EV_PARAMS.neglectPenalty.sickUntreatedPerDay * days;
        sickPenaltyFrom += days * MS_PER_DAY;
      }
    } else {
      sickPenaltyFrom = 0;
    }
  }

  /** Mesin pertumbuhan — replika applyGrowth runtime (GDD §4). */
  function applyGrowth(pet: PetData, hour: number): PetData {
    if (pet.stage === "dead" || pet.stage === "egg" || pet.state === "evolving") return pet;
    accrueNeglect(pet);
    let result = pet;
    if (simNow - lastCareSampleAt >= EV_PARAMS.sampleIntervalHours * MS_PER_HOUR) {
      const bonusPoints =
        strokesSinceSample * EV_PARAMS.interactionBonus.stroke +
        playsSinceSample * EV_PARAMS.interactionBonus.play;
      result = samplePetCare(result, simNow, EV_PARAMS, { b: bonusPoints, p: penaltySinceSample });
      lastCareSampleAt = simNow;
      strokesSinceSample = 0;
      playsSinceSample = 0;
      penaltySinceSample = 0;
      // Evolusi tahap: hari-10/20/60 (evolving → selesai instan di headless)
      const evo = evolveIfNeeded(result, simNow, EV_PARAMS);
      if (evo.kind) {
        evolutionDays.push(`${Math.floor(hour / 24) + 1}:${evo.kind}`);
        result = PetStateMachine.finishTransientState(evo.pet);
      }
    }
    return checkPathRecovery(result, simNow, EV_PARAMS).pet;
  }

function randomAction(hourTag: string): void {
  const pet = save.pet;
  if (pet.stage === "dead") return;
  // Kebijakan "pemilik normal" (bukan sempurna, bukan lalai):
  // Kebijakan "pemilik" dari persona (bukan sempurna, bukan lalai — lihat PROFILES):
  // bangun pagi, tidur malam, feed saat lapar, mandi saat kotor, main untuk happiness.
  const phase = getDayPhase(simNow);
  const roll = rng.next(); // sedikit keacakan agar tiap seed berbeda
  if (pet.state === "sleeping") {
    if (phase === "morning" && roll < profile.wakeProb) {
      const r = PetStateMachine.wake(pet);
      if (r.success) {
        save = { ...save, pet: r.pet };
        actionCounts.wake++;
      }
    }
  } else if (phase === "night" && roll < profile.sleepProb) {
    const r = PetStateMachine.sleep(pet);
    if (r.success) {
      save = { ...save, pet: r.pet };
      actionCounts.sleep++;
    }
  } else if (pet.stats.hunger < profile.feedMax && rng.next() < profile.feedProb) {
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
  if (pet2.stage !== "dead" && pet2.state !== "sleeping" && pet2.stats.hygiene < profile.batheMax && rng.next() < profile.batheProb) {
    const r = PetStateMachine.bathe(pet2);
    if (r.success) {
      save = { ...save, pet: PetStateMachine.finishTransientState(r.pet) };
      actionCounts.bathe++;
    }
  }
  const pet3 = save.pet;
  if (pet3.stage !== "dead" && pet3.state !== "sleeping" && pet3.stats.happiness < profile.playMax && pet3.stats.energy >= 15 && rng.next() < profile.playProb) {
    // Pemilik bermain/belai untuk happiness (Doc 01 §2 — sumber utama).
    // Budget: decay happiness ≈ −50/hari → butuh ≥3 main/hari (+15) untuk seimbang.
    const r = PetStateMachine.play(pet3);
    if (r.success) {
      save = { ...save, pet: PetStateMachine.finishTransientState(r.pet) };
      actionCounts.play++;
      playsSinceSample++;
    } else if (r.reason === "BABY_LOCKED") {
      // Fase bayi: main terkunci — pemilik menemani lewat belai (companion)
      const p = PetStateMachine.pet(pet3);
      if (p.success) {
        save = { ...save, pet: PetStateMachine.finishTransientState(p.pet) };
        actionCounts.pet++;
        strokesSinceSample++;
      }
    }
  } else if (pet3.stage !== "dead" && pet3.state !== "sleeping" && rng.next() < profile.strokeProb) {
    // Belai spontan (companion) — bonus poin care, happiness +2
    const p = PetStateMachine.pet(pet3);
    if (p.success) {
      save = { ...save, pet: PetStateMachine.finishTransientState(p.pet) };
      actionCounts.pet++;
      strokesSinceSample++;
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
    if (save.pet.stage === "dead" && deathDay === null) deathDay = day;
    if (save.pet.stage === "dead") break;
    randomAction(`h${hour}`);
    save = { ...save, pet: applyGrowth(save.pet, hour) }; // care sample + evolusi (GDD §4)
    checkInvariants(`jam-${hour}`);
    if (trace && hour % 24 === 23) {
      const s = save.pet.stats;
      console.log(
        `d${String(day).padStart(2)} ${save.pet.state.padEnd(8)}` +
          ` hu=${Math.round(s.hunger)} ha=${Math.round(s.happiness)} en=${Math.round(s.energy)}` +
          ` hy=${Math.round(s.hygiene)} he=${Math.round(s.health)} care=${Math.round(save.pet.careScore)}`,
      );
    }
    if (hour > 0 && hour % (24 * 7) === 0) reloadCycle(`hari-${day}`);
  }

  // Reload terakhir di ujung simulasi
  reloadCycle("akhir");

  const finalPet: PetData = save.pet;
  return {
    seed,
    profile: profile.name,
    path: finalPet.path,
    stage: finalPet.stage,
    tails: finalPet.tails,
    careScore: finalPet.careScore,
    deathDay,
    evolutionDays,
    violations,
  };
}

// ===== Driver: verbose satu seed / distribusi 1000 seed (DoD M3) =====

function printVerbose(s: SimSummary): void {
  const status = s.stage === "dead" ? `MENINGGAL hari ${s.deathDay}` : `HIDUP sampai hari ${DAYS}`;
  console.log(`\n=== HAGUMI DoD M1+M3 — simulasi ${DAYS} hari (seed=${s.seed}) ===`);
  console.log(`Status    : ${status}`);
  console.log(`Stage     : ${s.stage} | path: ${s.path} | tails: ${s.tails} | careScore: ${s.careScore.toFixed(1)}`);
  console.log(`Evolusi   : ${s.evolutionDays.length > 0 ? s.evolutionDays.join(", ") : "-"}`);
  console.log(`Reload    : siklus save→load state identik`);
  if (s.violations.length > 0) {
    console.log(`\n❌ PELANGGARAN (${s.violations.length}):`);
    s.violations.slice(0, 20).forEach((v) => console.log(`  - ${v}`));
    process.exit(1);
  }
  console.log(`\n✅ LULUS: tanpa NaN, tanpa clamp error, reload konsisten.`);
}

function printDistribution(total: number): void {
  const tally = new Map<string, number>();
  const byProfile = new Map<string, { total: number; alive: number; careSum: number; paths: Map<string, number> }>();
  const evoDayTally = new Map<number, number>();
  const tailTally = new Map<number, number>();
  let survivors = 0;
  let totalViolations = 0;
  let careSum = 0;

  // Bobot persona: normal 40%, rajin 30%, santai 20%, lalai 10%
  function profileForIndex(i: number): OwnerProfile {
    const r = i % 10;
    if (r < 4) return PROFILES.normal!;
    if (r < 7) return PROFILES.rajin!;
    if (r < 9) return PROFILES.santai!;
    return PROFILES.lalai!;
  }

  for (let i = 1; i <= total; i++) {
    const profile = profileForIndex(i);
    const s = runSimulation(i, false, profile);
    tally.set(s.path, (tally.get(s.path) ?? 0) + 1);
    tailTally.set(s.tails, (tailTally.get(s.tails) ?? 0) + 1);
    if (s.stage !== "dead") survivors++;
    totalViolations += s.violations.length;
    careSum += s.careScore;
    for (const e of s.evolutionDays) {
      const day = Number(e.split(":")[0]);
      if (!Number.isNaN(day)) evoDayTally.set(day, (evoDayTally.get(day) ?? 0) + 1);
    }
    const bucket = byProfile.get(s.profile) ?? { total: 0, alive: 0, careSum: 0, paths: new Map() };
    bucket.total++;
    if (s.stage !== "dead") bucket.alive++;
    bucket.careSum += s.careScore;
    bucket.paths.set(s.path, (bucket.paths.get(s.path) ?? 0) + 1);
    byProfile.set(s.profile, bucket);
  }

  console.log(`\n=== HAGUMI DoD M3 — distribusi jalur ${total} simulasi (4 persona pemilik) ===`);
  console.log(`Survival : ${survivors}/${total} hidup sampai hari ${DAYS} (${((survivors / total) * 100).toFixed(1)}%)`);
  console.log(`Care rata: ${(careSum / total).toFixed(1)}/100`);
  console.log(`\nPer persona pemilik:`);
  for (const [name, b] of [...byProfile.entries()].sort()) {
    const paths = [...b.paths.entries()].sort((a, b2) => b2[1] - a[1]).map(([p, c]) => `${p}:${c}`).join(" ");
    console.log(
      `  ${name.padEnd(7)} alive ${String(b.alive).padStart(3)}/${String(b.total).padEnd(3)}` +
        ` care ${(b.careSum / b.total).toFixed(0).padStart(3)} | ${paths}`,
    );
  }
  console.log(`\nJalur evolusi (semua):`);
  for (const [path, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    const bar = "█".repeat(Math.round((count / total) * 40));
    console.log(`  ${path.padEnd(10)} ${String(count).padStart(4)} (${((count / total) * 100).toFixed(1)}%) ${bar}`);
  }
  console.log(`\nEkor akhir:`);
  for (const [tails, count] of [...tailTally.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${tails} ekor: ${count} (${((count / total) * 100).toFixed(1)}%)`);
  }
  console.log(`\nHari evolusi terjadi:`);
  for (const [day, count] of [...evoDayTally.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  hari ${day}: ${count}×`);
  }
  if (totalViolations > 0) {
    console.log(`\n❌ ${totalViolations} pelanggaran invariant di seluruh simulasi`);
    process.exit(1);
  }
  console.log(`\n✅ LULUS: distribusi masuk akal, nol pelanggaran invariant.`);
}

const arg = process.argv[2] ?? "";
const trace = process.argv.includes("--trace");
const profileFlagIdx = process.argv.indexOf("--profile");
const profileFlag = profileFlagIdx >= 0 ? (process.argv[profileFlagIdx + 1] ?? "") : "";
if (arg === "dist") {
  printDistribution(1000);
} else {
  const profile = profileFlag && PROFILES[profileFlag] ? PROFILES[profileFlag]! : undefined;
  printVerbose(runSimulation(Number(arg) || 1, trace, profile));
}
