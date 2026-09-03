/**
 * Game runtime (M1 Fase C) — jembatan EventBus → @hagumi/core (Doc 09 §2 aturan 3: one-way data).
 * SATU-SATUNYA tempat stat pet berubah di sisi web: aksi lewat PetStateMachine,
 * persistensi lewat SaveSystem. React & Phaser tidak pernah menyentuh core langsung.
 */
import {
  MathRng,
  MAX_BREEDING_REQUESTS_PER_DAY,
  MemoryStorage,
  MS_PER_DAY,
  MS_PER_HOUR,
  OfflineLlmProvider,
  PetStateMachine,
  addMemory,
  breedingCodePayloadOf,
  calculateMinigameReward,
  canPlayMinigame,
  chatQuotaLeft,
  clampStats,
  computeOnlineChildGenetics,
  decodeBreedingCode,
  DialogueEngine,
  diffSaves,
  encodeBreedingCode,
  findPendingMemory,
  forgiveNeglectMemories,
  getDayPhase,
  getSeason,
  getSeasonEvent,
  hasUnforgivenNeglect,
  markMemorySpoken,
  resolveLastWriteWins,
  rollChatQuotaDay,
  reactionFor,
  saveDataSchemaV2,
  SaveSystem,
  SystemClock,
  checkPathRecovery,
  checkBreedingRequirements,
  childDefaultName,
  coatColorOf,
  computeChildGenetics,
  computeLegacyCoins,
  cooldownRemainingMs,
  createBreedingEgg,
  createDefaultSave,
  evolveIfNeeded,
  lineageGenerations,
  petToLineageParent,
  previewChildCoat,
  previewChildElement,
  processOfflineCatchUp,
  rollDailyPartners,
  samplePetCare,
  shouldSpawnPoop,
  spawnPoop,
  scoopPoop,
  updateLoginStreak,
  type ActionRejectReason,
  type BreedingCodePayload,
  type ChatContext,
  type ChatPools,
  type ChatReply,
  type DayPhase,
  type EvolutionParams,
  type PetData,
  type PetElement,
  type PetStats,
  type SaveData,
} from "@hagumi/core";
import type { ChatMessageUi, LegacyUi, OnlineRequestUi } from "../store/gameState";
import { breedingConfig, evolutionConfig, getDialogConfig, getItemById, minigamesConfig, getMinigameById, getStageRule, rulesConfig } from "@hagumi/data"; // katalog asli M2/M3/M4 (fail-fast JSON)
import { eventBus } from "../lib/eventBus";
import { getGameState, setUiState } from "../store/gameState";
import { pushToast } from "../store/toastStore";
import { WebStorage } from "./webStorage";
import { bumpSentToday, getAccessToken, getCachedUserId, ensureAuthUserId, getOnlineConfig, getOrCreateAnonId, onlineApi, readSentToday, type InboxResponse } from "./onlineClient";
import { audioEngine } from "./audioEngine";
import { webNotifier } from "./webNotifier";
import { EdgeLlmProvider, FallbackLlmProvider } from "@hagumi/llm";

/** Terapkan flag audio dari save ke AudioEngine (M5 — Doc 10 §5). */
function applyAudioSettings(s: { music: boolean; sfx: boolean }): void {
  audioEngine.setMusicEnabled(s.music);
  audioEngine.setSfxEnabled(s.sfx);
}

const REJECT_TEXT: Record<ActionRejectReason, string> = {
  TOO_FULL: "Mou kenyang... 🍙",
  TOO_TIRED: "Terlalu lelah...",
  ALREADY_SLEEPING: "Zzz...",
  NOT_SLEEPING: "Aku tidak tidur kok",
  IS_DEAD: "...",
  IS_SICK: "Aku sedang sakit...",
  IS_BUSY: "Tunggu sebentar ya",
  IS_EGG: "Masih telur!",
  BABY_LOCKED: "Terlalu kecil untuk itu",
  NOT_SICK: "Aku sehat kok",
  ALREADY_CLEAN: "Aku sudah wangi!",
  ON_COOLDOWN: "Obat belum boleh diminum lagi...",
  INVALID_STATE: "...",
};

const PAT_LINES = ["Kyuu~!", "Laper...", "Main yuk!", "Ehehe~", "Hari ini cerah, ya!"];

const UNSCRIPTED: Record<string, string> = {
  "door-garden": "⛩️ Taman",
  "door-kitchen": "🍵 Dapur (scene)",
};

/** Sapaan pertama sesuai kepribadian elemen (Doc 01 §4, Doc 04 §4.4). */
const FIRST_GREETING: Record<PetElement, string> = {
  fire: "Otta! Kamu master-ku? Menarik!",
  water: "Kyuu~ senang bertemu mu...",
  wind: "Kyaa! Yuk main sekarang!",
  earth: "Kyuun~ aku merasa tenang di sini",
  mystic: "...Kau dapat melihatku?",
};

/** Parameter evolusi dari evolution.json (sumber angka M3 — GDD §4, Doc 01 §3–4). */
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

/** Balon bicara setelah cutscene evolusi ditutup (Doc 12 §11.3). */
const EVOLVE_LINES = {
  first: "Aku tumbuh! Ekor baruku, lihat!",
  final: "Jalurku telah ditentukan...",
  elder: "Tubuhku menua, tapi hatiku tetap muda~",
} as const;

/** M5 — musik ambient: track mengikuti musim kalender + siang/malam (Doc 10 §5). */
function startAmbientMusic(): void {
  if (!getGameState().hasSave) return;
  const now = getGameState().nowMs;
  const season = getSeason(now);
  const night = getDayPhase(now) === "night";
  audioEngine.playMusic(`music_${season}${night ? "_night" : ""}`);
}

/** Baris inbox server → kartu UI (outgoing pending belum punya gen mitra). */
function toRequestUi(
  r: InboxResponse["requests"][number],
  claimed: Set<string>,
): OnlineRequestUi | null {
  if (claimed.has(r.id)) return null;
  if (r.status !== "pending" && r.status !== "ready") return null;
  const p = r.partner as Record<string, unknown> | null;
  if (!p || typeof p.name !== "string") {
    if (r.direction === "outgoing" && r.status === "pending") {
      return {
        id: r.id,
        status: "pending",
        direction: "outgoing",
        partnerName: "(menunggu mitra)",
        partnerElement: "",
        partnerCoat: "",
        partnerGen: 0,
        createdAt: r.createdAt,
      };
    }
    return null;
  }
  return {
    id: r.id,
    status: r.status,
    direction: r.direction,
    partnerName: String(p.name),
    partnerElement: String(p.element ?? ""),
    partnerCoat: String(p.coatColor ?? "#888888"),
    partnerGen: Number(p.gen ?? 1),
    createdAt: r.createdAt,
  };
}

class GameRuntime {
  private readonly saveSystem: SaveSystem;
  /** null = belum ada save (onboarding berjalan — Doc 04 §6: save dibuat tepat setelah menetas). */
  private saveData: SaveData | null = null;
  /** Ada save valid → Splash menampilkan [Lanjutkan] (Doc 04 §1). */
  hasSave = false;
  private recentFeeds: number[] = [];
  /** Jam simulasi (ms) — menyusul waktu nyata; digeser oleh time-lapse debug (Doc 03 §6). */
  private simNow = Date.now();
  private speed: 1 | 10 | 60 | 3600 = 1;
  private ticker: number | null = null;
  private tickCount = 0;
  /** Makan sejak poop terakhir — mempercepat interval poop berikutnya (Doc 12 §3.3). */
  private feedsSincePoop = 0;
  /** Care sampling (M3): waktu sample terakhir + interaksi & penalti sejak sample. */
  private lastCareSampleAt = Date.now();
  private strokesSinceSample = 0;
  private playsSinceSample = 0;
  /** Akumulasi poin penalti kelalaian sejak sample terakhir (GDD §4). */
  private penaltySinceSample = 0;
  /** Stat yang sedang nol — penalti hanya sekali per kejadian, bukan tiap tick. */
  private zeroStats = new Set<keyof PetStats>();
  /** Mulai akumulasi penalti sakit tak diobati (0 = tidak sakit). */
  private sickPenaltyFrom = 0;
  /** Notifikasi lokal (M5): throttle per stat + flag episode sakit. */
  private notifiedAt = new Map<keyof PetStats, number>();
  private sickNotified = false;
  /** M6 — mesin dialog + provider chat Tier 1 (Doc 08, Doc 11 §1–2). */
  private dialogue: DialogueEngine | null = null;
  private dialogueElement: string | null = null;
  private chatProvider: OfflineLlmProvider | null = null;
  private chatProviderElement: string | null = null;
  /** Riwayat pesan layar Chat (Doc 12 §8) — bertahan selama sesi runtime. */
  private chatMessages: ChatMessageUi[] = [];
  /** Lalai yang menunggu dicatat ke memoryLog (di-drain pada tick dialog). */
  private pendingNeglect: Array<{ key: string; detail: string }> = [];
  /** M8 — polling inbox breeding online selama layar Tukar Kode terbuka. */
  private onlinePoll: number | null = null;
  /** M8 — save awan yang menunggu keputusan pemain (diff warning LWW). */
  private cloudRemote: SaveData | null = null;

  constructor() {
    const primary = new SaveSystem(new WebStorage(), new SystemClock());
    const loaded = primary.load();
    if (loaded.success) {
      this.saveSystem = primary;
      this.saveData = loaded.data;
      this.hasSave = true;
      this.bootOfflineCatchUp();
    } else {
      if (loaded.error === "CORRUPTED") pushToast("⚠️ Save lama rusak — mulai pet baru");
      // Storage gagal / belum ada save → onboarding (Doc 04); fallback MemoryStorage
      this.saveSystem = new SaveSystem(new MemoryStorage(), new SystemClock());
    }
  }

  /** Buat save pertama — dipanggil tepat setelah cutscene menetas (Doc 04 §6). */
  startNewGame(petName: string, element: PetElement): void {
    this.saveData = createDefaultSave({ petName, element, nowMs: Date.now() });
    this.simNow = Date.now();
    this.saveData.lastTick = this.simNow;
    this.recentFeeds = [];
    this.lastCareSampleAt = this.simNow;
    this.strokesSinceSample = 0;
    this.playsSinceSample = 0;
    this.penaltySinceSample = 0;
    this.zeroStats.clear();
    this.sickPenaltyFrom = 0;
    this.feedsSincePoop = 0;
    this.hasSave = true;
    this.persist();
    this.sync();
    setUiState({ screen: "home" });
    pushToast(`Selamat datang, ${petName}! 🦊`);
    // Balon sapaan pertama sesuai kepribadian elemen (Doc 04 §4.4)
    eventBus.emit("pet/say", { text: FIRST_GREETING[element] });
    this.checkLoginStreak();
  }

  /** Offline catch-up saat buka game + layar ringkasan (Doc 03 §2, Doc 12 §11.1). */
  private bootOfflineCatchUp(): void {
    const save = this.saveData;
    if (!save) return;
    const now = Date.now();
    const result = processOfflineCatchUp(save.pet, save.lastTick, now);
    this.saveData = { ...save, pet: result.pet, lastTick: now };
    this.simNow = now;
    this.persist();
    if (result.elapsedHours >= 0.1) {
      setUiState({
        offline: {
          summaryText: result.summaryText,
          elapsedHours: result.elapsedHours,
          poopsSpawned: result.poopsSpawned,
          becameSick: result.becameSick,
          died: result.died,
        },
      });
    }
    this.sync();
  }

  /** Ticker 1 dtk: maju sim sesuai speed + terapkan decay live (mendukung time-lapse debug). */
  startTicker(): void {
    if (this.ticker !== null) return;
    this.ticker = window.setInterval(() => {
      this.tickCount++;
      this.advanceSim(1000 * this.speed);
      if (this.tickCount % 15 === 0) this.persist(); // autosave berkala tiap ±15 dtk
    }, 1000);
  }

  private advanceSim(dtMs: number): void {
    const from = this.simNow;
    this.simNow += dtMs;
    const save = this.saveData;
    if (dtMs <= 0 || !save) {
      this.sync();
      return;
    }
    let pet = processOfflineCatchUp(save.pet, from, this.simNow).pet;
    // Poop live (interval dipersingkat oleh makan — Doc 12 §3.3; rules.json = sumber angka)
    if (
      shouldSpawnPoop(pet, this.simNow, {
        baseMs: rulesConfig.poop.baseIntervalHours * MS_PER_HOUR,
        minMs: rulesConfig.poop.minIntervalHours * MS_PER_HOUR,
        maxPoops: rulesConfig.poop.maxPoops,
        feedsSincePoop: this.feedsSincePoop,
      })
    ) {
      pet = spawnPoop(pet, this.simNow);
      this.feedsSincePoop = 0;
      pushToast("💩 Kitsune meninggalkan sesuatu di tatami...");
    }
    pet = this.applyGrowth(pet);
    this.saveData = { ...save, pet };
    this.checkNotifications(pet);
    this.sync();
    this.checkCompanionDialog(); // M6: dialog kontekstual (Doc 08 §2)
  }

  /**
   * Notifikasi lokal (M5 — Doc 11/GDD §11): stat <20 & sakit.
   * Throttle: satu notifikasi per stat per 4 jam; sakit sekali per episode.
   */
  private checkNotifications(pet: PetData): void {
    if (!this.saveData?.settings.notify) return;
    if (pet.stage === "dead" || pet.stage === "egg") return;
    const THROTTLE_MS = 4 * MS_PER_HOUR;
    const LOW: Array<[keyof PetStats, string]> = [
      ["hunger", "perutnya koroong — beri makan!"],
      ["happiness", "terlihat murung — ajak main!"],
      ["energy", "mengantuk — sudutkan istirahat"],
      ["hygiene", "butuh mandi di Onsen"],
      ["health", "kondisinya memburuk — cek dia!"],
    ];
    for (const [key, message] of LOW) {
      if (pet.stats[key] >= 20) {
        this.notifiedAt.delete(key);
        continue;
      }
      const last = this.notifiedAt.get(key) ?? 0;
      if (this.simNow - last < THROTTLE_MS) continue;
      this.notifiedAt.set(key, this.simNow);
      webNotifier.notify(`${pet.name} butuh perhatian`, message);
    }
    if (pet.state === "sick" && !this.sickNotified) {
      this.sickNotified = true;
      webNotifier.notify(`${pet.name} sakit!`, "Beri obat dari Dapur sebelum kondisinya memburuk.");
    } else if (pet.state !== "sick") {
      this.sickNotified = false;
    }
  }

  /** Mesin pertumbuhan M3: care sampling berkala → evolusi tahap → pemulihan jalur (GDD §4). */
  private applyGrowth(pet: PetData): PetData {
    if (pet.stage === "dead" || pet.stage === "egg" || pet.state === "evolving") return pet;

    // 0) Akumulasi penalti kelalaian sejak sample terakhir (GDD §4)
    this.accrueNeglect(pet);

    // 1) Care sampling tiap sampleIntervalHours — interaksi dikonversi ke poin bonus dari JSON
    let result = pet;
    if (this.simNow - this.lastCareSampleAt >= EV_PARAMS.sampleIntervalHours * MS_PER_HOUR) {
      const bonusPoints =
        this.strokesSinceSample * EV_PARAMS.interactionBonus.stroke +
        this.playsSinceSample * EV_PARAMS.interactionBonus.play;
      result = samplePetCare(result, this.simNow, EV_PARAMS, {
        b: bonusPoints,
        p: this.penaltySinceSample,
      });
      this.lastCareSampleAt = this.simNow;
      this.strokesSinceSample = 0;
      this.playsSinceSample = 0;
      this.penaltySinceSample = 0;
    }

    // 2) Evolusi tahap (hari-10 ekor+1, hari-20 jalur terkunci, hari-60 senior)
    const evo = evolveIfNeeded(result, this.simNow, EV_PARAMS);
    if (evo.kind) {
      result = evo.pet;
      setUiState({
        evolution: { kind: evo.kind, tier: evo.tier ?? "", path: evo.path },
      });
      eventBus.emit("fx/evolve", { kind: evo.kind });
      pushToast(`✨ Evolusi — ${evo.tier ?? "berubah"}!`);
      // M6 — catat momen evolusi ke memori (Doc 08 §4) → dialog "memory_event"
      this.recordMemory("evolved", `${evo.kind} — ${evo.tier ?? "berubah"}`);
      this.persist();
      return result; // evolving: pemulihan jalur ditunda sampai selesai cutscene
    }

    // 3) Pemulihan jalur (Nogitsune/Yako yang dirawat baik naik tier — GDD §4)
    const recovery = checkPathRecovery(result, this.simNow, EV_PARAMS);
    if (recovery.promotedTo) {
      const tier = EV_PARAMS.paths[recovery.promotedTo]?.tier ?? recovery.promotedTo;
      pushToast(`🌟 ${result.name} dipromosikan ke ${tier}!`);
      eventBus.emit("pet/say", { text: "Aku menjadi lebih baik berkatmu!" });
    }
    return recovery.pet;
  }

  /** Catat interaksi untuk bonus Care Score (GDD §4: stroke/play — play dipanggil dari mini-game M4). */
  noteInteraction(kind: "stroke" | "play"): void {
    if (kind === "stroke") this.strokesSinceSample++;
    else this.playsSinceSample++;
  }

  /** Penalti kelalaian (GDD §4): stat menyentuh 0 (sekali per kejadian) + sakit tak diobati per hari. */
  private accrueNeglect(pet: PetData): void {
    const statKeys: Array<keyof PetStats> = ["hunger", "happiness", "energy", "hygiene", "health"];
    for (const key of statKeys) {
      if (pet.stats[key] <= 0 && !this.zeroStats.has(key)) {
        this.zeroStats.add(key);
        this.penaltySinceSample += EV_PARAMS.neglectPenalty.statZero;
        // M6 — catat lalai ke memoryLog (di-drain pada tick dialog, Doc 08 §4)
        this.pendingNeglect.push({ key: `${key}_zero`, detail: `${key} menyentuh 0` });
      } else if (pet.stats[key] > 5) {
        this.zeroStats.delete(key); // pulih — kejadian berikutnya dihitung lagi
      }
    }
    if (pet.state === "sick" && pet.sickSince !== null) {
      if (this.sickPenaltyFrom === 0) {
        this.sickPenaltyFrom = Math.max(pet.sickSince, this.lastCareSampleAt);
      }
      const days = Math.floor((this.simNow - this.sickPenaltyFrom) / MS_PER_DAY);
      if (days >= 1) {
        this.penaltySinceSample += EV_PARAMS.neglectPenalty.sickUntreatedPerDay * days;
        this.sickPenaltyFrom += days * MS_PER_DAY;
      }
    } else {
      this.sickPenaltyFrom = 0; // sembuh/obat — penghitung sakit reset
    }
  }

  /** Tutup cutscene evolusi → pet kembali IDLE (Doc 12 §11.3). */
  evolveContinue(): void {
    const save = this.saveData;
    if (!save) return;
    const evo = getGameState().evolution;
    this.saveData = {
      ...save,
      pet: PetStateMachine.finishTransientState(save.pet),
    };
    this.persist();
    this.sync();
    setUiState({ evolution: null });
    if (evo) eventBus.emit("pet/say", { text: EVOLVE_LINES[evo.kind] });
  }

  private get pet(): PetData {
    if (!this.saveData) throw new Error("Save belum ada — onboarding belum selesai");
    return this.saveData.pet;
  }

  /** PetData → GameUiState (satu arah: core → store → React). */
  sync(): void {
    const save = this.saveData;
    if (!save) return;
    this.ensureLegacy(); // M7: kematian → warisan (Doc 07 §5)
    const pet = save.pet;
    const day = Math.floor((this.simNow - pet.birthAt) / MS_PER_DAY) + 1;
    setUiState({
      petName: pet.name,
      day,
      coins: save.player.coins,
      health: pet.stats.health,
      sleeping: pet.state === "sleeping",
      nowMs: this.simNow,
      poopCount: pet.poopCount,
      sick: pet.state === "sick",
      dead: pet.state === "dead" || pet.stage === "dead",
      path: pet.path,
      tails: pet.tails,
      element: pet.element,
      careScore: Math.round(pet.careScore),
      inventory: {
        food: { ...save.inventory.food },
        medicine: { ...save.inventory.medicine },
        owned: [...save.inventory.owned],
      },
      stats: {
        hunger: pet.stats.hunger,
        happiness: pet.stats.happiness,
        energy: pet.stats.energy,
        hygiene: pet.stats.hygiene,
      },
    });
    eventBus.emit("poop/count", { count: pet.poopCount });
    eventBus.emit("pet/appearance", {
      element: pet.element,
      path: pet.path,
      tails: pet.tails,
      coatColor: pet.coatColor,
    });
    // M4: CTA event musiman + data lobi Matsuri (rekor & countdown cooldown)
    const eventId = getSeasonEvent(this.simNow);
    let claimed = false;
    if (eventId === "hanami") claimed = save.seasonEvents.hanamiDoneDay === this.dayKey(this.simNow);
    else if (eventId === "tsukimi") claimed = save.seasonEvents.tsukimiDoneDay === this.dayKey(this.simNow);
    else if (eventId === "omikuji") claimed = save.seasonEvents.omikujiLastDay === this.dayKey(this.simNow);
    eventBus.emit("season/event", { id: eventId, claimed });
    eventBus.emit("minigame/lobby", {
      best: { ...save.minigames.bestScores },
      cooldownLeftMs: Math.max(
        0,
        minigamesConfig.common.cooldownMinutes * 60_000 - (this.simNow - save.minigames.lastPlayAt),
      ),
    });
  }

  private persist(): void {
    if (!this.saveData) return;
    const result = this.saveSystem.save(this.saveData);
    if (!result.success) pushToast("⚠️ Gagal menyimpan progress");
  }

  private reject(reason: ActionRejectReason): void {
    pushToast(REJECT_TEXT[reason]);
    eventBus.emit("pet/say", { text: REJECT_TEXT[reason] });
  }

  private finishTransientAfter(ms: number): void {
    window.setTimeout(() => {
      if (!this.saveData) return;
      this.saveData = {
        ...this.saveData,
        pet: PetStateMachine.finishTransientState(this.saveData.pet),
      };
      this.sync();
    }, ms);
  }

  // ===== Companion & dialog kontekstual (M6 — Doc 08, Doc 11 §1–2) =====

  /** Mesin dialog dibuat/diperbarui sesuai elemen + varian tahap/jalur (Doc 08 §3). */
  private ensureDialogue(): DialogueEngine | null {
    const save = this.saveData;
    if (!save || save.pet.stage === "egg") return null;
    // Kepribadian diwariskan (M7 — Doc 07 §3): elemen dialog ≠ wajib elemen tubuh
    const personality = save.pet.personality ?? save.pet.element;
    if (!this.dialogue || this.dialogueElement !== personality) {
      const cfg = getDialogConfig(personality);
      this.dialogue = new DialogueEngine({
        element: personality,
        pools: {
          lines: cfg.lines,
          seniorIdle: cfg.senior.idle,
          darkIdle: cfg.dark.idle,
          darkNeglect: cfg.dark.neglect,
        },
        rng: new MathRng(),
        nowMs: this.simNow,
      });
      this.dialogueElement = personality;
    }
    this.dialogue.setVariant(save.pet.stage, save.pet.path);
    this.dialogue.tick(this.simNow);
    return this.dialogue;
  }

  /** Provider chat Tier 1 (Doc 11 §2 ⭐ default offline — M9 tinggal ganti adapter). */
  private ensureChatProvider(): OfflineLlmProvider | null {
    const save = this.saveData;
    if (!save || save.pet.stage === "egg") return null;
    const personality = save.pet.personality ?? save.pet.element;
    if (!this.chatProvider || this.chatProviderElement !== personality) {
      const cfg = getDialogConfig(personality);
      const pools: ChatPools = {
        makan: cfg.chat.makan,
        sayang: cfg.chat.sayang,
        maaf: cfg.chat.maaf,
        siapa: cfg.chat.siapa,
        fallback: cfg.chat.fallback,
      };
      this.chatProvider = new OfflineLlmProvider(pools, new MathRng());
      this.chatProviderElement = personality;
    }
    return this.chatProvider;
  }

  /** Catat momen ke memoryLog (terbaru di depan, maks 20 — Doc 08 §4). */
  private recordMemory(key: string, detail: string): void {
    const save = this.saveData;
    if (!save) return;
    this.saveData = {
      ...save,
      pet: {
        ...save.pet,
        memoryLog: addMemory(save.pet.memoryLog, { t: this.simNow, key, detail }),
      },
    };
  }

  /**
   * Tick dialog (Doc 08 §2) — dipanggil tiap selesai sync: drain lalai tertunda,
   * tandai memori terpendingk "spoken", lalu evaluasi prioritas 1–9.
   */
  private checkCompanionDialog(): void {
    const dialogue = this.ensureDialogue();
    let save = this.saveData;
    if (!save || !dialogue) return;
    if (save.pet.stage === "dead") return;
    if (this.pendingNeglect.length > 0) {
      let log = save.pet.memoryLog;
      for (const n of this.pendingNeglect) {
        log = addMemory(log, { t: this.simNow, key: n.key, detail: n.detail });
      }
      this.pendingNeglect = [];
      this.saveData = { ...save, pet: { ...save.pet, memoryLog: log } };
      save = this.saveData;
    }
    const pet = save.pet;
    const pending = findPendingMemory(pet.memoryLog);
    if (pending) {
      // kolom `spoken` runtime-only — tak mengubah struktur save
      this.saveData = {
        ...save,
        pet: { ...pet, memoryLog: markMemorySpoken(pet.memoryLog, pending.index) },
      };
    }
    const pick = dialogue.pickByPriority(
      {
        stats: pet.stats,
        state: pet.state,
        phase: getDayPhase(this.simNow),
        season: getSeason(this.simNow),
        pendingMemory: pending?.entry ?? null,
      },
      Math.floor((this.simNow - pet.birthAt) / MS_PER_DAY),
    );
    if (pick) {
      eventBus.emit("pet/say", { text: pick.text });
      this.persist();
    }
  }

  /** Buka layar Chat (Doc 12 §8). */
  chatOpen(): void {
    const save = this.saveData;
    if (!save || save.pet.stage === "egg" || save.pet.stage === "dead" || save.pet.state === "dead") return;
    setUiState({
      chat: {
        messages: [...this.chatMessages],
        quotaLeft: chatQuotaLeft(rollChatQuotaDay(save.companion.chatQuota, this.dayKey(this.simNow))),
        canForgive: hasUnforgivenNeglect(save.pet.memoryLog),
        tier: "tier1",
      },
    });
  }

  /** Tutup layar Chat. */
  chatClose(): void {
    setUiState({ chat: null });
  }

  /** Kirim pesan pemain → Tier 2 LLM via edge proxy, fallback Tier 1 (M9 — Doc 11 §2 & §4).
   * Typing indicator 3 titik 1–2 dtk sebelum balasan Tier 1 (Doc 12 §8). */
  chatSend(text: string): void {
    const save = this.saveData;
    const provider = this.ensureChatProvider();
    if (!save || !provider) return;
    const trimmed = text.trim().slice(0, 120);
    if (!trimmed) return;
    const pet = save.pet;
    const context: ChatContext = {
      petName: pet.name,
      element: pet.element,
      path: pet.path,
      stats: pet.stats,
      phase: getDayPhase(this.simNow),
      season: getSeason(this.simNow),
      ageDays: Math.floor((this.simNow - pet.birthAt) / MS_PER_DAY) + 1,
      memoryLog: pet.memoryLog,
      hasUnforgivenNeglect: hasUnforgivenNeglect(pet.memoryLog),
      chatQuota: save.companion.chatQuota,
      day: this.dayKey(this.simNow),
    };
    const history = this.chatMessages.slice(-6).map((m) => ({ from: m.from, text: m.text }));
    // pesan pemain langsung tampil + mulai "mengetik…"
    this.chatMessages = [
      ...this.chatMessages,
      { from: "player" as const, text: trimmed },
    ].slice(-20);
    const useLlm = !save.settings.offlineLlm && getOnlineConfig() !== null;
    const tier: "tier1" | "tier2" = useLlm ? "tier2" : "tier1";
    setUiState({ chat: { ...getGameState().chat!, typing: true, tier } });

    const run = (task: Promise<ChatReply>): void => {
      void task
        .then((reply) => this.applyChatReply(reply))
        .catch(() => {
          // Tier 1 juga gagal (jarang) — tutup typing tanpa crash
          setUiState({ chat: { ...getGameState().chat!, typing: false } });
        });
    };

    if (!useLlm) {
      const delay = 1000 + Math.floor(Math.random() * 1000); // 1–2 dtk (Doc 12 §8)
      window.setTimeout(() => run(provider.chat({ text: trimmed, context })), delay);
      return;
    }

    // Tier 2: LLM via edge proxy → gagal/timeout/kuota habis → Tier 1 (Doc 11 §2)
    const cfg = getOnlineConfig()!;
    let tierNow: "tier1" | "tier2" = "tier2";
    const chain = new FallbackLlmProvider(
      new EdgeLlmProvider({
        url: cfg.url,
        anonKey: cfg.anonKey,
        getToken: getAccessToken, // JWT Anonymous Auth (M9 keamanan)
        timeoutMs: 8000,
      }),
      provider,
      () => {
        tierNow = "tier1";
        pushToast("📡 LLM tidak tersedia — melanjutkan dengan Tier 1");
      },
    );
    run(
      chain
        .chat({ text: trimmed, context, history })
        .then((reply) => {
          setUiState({ chat: { ...getGameState().chat!, tier: tierNow } });
          return reply;
        }),
    );
  }

  /** Terapkan balasan provider ke save & UI — efek Tier 1 tetap dari core (M9, Doc 11 §3). */
  private applyChatReply(reply: ChatReply): void {
    const cur = this.saveData;
    if (!cur) return;
    let petNow = cur.pet;
    if (reply.happiness > 0) petNow = this.addHappiness(petNow, reply.happiness);
    if (reply.forgave) {
      const { log } = forgiveNeglectMemories(petNow.memoryLog);
      petNow = { ...petNow, memoryLog: log };
      pushToast("💝 Memori lalai dimaafkan!");
    }
    this.saveData = { ...cur, pet: petNow, companion: { chatQuota: reply.chatQuota } };
    this.chatMessages = [
      ...this.chatMessages,
      { from: "pet" as const, text: reply.text },
    ].slice(-20); // riwayat sesi maks 20 bubble (privasi — Doc 12 §8)
    setUiState({
      chat: {
        messages: [...this.chatMessages],
        quotaLeft: chatQuotaLeft(reply.chatQuota),
        canForgive: hasUnforgivenNeglect(petNow.memoryLog),
        typing: false,
        tier: getGameState().chat?.tier ?? "tier1",
      },
    });
    this.sync();
    this.persist();
    if (reply.happiness > 0) eventBus.emit("pet/reaction", { emoji: reactionFor("stroke") });
  }

  feed(foodId: string): void {
    const save = this.saveData;
    if (!save) return;
    const item = getItemById(foodId);
    if (!item || !("hunger" in item)) return;
    const owned = save.inventory.food[foodId] ?? 0;
    if (owned <= 0) {
      pushToast("📦 Stok habis — beli di Toko Dagashiya");
      return;
    }
    const result = PetStateMachine.feed(save.pet, {
      hungerRestore: item.hunger,
      happinessBonus: item.happiness,
      isSnack: item.happiness > 0, // camilan boleh saat kenyang
      nowMs: Date.now(),
      recentFeeds: this.recentFeeds,
    });
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.feedsSincePoop++;
    this.saveData = {
      ...save,
      pet: result.pet,
      inventory: {
        ...save.inventory,
        food: { ...save.inventory.food, [foodId]: owned - 1 },
      },
    };
    this.recentFeeds.push(Date.now());
    this.sync();
    this.persist();
    pushToast(`${item.icon} ${item.name} — kenyang! 🍖+${item.hunger}`);
    if (result.overfeedWarning) pushToast("⚠️ Kegemukan! Jangan terlalu sering (health −5)");
    eventBus.emit("pet/eat", { label: item.icon });
    eventBus.emit("pet/reaction", { emoji: reactionFor("feed") }); // M6 (Doc 08 §1)
    this.finishTransientAfter(1800);
  }

  bathe(): void {
    const save = this.saveData;
    if (!save) return;
    const result = PetStateMachine.bathe(save.pet);
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.saveData = { ...save, pet: result.pet };
    this.sync();
    this.persist();
    pushToast("♨️ Wangi sedap! 😊+5");
    eventBus.emit("pet/say", { text: "Kyaa~ segarnya!" });
    eventBus.emit("pet/reaction", { emoji: reactionFor("bath") }); // M6 (Doc 08 §1)
    this.finishTransientAfter(2000);
  }

  toggleSleep(): void {
    const save = this.saveData;
    if (!save) return;
    const sleeping = save.pet.state === "sleeping";
    const result = sleeping ? PetStateMachine.wake(save.pet) : PetStateMachine.sleep(save.pet);
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.saveData = { ...save, pet: result.pet };
    this.sync();
    this.persist();
    eventBus.emit("pet/sleep", { on: !sleeping });
    if (!sleeping) pushToast("🛏️ Selamat tidur...");
  }

  poke(): void {
    const save = this.saveData;
    if (!save || save.pet.state === "sleeping") {
      eventBus.emit("pet/say", { text: "Zzz..." });
      return;
    }
    // M6 — baris sesuai kepribadian elemen (fallback: baris pat lama)
    const line =
      this.ensureDialogue()?.pick("idle") ??
      (PAT_LINES[Math.floor(Math.random() * PAT_LINES.length)] ?? "Kyuu?");
    eventBus.emit("pet/say", { text: line });
  }

  stroke(): void {
    const save = this.saveData;
    if (!save) return;
    const result = PetStateMachine.pet(save.pet); // Happiness +2 (Doc 02 S4)
    if (!result.success) {
      if (result.reason === "ALREADY_SLEEPING") eventBus.emit("pet/say", { text: "Zzz..." });
      return;
    }
    this.saveData = { ...save, pet: result.pet };
    this.sync();
    this.persist();
    eventBus.emit("fx/hearts", undefined);
  }

  // ===== Mini-game Matsuri (M4 — Doc 05, Doc 12 §7) =====

  /** Kunci tanggal lokal (YYYY-MM-DD) — konsisten dengan login streak. */
  private dayKey(ms: number): string {
    return new Date(ms).toISOString().split("T")[0] ?? "1970-01-01";
  }

  /** Tambah happiness dengan clamp (energi sudah dipotong saat gate — bukan aksi play penuh). */
  private addHappiness(pet: PetData, amount: number): PetData {
    return { ...pet, stats: clampStats({ ...pet.stats, happiness: pet.stats.happiness + amount }) };
  }

  /** Tap kartu di lobi → gate (Doc 05 §1/§7) → potong energi → masuk scene game. */
  minigameStart(gameId: string): void {
    const save = this.saveData;
    if (!save) return;
    const def = getMinigameById(gameId);
    if (!def) return;
    const common = minigamesConfig.common;
    const stage = save.pet.stage === "baby" || save.pet.stage === "teen" || save.pet.stage === "adult" || save.pet.stage === "elder" ? save.pet.stage : "adult";
    const gate = canPlayMinigame({
      state: save.pet.state,
      stage,
      energy: save.pet.stats.energy,
      lastPlayAt: save.minigames.lastPlayAt,
      nowMs: this.simNow,
      cooldownMs: common.cooldownMinutes * 60_000,
      minEnergyToPlay: common.minEnergyToPlay,
      stageLocked: getStageRule(stage).locked ?? false,
    });
    if (!gate.allowed) {
      const text =
        gate.reason === "COOLDOWN"
          ? `⏳ Cooldown ${Math.ceil(
              (common.cooldownMinutes * 60_000 - (this.simNow - save.minigames.lastPlayAt)) / 60_000,
            )} mnt`
          : (REJECT_TEXT[gate.reason as ActionRejectReason] ?? "Tidak bisa main sekarang");
      pushToast(text);
      eventBus.emit("pet/say", { text });
      return;
    }
    // Biaya energi dipotong SEBELUM main + cooldown dimulai (Doc 05 §7)
    this.saveData = {
      ...save,
      pet: {
        ...save.pet,
        stats: clampStats({ ...save.pet.stats, energy: save.pet.stats.energy - common.energyCost }),
      },
      minigames: { ...save.minigames, lastPlayAt: this.simNow },
    };
    this.sync();
    this.persist();
    eventBus.emit("scene/goto", {
      key: gameId as "kingyo" | "wanage" | "dash",
      gameId,
      best: save.minigames.bestScores[gameId] ?? 0,
    });
  }

  /** Sesi selesai → hadiah sesuai formula Doc 05 §5 + rekor + layar hasil. */
  minigameResult(gameId: string, points: number, coinBonus = 0): void {
    const save = this.saveData;
    if (!save) return;
    const def = getMinigameById(gameId);
    if (!def) return;
    const common = minigamesConfig.common;
    const stage = save.pet.stage === "baby" || save.pet.stage === "teen" || save.pet.stage === "adult" || save.pet.stage === "elder" ? save.pet.stage : "adult";
    const streakDay = save.player.loginStreak.count;
    const reward = calculateMinigameReward(points, {
      coinPerPoint: common.coinPerPoint,
      minCoins: common.minCoins,
      happinessMin: common.happinessMin,
      happinessMax: common.happinessMax,
      dayPhaseMultipliers: common.dayPhaseCoinMultiplier,
      stageCoinMultiplier: getStageRule(stage).coinMultiplier ?? 1,
      mysticBonusPct: save.pet.element === "mystic" ? 0.1 : 0,
      streakBonusCoins: streakDay > 0 && streakDay % 7 === 0 ? common.streakDay7BonusCoins : 0,
      seasonMultiplier: getSeason(this.simNow) === "summer" ? 1.5 : 1, // matsuri musiman (Doc 03 §5)
      dayPhase: getDayPhase(this.simNow),
    });
    const prevBest = save.minigames.bestScores[gameId] ?? 0;
    const newRecord = points > prevBest;
    this.saveData = {
      ...save,
      pet: this.addHappiness(save.pet, reward.happiness),
      player: { ...save.player, coins: save.player.coins + reward.coins + coinBonus },
      minigames: {
        ...save.minigames,
        bestScores: newRecord
          ? { ...save.minigames.bestScores, [gameId]: points }
          : save.minigames.bestScores,
      },
    };
    this.noteInteraction("play"); // Care Score bonus interaksi (GDD §4)
    // M6 — rekor baru masuk memori (Doc 08 §4) → dialog "memory_event"
    if (newRecord) this.recordMemory(`minigame_${gameId}`, `rekor baru ${def.name}: ${points}`);
    this.sync();
    this.persist();
    this.finishTransientAfter(1200); // playing → IDLE
    setUiState({
      minigameResult: {
        gameId,
        name: def.name,
        icon: def.icon,
        points,
        coins: reward.coins + coinBonus,
        happiness: reward.happiness,
        best: Math.max(prevBest, points),
        newRecord,
      },
    });
  }

  /** Tutup layar hasil → kembali ke Home. */
  minigameContinue(): void {
    setUiState({ minigameResult: null });
    eventBus.emit("scene/goto", { key: "home" });
  }

  // ===== Taman & event musiman (M4 — Doc 03 §5, Doc 12 §5) =====

  /** Beri makan koi: −5🪙 → 😊+3, koi melompat; cooldown 1 jam (Doc 12 §5). */
  koiFeed(): void {
    const save = this.saveData;
    if (!save) return;
    if (save.pet.state === "dead" || save.pet.stage === "dead") return;
    if (save.player.coins < 5) {
      pushToast("🪙 Koin tidak cukup (butuh 5)");
      return;
    }
    const cooldownMs = 60 * 60_000;
    const since = this.simNow - save.seasonEvents.koiFeedAt;
    if (save.seasonEvents.koiFeedAt > 0 && since < cooldownMs) {
      pushToast(`⏳ Koi baru saja diberi makan (${Math.ceil((cooldownMs - since) / 60_000)} mnt)`);
      return;
    }
    this.saveData = {
      ...save,
      pet: this.addHappiness(save.pet, 3),
      player: { ...save.player, coins: save.player.coins - 5 },
      seasonEvents: { ...save.seasonEvents, koiFeedAt: this.simNow },
    };
    this.sync();
    this.persist();
    eventBus.emit("fx/koi-jump", undefined);
    pushToast("🐟 Koi melompat gembira! 😊+3 (−🪙5)");
  }

  /** CTA event musiman di Taman (Doc 03 §5): Hanami sekali, Tsukimi sekali, Omikuji harian. */
  claimSeasonEvent(id: "hanami" | "tsukimi" | "omikuji"): void {
    const save = this.saveData;
    if (!save) return;
    const today = this.dayKey(this.simNow);
    const ev = save.seasonEvents;

    if (id === "hanami") {
      if (ev.hanamiDoneDay === today) {
        pushToast("🌸 Hanami sudah dirayakan hari ini");
        return;
      }
      const memory = { t: this.simNow, key: "hanami", detail: `Piknik hanami di taman bersama ${save.pet.name}` };
      this.saveData = {
        ...save,
        pet: {
          ...this.addHappiness(save.pet, 20),
          memoryLog: [...save.pet.memoryLog, memory].slice(-20),
        },
        seasonEvents: { ...ev, hanamiDoneDay: today },
      };
      this.sync();
      this.persist();
      pushToast("🌸 Hanami! Piknik bersama — 😊+20 (foto tersimpan di Album)");
      eventBus.emit("fx/hearts", undefined);
      return;
    }

    if (id === "tsukimi") {
      if (ev.tsukimiDoneDay === today) {
        pushToast("🌕 Tsukimi sudah dirayakan");
        return;
      }
      this.saveData = {
        ...save,
        inventory: save.inventory.owned.includes("decor_dango")
          ? save.inventory
          : { ...save.inventory, owned: [...save.inventory.owned, "decor_dango"] },
        seasonEvents: { ...ev, tsukimiDoneDay: today },
      };
      this.sync();
      this.persist();
      pushToast("🌕 Tsukimi! Dango gratis diterima — pasang dari Toko 🏮");
      eventBus.emit("pet/say", { text: "Kyuu~ dango! Ehehe~" });
      return;
    }

    // Omikuji (1–7 Jan): ramalan acak 1×/hari (Doc 03 §5)
    if (ev.omikujiLastDay === today) {
      pushToast("🎍 Omikuji besok lagi (1× per hari)");
      return;
    }
    const fortunes = [
      { name: "Daikichi 🎋", coins: 30, happiness: 10 },
      { name: "Chukichi 🌸", coins: 20, happiness: 5 },
      { name: "Shokichi 🍀", coins: 10, happiness: 3 },
      { name: "Kyō 🌧️", coins: 0, happiness: 1 },
    ] as const;
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)] ?? fortunes[0];
    this.saveData = {
      ...save,
      pet: this.addHappiness(save.pet, fortune.happiness),
      player: { ...save.player, coins: save.player.coins + fortune.coins },
      seasonEvents: { ...ev, omikujiLastDay: today },
    };
    this.sync();
    this.persist();
    pushToast(
      fortune.coins > 0
        ? `🎍 ${fortune.name}! +🪙${fortune.coins} 😊+${fortune.happiness}`
        : `🎍 ${fortune.name} — 😊+${fortune.happiness}`,
    );
    eventBus.emit("pet/say", { text: `Omikuji-ku... ${fortune.name}!` });
  }

  // ===== Ekonomi M2: toko, obat, poop, streak (Doc 06) =====

  /** Beli item dari Toko Dagashiya → inventaris (Doc 12 §6). */
  buy(itemId: string): void {
    const save = this.saveData;
    if (!save) return;
    const item = getItemById(itemId);
    if (!item) return;
    if (save.player.coins < item.price) {
      pushToast("🪙 Koin tidak cukup");
      return;
    }
    let inventory = save.inventory;
    if ("hunger" in item) {
      const totalFood = Object.values(inventory.food).reduce((a, b) => a + b, 0);
      if (totalFood >= rulesConfig.inventory.foodCapacity) {
        pushToast(`📦 Pantry penuh (maks ${rulesConfig.inventory.foodCapacity})`);
        return;
      }
      inventory = {
        ...inventory,
        food: { ...inventory.food, [itemId]: (inventory.food[itemId] ?? 0) + 1 },
      };
    } else if ("effects" in item) {
      inventory = {
        ...inventory,
        medicine: { ...inventory.medicine, [itemId]: (inventory.medicine[itemId] ?? 0) + 1 },
      };
    } else {
      if (inventory.owned.includes(itemId)) {
        pushToast("Kamu sudah punya ini");
        return;
      }
      inventory = { ...inventory, owned: [...inventory.owned, itemId] };
    }
    this.saveData = {
      ...save,
      player: { ...save.player, coins: save.player.coins - item.price },
      inventory,
    };
    this.sync();
    this.persist();
    pushToast(`${item.icon} ${item.name} dibeli! (−🪙${item.price})`);
  }

  /** Pakai obat dari inventaris (banner sakit / toko) — cooldown dari rules.json (Doc 06 §4). */
  useMedicine(medId: string): void {
    const save = this.saveData;
    if (!save) return;
    const item = getItemById(medId);
    if (!item || !("effects" in item)) return;
    const owned = save.inventory.medicine[medId] ?? 0;
    if (owned <= 0) {
      pushToast("📦 Tidak punya obat — beli di Toko");
      return;
    }
    const cooldownMs = (item.cooldownHours ?? rulesConfig.cure.cooldownHours) * MS_PER_HOUR;
    if (save.pet.lastCuredAt > 0 && this.simNow - save.pet.lastCuredAt < cooldownMs) {
      const left = Math.ceil((cooldownMs - (this.simNow - save.pet.lastCuredAt)) / 60000);
      pushToast(`⏳ Obat belum boleh dipakai lagi (${left} mnt)`);
      return;
    }
    const result = PetStateMachine.cure(save.pet);
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.saveData = {
      ...save,
      pet: {
        ...result.pet,
        lastCuredAt: this.simNow,
        stats: {
          ...result.pet.stats,
          health: Math.min(100, result.pet.stats.health + (item.effects.health ?? 0)),
          energy: Math.min(100, result.pet.stats.energy + (item.effects.energy ?? 0)),
          hygiene: Math.min(100, result.pet.stats.hygiene + (item.effects.hygiene ?? 0)),
        },
      },
      inventory: {
        ...save.inventory,
        medicine: { ...save.inventory.medicine, [medId]: owned - 1 },
      },
    };
    this.sync();
    this.persist();
    pushToast(`${item.icon} ${item.name} diminum — cepat pulih!`);
    eventBus.emit("pet/say", { text: "Kyuu~ terima kasih..." });
  }

  /** Sapu poop (hold 400ms di scene, Doc 12 §3.3) + peluang koin (rules.json). */
  scoop(): void {
    const save = this.saveData;
    if (!save) return;
    if (save.pet.poopCount <= 0) return;
    this.saveData = { ...save, pet: scoopPoop(save.pet) };
    if (Math.random() < rulesConfig.scoop.coinChance) {
      const amount =
        rulesConfig.scoop.coinMin +
        Math.floor(Math.random() * (rulesConfig.scoop.coinMax - rulesConfig.scoop.coinMin + 1));
      this.saveData = {
        ...this.saveData,
        player: { ...this.saveData.player, coins: this.saveData.player.coins + amount },
      };
      pushToast(`🪙 +${amount} dari poop! (untung-untungan)`);
    }
    this.sync();
    this.persist();
    eventBus.emit("fx/scoop", { index: save.pet.poopCount - 1 });
  }

  /** Cek streak login saat masuk Home — hadiah sesuai tabel rules.json (Doc 06 §4). */
  checkLoginStreak(): void {
    const save = this.saveData;
    if (!save) return;
    const today = new Date(this.simNow).toISOString().split("T")[0] ?? "1970-01-01";
    const result = updateLoginStreak(save.player.loginStreak, today);
    if (!result.isNewDay) return;
    const reward = rulesConfig.loginRewards[result.rewardDay - 1] ?? 20;
    this.saveData = {
      ...save,
      player: { ...save.player, loginStreak: result.streak, coins: save.player.coins + reward },
    };
    this.sync();
    this.persist();
    setUiState({ loginReward: { day: result.rewardDay, coins: reward } });
  }

  /** Obat pertama yang tersedia di inventaris (banner sakit — 1 tombol, Doc 12 §11.5). */
  useFirstMedicine(): void {
    const save = this.saveData;
    if (!save) return;
    const medId = Object.entries(save.inventory.medicine).find(([, n]) => n > 0)?.[0];
    if (!medId) {
      pushToast("📦 Tidak punya obat — beli di Toko");
      return;
    }
    this.useMedicine(medId);
  }

  // ===== Breeding & keturunan (M7 — Doc 07, Doc 12 §9) =====

  /** Umur pet dalam hari penuh. */
  private livedDaysOf(pet: PetData): number {
    return Math.max(1, Math.floor((this.simNow - pet.birthAt) / MS_PER_DAY));
  }

  /**
   * Kematian → warisan sekali saja (Doc 07 §5): koin kenangan + 1 item kesayangan.
   * Telur keturunan yang sudah ada tetap hidup — pemain tidak mulai dari nol.
   */
  private ensureLegacy(): void {
    const save = this.saveData;
    if (!save) return;
    if (save.pet.state !== "dead" && save.pet.stage !== "dead") return;
    if (save.breeding.pendingLegacy) return;
    const livedDays = this.livedDaysOf(save.pet);
    const gen = save.breeding.lineage?.gen ?? 1;
    const memoryCoins = computeLegacyCoins(livedDays, gen);
    // Item kesayangan diwariskan: mainan pertama, else dekor pertama (Doc 07 §5)
    const isKind = (id: string, kind: string): boolean => {
      const item = getItemById(id);
      return item !== undefined && "kind" in item && item.kind === kind;
    };
    const inheritedId =
      save.inventory.owned.find((id) => isKind(id, "toy")) ??
      save.inventory.owned.find((id) => isKind(id, "decor")) ??
      null;
    this.saveData = {
      ...save,
      breeding: {
        ...save.breeding,
        pendingLegacy: {
          name: save.pet.name,
          element: save.pet.element,
          path: save.pet.path,
          livedDays,
          careScore: Math.round(save.pet.careScore),
          gen,
          memoryCoins,
          inheritedItemId: inheritedId,
        },
      },
    };
    const egg = save.breeding.egg;
    const legacyUi: LegacyUi = {
      name: save.pet.name,
      livedDays,
      memoryCoins,
      inheritedItemName: inheritedId ? (getItemById(inheritedId)?.name ?? null) : null,
      hasEgg: egg !== null,
      childName: egg ? childDefaultName(egg.parents[0]?.name ?? save.pet.name, egg.gen) : null,
      childElement: egg?.element ?? null,
      childCoat: egg?.coatColor ?? null,
    };
    setUiState({ legacy: legacyUi });
  }

  /** Buka layar Breeding House (Doc 12 §9.2): 3 mitra NPC harian + syarat. */
  breedingOpen(): void {
    const save = this.saveData;
    if (!save || save.pet.state === "dead" || save.pet.stage === "dead") return;
    const partners = rollDailyPartners(this.dayKey(this.simNow)).map((p) => ({
      id: p.id,
      name: p.name,
      element: p.element,
      childElement: previewChildElement(save.pet.element, p.element),
      childCoat: previewChildCoat(save.pet, p),
    }));
    const gate = checkBreedingRequirements(save.pet, save.breeding, this.simNow);
    setUiState({
      breeding: {
        partners,
        canBreed: gate.allowed,
        reasons: gate.allowed ? [] : gate.reasons,
        costCoins: breedingConfig.requirements.costCoins,
        cooldownLeftMs: cooldownRemainingMs(save.breeding, this.simNow),
        childrenCount: save.breeding.childrenCount,
        maxChildren: breedingConfig.requirements.maxChildren,
        happinessBonus: breedingConfig.breedEffect.happinessBonus,
        hasEgg: save.breeding.egg !== null,
      },
    });
  }

  breedingClose(): void {
    setUiState({ breeding: null });
  }

  /** Pasangkan dengan mitra NPC → telur keturunan (Doc 07 §2A: biaya 500, cd 7 hari, 😊+10). */
  breedingStart(partnerId: string): void {
    const save = this.saveData;
    if (!save) return;
    const gate = checkBreedingRequirements(save.pet, save.breeding, this.simNow);
    if (!gate.allowed) {
      pushToast("Syarat breeding belum terpenuhi — cek daftar di bawah");
      return;
    }
    const partner = rollDailyPartners(this.dayKey(this.simNow)).find((p) => p.id === partnerId);
    if (!partner) return;
    const cost = breedingConfig.requirements.costCoins;
    if (save.player.coins < cost) {
      pushToast(`🪙 Koin tidak cukup (butuh ${cost})`);
      return;
    }
    const genetics = computeChildGenetics({ parent: save.pet, partner, rng: new MathRng() });
    // Poin bonus dibekukan dari stat induk yang sehat saat breeding (Doc 07 §3)
    const avg =
      (save.pet.stats.hunger + save.pet.stats.happiness + save.pet.stats.energy + save.pet.stats.hygiene) / 4;
    const bonusPoints = (avg * genetics.startBonusPct) / 100;
    const childGen = (save.breeding.lineage?.gen ?? 1) + 1;
    const egg = createBreedingEgg(
      genetics,
      [
        petToLineageParent(save.pet, this.livedDaysOf(save.pet)),
        { name: partner.name, element: partner.element, path: "biasa" },
      ],
      childGen,
      this.simNow,
      bonusPoints,
    );
    const childNo = save.breeding.childrenCount + 1;
    this.saveData = {
      ...save,
      pet: this.addHappiness(save.pet, breedingConfig.breedEffect.happinessBonus),
      player: { ...save.player, coins: save.player.coins - cost },
      breeding: {
        ...save.breeding,
        childrenCount: childNo,
        cooldownUntil: this.simNow + breedingConfig.requirements.cooldownDays * MS_PER_DAY,
        egg,
      },
    };
    this.recordMemory("breed", `keturunan ke-${childNo} bersama ${partner.name}`);
    this.sync();
    this.persist();
    setUiState({ breeding: null });
    pushToast(
      genetics.element === "mystic"
        ? "🥚 Telur mistik ✨ lahir dari mutasi! (😊+10)"
        : `🥚 Telur keturunan (${genetics.element}) di altar — 😊+10`,
    );
    eventBus.emit("pet/say", { text: "Kyuu~! Bayi kecil kita!" });
  }

  /** Buka Album (Doc 12 §9.1): pet aktif + telur + silsilah maks 3 generasi. */
  albumOpen(): void {
    const save = this.saveData;
    if (!save) return;
    const egg = save.breeding.egg;
    setUiState({
      album: {
        pet: {
          name: save.pet.name,
          element: save.pet.element,
          path: save.pet.path,
          coatColor: save.pet.coatColor ?? coatColorOf(save.pet.element),
          day: this.livedDaysOf(save.pet),
          careScore: Math.round(save.pet.careScore),
          gen: save.breeding.lineage?.gen ?? 1,
          childrenCount: save.breeding.childrenCount,
        },
        egg: egg
          ? {
              element: egg.element,
              coatColor: egg.coatColor,
              gen: egg.gen,
              parents: egg.parents.map((p) => ({
                name: p.name,
                element: p.element,
                path: p.path,
                livedDays: p.livedDays,
                careScore: p.careScore,
              })),
            }
          : null,
        generations: save.breeding.lineage
          ? lineageGenerations(save.breeding.lineage).map((row) =>
              row.map((p) => ({
                name: p.name,
                element: p.element,
                path: p.path,
                livedDays: p.livedDays,
                careScore: p.careScore,
              })),
            )
          : [],
      },
    });
  }

  albumClose(): void {
    setUiState({ album: null });
  }

  /** Telur keturunan menetas → garis keluarga berlanjut (Doc 07 §5: tak mulai dari nol). */
  continueLineage(): void {
    const save = this.saveData;
    if (!save) return;
    const legacy = save.breeding.pendingLegacy;
    const egg = save.breeding.egg;
    if (!legacy || !egg) {
      this.resetAfterDeath(); // tanpa telur → mulai pet baru dari nol
      return;
    }
    const now = Date.now();
    const bp = egg.bonusPoints;
    const childName = childDefaultName(egg.parents[0]?.name ?? legacy.name, egg.gen);
    const inheritedId = legacy.inheritedItemId;
    this.saveData = {
      ...save,
      lastTick: now,
      pet: {
        name: childName,
        element: egg.element,
        personality: egg.personalityElement,
        birthAt: now,
        stage: "baby",
        state: "idle",
        // Stat awal = dasar newborn + poin bonus dibekukan saat breeding (Doc 07 §3)
        stats: clampStats({
          hunger: 80 + bp,
          happiness: 80 + bp,
          energy: 80 + bp,
          hygiene: 80 + bp,
          health: 100,
        }),
        careScore: 50,
        careHistory: [],
        recoverSince: null,
        tails: 1,
        path: "biasa",
        coatColor: egg.coatColor,
        sickSince: null,
        lastPoopAt: null,
        poopCount: 0,
        lastCuredAt: 0,
        memoryLog: [
          { t: now, key: "lineage", detail: `melanjutkan garis ${legacy.name} (generasi ${egg.gen})` },
        ],
      },
      player: { ...save.player, coins: save.player.coins + legacy.memoryCoins },
      inventory: inheritedId
        ? {
            ...save.inventory,
            owned: save.inventory.owned.includes(inheritedId)
              ? save.inventory.owned
              : [...save.inventory.owned, inheritedId],
          }
        : save.inventory,
      // Kuota & cooldown bersifat per-pet → reset untuk keturunan (Doc 07 §1)
      breeding: {
        childrenCount: 0,
        cooldownUntil: 0,
        lineage: {
          gen: egg.gen,
          parents: egg.parents,
          ancestors: save.breeding.lineage ? [save.breeding.lineage] : [],
        },
        egg: null,
        pendingLegacy: null,
      },
    };
    // Reset runtime state untuk pet baru
    this.simNow = now;
    this.recentFeeds = [];
    this.feedsSincePoop = 0;
    this.lastCareSampleAt = now;
    this.strokesSinceSample = 0;
    this.playsSinceSample = 0;
    this.penaltySinceSample = 0;
    this.zeroStats.clear();
    this.sickPenaltyFrom = 0;
    this.notifiedAt.clear();
    this.sickNotified = false;
    this.chatMessages = [];
    this.persist();
    this.sync();
    setUiState({ screen: "home", dead: false, legacy: null, album: null, breeding: null, offline: null });
    pushToast(
      `🥚→🐣 ${childName} menetas! +🪙${legacy.memoryCoins} kenangan${inheritedId ? " + item warisan" : ""}`,
    );
    eventBus.emit("pet/say", { text: FIRST_GREETING[egg.element] ?? "Kyuu~!" });
  }

  /** Setelah memorial: hapus save → kembali ke Splash/Altar (Doc 12 §11.4). */
  resetAfterDeath(): void {
    this.saveSystem.deleteSave();
    this.saveData = null;
    this.hasSave = false;
    this.recentFeeds = [];
    this.feedsSincePoop = 0;
    setUiState({
      screen: "splash",
      hasSave: false,
      dead: false,
      offline: null,
      legacy: null,
      album: null,
      breeding: null,
    });
  }

  /** Persist segera (dipakai visibilitychange/pagehide). */
  flush(): void {
    this.persist();
  }

  /** Ekspor save aktif → kode base64 (SaveSystem.exportBase64). */
  exportBackup(): void {
    if (!this.saveData) return;
    const code = SaveSystem.exportBase64(this.saveData);
    setUiState({ backupCode: code });
    pushToast("📦 Kode backup dibuat — salin dan simpan!");
  }

  /** Terapkan pengaturan audio/notify/offline-LLM (M5 — Doc 12 §3.2) + persist. */
  applySettings(partial: { music?: boolean; sfx?: boolean; notify?: boolean; offlineLlm?: boolean }): void {
    if (!this.saveData) return;
    this.saveData = { ...this.saveData, settings: { ...this.saveData.settings, ...partial } };
    applyAudioSettings(this.saveData.settings);
    if (partial.notify !== undefined) webNotifier.setEnabled(partial.notify);
    this.persist();
  }

  /** Flag audio saat ini (dipakai init untuk sinkronisasi awal AudioEngine). */
  get settingsSnapshot(): { music: boolean; sfx: boolean } {
    const s = this.saveData?.settings;
    return { music: s?.music ?? true, sfx: s?.sfx ?? true };
  }

  /** Impor kode base64 → ganti save aktif setelah validasi skema. */
  importBackup(code: string): void {
    const result = SaveSystem.importBase64(code);
    if (!result.success) {
      pushToast(`❌ ${result.error}`);
      return;
    }
    this.saveData = result.data;
    this.simNow = Date.now();
    this.saveData = { ...this.saveData, lastTick: this.simNow };
    this.persist();
    this.sync();
    setUiState({ backupCode: "" });
    pushToast(`✅ Backup dipulihkan — selamat datang kembali, ${result.data.pet.name}!`);
    eventBus.emit("pet/say", { text: "Kyuu~!" });
  }

  // ===== Breeding online via Supabase (M8 — Doc 07 §2B) =====

  /** Payload gen pet aktif untuk Breeding Code (owner = auth user id JWT). */
  private ownGenPayload(): BreedingCodePayload | null {
    const save = this.saveData;
    if (!save) return null;
    const owner = getCachedUserId() ?? getOrCreateAnonId();
    return breedingCodePayloadOf(save.pet, owner, save.breeding.lineage?.gen ?? 1);
  }

  /** ID request yang sudah diklaim di perangkat ini (filter inbox). */
  private claimedRequestIds(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem("hagumi_online_claimed") ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  }

  private markClaimed(requestId: string): void {
    const ids = [...this.claimedRequestIds(), requestId];
    localStorage.setItem("hagumi_online_claimed", JSON.stringify(ids));
  }

  /** Buka layar Tukar Kode + mulai polling inbox (buka game = polling — Doc 07 §2B). */
  onlineOpen(): void {
    const save = this.saveData;
    if (!save) return;
    const payload = this.ownGenPayload();
    const gate = checkBreedingRequirements(save.pet, save.breeding, this.simNow);
    setUiState({
      onlineBreeding: {
        status: getOnlineConfig() ? "ready" : "unconfigured",
        myCode: payload ? encodeBreedingCode(payload) : "",
        canBreed: gate.allowed,
        reasons: gate.allowed ? [] : gate.reasons,
        requests: [],
        sentToday: readSentToday(this.dayKey(this.simNow)),
        maxPerDay: MAX_BREEDING_REQUESTS_PER_DAY,
        busy: false,
      },
    });
    void this.onlineRefresh();
    this.startOnlinePoll();
    // M9 keamanan: pastikan owner kode = auth user id (JWT sub). Bila sesi
    // selesai setelah kode dibuat, perbarui kode & sinkron ulang inbox.
    void ensureAuthUserId().then((uid) => {
      const current = getGameState().onlineBreeding;
      const payload = this.ownGenPayload();
      if (!uid || !current || !payload) return;
      const fresh = encodeBreedingCode(payload);
      if (fresh !== current.myCode) {
        setUiState({ onlineBreeding: { ...current, myCode: fresh } });
        void this.onlineRefresh();
      }
    });
  }

  onlineClose(): void {
    this.stopOnlinePoll();
    setUiState({ onlineBreeding: null });
  }

  private startOnlinePoll(): void {
    this.stopOnlinePoll();
    if (!getOnlineConfig()) return;
    this.onlinePoll = window.setInterval(() => void this.onlineRefresh(), 30_000);
  }

  private stopOnlinePoll(): void {
    if (this.onlinePoll !== null) {
      window.clearInterval(this.onlinePoll);
      this.onlinePoll = null;
    }
  }

  /** Ambil inbox: request masuk/keluar + hasil telur siap (polling asinkron). */
  async onlineRefresh(): Promise<void> {
    const config = getOnlineConfig();
    const current = getGameState().onlineBreeding;
    if (!config || !current || !current.myCode) return;
    setUiState({ onlineBreeding: { ...current, busy: true } });
    const result = await onlineApi.inbox(config, current.myCode);
    const latest = getGameState().onlineBreeding;
    if (!latest) return; // layar ditutup di tengah jalan
    if (!result.ok) {
      setUiState({ onlineBreeding: { ...latest, status: "offline", busy: false } });
      return;
    }
    const claimed = this.claimedRequestIds();
    const requests = result.data.requests
      .map((r) => toRequestUi(r, claimed))
      .filter((r): r is OnlineRequestUi => r !== null);
    setUiState({
      onlineBreeding: {
        ...latest,
        status: "ready",
        busy: false,
        requests,
        sentToday: Math.max(result.data.sentToday, readSentToday(this.dayKey(this.simNow))),
        maxPerDay: result.data.maxPerDay || MAX_BREEDING_REQUESTS_PER_DAY,
      },
    });
  }

  /** Tempel kode teman → kirim request breeding (gerbang + rate limit klien). */
  async onlineSend(code: string): Promise<void> {
    const config = getOnlineConfig();
    const save = this.saveData;
    const current = getGameState().onlineBreeding;
    if (!config || !save || !current || !current.myCode) return;
    const decoded = decodeBreedingCode(code);
    if (!decoded.success) {
      pushToast(`❌ ${decoded.error}`);
      return;
    }
    if (decoded.payload.owner === (getCachedUserId() ?? getOrCreateAnonId())) {
      pushToast("❌ Itu kodemu sendiri 🦊");
      return;
    }
    const gate = checkBreedingRequirements(save.pet, save.breeding, this.simNow);
    if (!gate.allowed) {
      pushToast("Syarat breeding belum terpenuhi — cek daftar syarat");
      return;
    }
    if (readSentToday(this.dayKey(this.simNow)) >= MAX_BREEDING_REQUESTS_PER_DAY) {
      pushToast(`📵 Batas ${MAX_BREEDING_REQUESTS_PER_DAY} request/hari tercapai — coba lagi besok`);
      return;
    }
    setUiState({ onlineBreeding: { ...current, busy: true } });
    const result = await onlineApi.send(config, current.myCode, code);
    if (!result.ok) {
      pushToast(`❌ ${result.error}`);
      await this.onlineRefresh();
      return;
    }
    bumpSentToday(this.dayKey(this.simNow));
    pushToast("📨 Permintaan terkirim — hasil muncul saat kalian berdua buka game");
    await this.onlineRefresh();
  }

  async onlineAccept(requestId: string): Promise<void> {
    const config = getOnlineConfig();
    const current = getGameState().onlineBreeding;
    if (!config || !current || !current.myCode) return;
    setUiState({ onlineBreeding: { ...current, busy: true } });
    const result = await onlineApi.accept(config, current.myCode, requestId);
    if (!result.ok) pushToast(`❌ ${result.error}`);
    else pushToast("🤝 Sepakat! Telur disiapkan — hasil muncul saat kalian berdua buka game");
    await this.onlineRefresh();
  }

  async onlineDecline(requestId: string): Promise<void> {
    const config = getOnlineConfig();
    if (!config) return;
    await onlineApi.decline(config, requestId);
    await this.onlineRefresh();
  }

  /** Klaim telur hasil pertukaran kode → altar (genetika dihitung lokal dari seed). */
  async onlineClaim(requestId: string): Promise<void> {
    const config = getOnlineConfig();
    const save = this.saveData;
    const current = getGameState().onlineBreeding;
    if (!config || !save || !current) return;
    if (save.breeding.egg) {
      pushToast("🥚 Altar sudah penuh (maks 1 telur)");
      return;
    }
    const gate = checkBreedingRequirements(save.pet, save.breeding, this.simNow);
    if (!gate.allowed) {
      pushToast("Syarat breeding belum terpenuhi — cek daftar syarat");
      return;
    }
    setUiState({ onlineBreeding: { ...current, busy: true } });
    const result = await onlineApi.claim(config, requestId);
    if (!result.ok) {
      pushToast(`❌ ${result.error}`);
      await this.onlineRefresh();
      return;
    }
    const payload = this.ownGenPayload();
    const partner = result.data.partner as Record<string, unknown> | null;
    const seed = result.data.seed;
    if (!payload || seed === null || !partner || typeof partner.owner !== "string") {
      pushToast("⏳ Data mitra belum lengkap — buka lagi nanti");
      await this.onlineRefresh();
      return;
    }
    const partnerPayload = partner as unknown as BreedingCodePayload;
    // Genetika deterministik dari seed server — identik di kedua pemain (Doc 07 §3).
    const genetics = computeOnlineChildGenetics(payload, partnerPayload, seed);
    const avg =
      (save.pet.stats.hunger + save.pet.stats.happiness + save.pet.stats.energy + save.pet.stats.hygiene) / 4;
    const bonusPoints = (avg * genetics.startBonusPct) / 100;
    const childGen = (save.breeding.lineage?.gen ?? 1) + 1;
    const childNo = save.breeding.childrenCount + 1;
    const egg = createBreedingEgg(
      genetics,
      [
        petToLineageParent(save.pet, this.livedDaysOf(save.pet)),
        {
          name: partnerPayload.name,
          element: partnerPayload.element,
          path: partnerPayload.path,
          coatColor: partnerPayload.coatColor,
        },
      ],
      childGen,
      this.simNow,
      bonusPoints,
    );
    this.saveData = {
      ...save,
      pet: this.addHappiness(save.pet, breedingConfig.breedEffect.happinessBonus),
      breeding: {
        ...save.breeding,
        childrenCount: childNo,
        cooldownUntil: this.simNow + breedingConfig.requirements.cooldownDays * MS_PER_DAY,
        egg,
      },
    };
    this.markClaimed(requestId);
    this.recordMemory("breed", `keturunan ke-${childNo} bersama ${partnerPayload.name} (online)`);
    this.sync();
    this.persist();
    pushToast(
      genetics.element === "mystic"
        ? "🥚 Telur mistik ✨ dari pertukaran kode!"
        : `🥚 Telur turunan (${genetics.element}) di altar — hasil tukar kode!`,
    );
    eventBus.emit("pet/say", { text: "Kyuu~! Teman baru dari jauh!" });
    await this.onlineRefresh();
  }

  // ===== Cloud backup opsional (M8 — Doc 09 §4 & §7: LWW + diff warning) =====

  async cloudPush(): Promise<void> {
    const config = getOnlineConfig();
    const save = this.saveData;
    if (!config || !save) {
      pushToast("📵 Supabase belum dikonfigurasi — backup lokal saja");
      return;
    }
    setUiState({ cloudSync: { ...getGameState().cloudSync, busy: true } });
    const result = await onlineApi.push(config, save, save.lastTick);
    if (!result.ok) pushToast(`❌ ${result.error}`);
    else if (!result.data.ok) pushToast("☁️ Versi awan lebih baru — tarik dulu untuk membandingkan");
    else pushToast("☁️ Save terunggah ke awan");
    setUiState({ cloudSync: { ...getGameState().cloudSync, busy: false } });
  }

  async cloudPull(): Promise<void> {
    const config = getOnlineConfig();
    const save = this.saveData;
    if (!config || !save) {
      pushToast("📵 Supabase belum dikonfigurasi");
      return;
    }
    setUiState({ cloudSync: { ...getGameState().cloudSync, busy: true, diffSummary: null } });
    const result = await onlineApi.pull(config);
    setUiState({ cloudSync: { ...getGameState().cloudSync, busy: false } });
    if (!result.ok) {
      pushToast(`❌ ${result.error}`);
      return;
    }
    if (!result.data.save) {
      pushToast("☁️ Belum ada backup di awan — unggah dulu");
      return;
    }
    const parsed = saveDataSchemaV2.safeParse(result.data.save);
    if (!parsed.success) {
      pushToast("❌ Backup awan tidak valid");
      return;
    }
    const diff = diffSaves(save, parsed.data);
    if (diff.identical) {
      pushToast("✅ Data awan sama dengan save lokal");
      return;
    }
    this.cloudRemote = parsed.data;
    setUiState({ cloudSync: { busy: false, diffSummary: diff.summary, localNewer: diff.localNewer } });
  }

  /** Keputusan akhir pemain setelah diff warning — pemenang sesuai lastTick (LWW). */
  cloudRestore(): void {
    const remote = this.cloudRemote;
    const save = this.saveData;
    if (!remote || !save) return;
    const lww = resolveLastWriteWins(save, remote);
    this.saveData = { ...lww.data, lastTick: Date.now() };
    this.cloudRemote = null;
    this.persist();
    this.sync();
    setUiState({ cloudSync: { busy: false, diffSummary: null, localNewer: false } });
    pushToast(
      `☁️ Selesai — ${lww.chosen === "remote" ? "data awan" : "data lokal"} lebih baru dan dipertahankan`,
    );
    eventBus.emit("pet/say", { text: "Kyuu~!" });
  }

  // ===== Debug time-lapse (Doc 03 §6 — hanya build dev) =====

  setSpeed(multiplier: 1 | 10 | 60 | 3600): void {
    this.speed = multiplier;
    pushToast(`⏩ Time-lapse ×${multiplier}`);
  }

  /** Masuk Home dari Splash [Lanjutkan] — save sudah dimuat di constructor. */
  continueGame(): void {
    if (!this.hasSave) return;
    setUiState({ screen: "home" });
    this.sync();
    this.checkLoginStreak();
  }

  /** Geser jam sim ke awal fase yang diminta (tanpa decay — dev tool). */
  setPhase(phase: DayPhase): void {
    const targetHour = { morning: 5, day: 10, evening: 15, night: 19 }[phase];
    const d = new Date(this.simNow);
    const deltaHours = targetHour - d.getHours();
    d.setHours(targetHour, 0, 0, 0);
    this.simNow = d.getTime();
    if (this.saveData) this.saveData = { ...this.saveData, lastTick: this.simNow };
    this.sync();
    pushToast(`🕐 Fase → ${phase} (${deltaHours >= 0 ? "+" : ""}${deltaHours} jam)`);
  }

  /** Skip +1 hari DENGAN decay penuh — untuk uji balance (Doc 03 §6). */
  skipDay(): void {
    const save = this.saveData;
    if (!save) return;
    const from = this.simNow;
    this.simNow += MS_PER_DAY;
    const result = processOfflineCatchUp(save.pet, from, this.simNow);
    this.saveData = { ...save, pet: result.pet };
    this.sync();
    this.persist();
    pushToast(`⏭️ +1 hari — ${result.summaryText}`);
  }
}

let runtime: GameRuntime | null = null;

/** Flag tutorial disimpan terpisah dari save (Doc 04 §5) — tetap ada walau save dihapus. */
const TUTORIAL_KEY = "hagumi_tutorial_done";

export function initGameSystem(): () => void {
  runtime = new GameRuntime();
  runtime.sync();
  setUiState({
    hasSave: runtime.hasSave,
    tutorialDone: localStorage.getItem(TUTORIAL_KEY) === "1",
  });
  if (runtime.hasSave) runtime.startTicker();
  // M9 keamanan: siapkan sesi Anonymous Auth di awal (JWT untuk edge function)
  void ensureAuthUserId();

  // M5 — musik ambient: mulai saat game berjalan & pantau perubahan musim/fase
  if (runtime.hasSave) {
    applyAudioSettings(runtime.settingsSnapshot);
    startAmbientMusic();
    window.setInterval(() => startAmbientMusic(), 10_000);
    // Notifikasi lokal: minta izin dari interaksi pertama (kebijakan browser)
    const askNotify = (): void => {
      void webNotifier.requestPermission();
    };
    window.addEventListener("pointerdown", askNotify, { once: true });
  }

  // Autosave: aksi (persist di tiap aksi) + visibilitychange + pagehide (Doc ROADMAP Fase D)
  const onVisibility = (): void => {
    if (document.hidden) runtime?.flush();
  };
  const onPageHide = (): void => runtime?.flush();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);

  const offs = [
    eventBus.on("ui/action", ({ id }) => {
      const label = UNSCRIPTED[id];
      if (label) pushToast(`${label} — datang di milestone berikutnya`);
    }),
    eventBus.on("ui/feed", ({ foodId }) => runtime?.feed(foodId)),
    eventBus.on("ui/bath", () => runtime?.bathe()),
    eventBus.on("ui/sleep", () => runtime?.toggleSleep()),
    eventBus.on("ui/buy", ({ itemId }) => runtime?.buy(itemId)),
    eventBus.on("ui/use-medicine", () => runtime?.useFirstMedicine()),
    eventBus.on("ui/memorial-continue", () => runtime?.resetAfterDeath()),
    eventBus.on("ui/evolve-continue", () => runtime?.evolveContinue()),
    eventBus.on("game/pet-tap", () => runtime?.poke()),
    eventBus.on("game/pet-stroke", () => {
      runtime?.stroke();
      runtime?.noteInteraction("stroke");
    }),
    eventBus.on("game/poop-scoop", () => runtime?.scoop()),
    eventBus.on("ui/minigame-start", ({ gameId }) => runtime?.minigameStart(gameId)),
    eventBus.on("game/minigame-result", ({ gameId, points, coinBonus }) =>
      runtime?.minigameResult(gameId, points, coinBonus),
    ),
    eventBus.on("ui/minigame-continue", () => runtime?.minigameContinue()),
    eventBus.on("ui/koi-feed", () => runtime?.koiFeed()),
    eventBus.on("ui/event-cta", ({ id }) => runtime?.claimSeasonEvent(id)),
    eventBus.on("ui/backup-export", () => runtime?.exportBackup()),
    eventBus.on("ui/backup-import", ({ code }) => runtime?.importBackup(code)),
    // M6 — layar Chat companion (Doc 12 §8, Doc 11 §2)
    eventBus.on("ui/chat-open", () => runtime?.chatOpen()),
    eventBus.on("ui/chat-close", () => runtime?.chatClose()),
    eventBus.on("ui/chat-send", ({ text }) => runtime?.chatSend(text)),
    // M7 — Breeding & keturunan (Doc 07, Doc 12 §9)
    eventBus.on("ui/breeding-open", () => runtime?.breedingOpen()),
    eventBus.on("ui/breeding-close", () => runtime?.breedingClose()),
    eventBus.on("ui/breeding-start", ({ partnerId }) => runtime?.breedingStart(partnerId)),
    eventBus.on("ui/album-open", () => runtime?.albumOpen()),
    eventBus.on("ui/album-close", () => runtime?.albumClose()),
    eventBus.on("ui/legacy-continue", () => runtime?.continueLineage()),
    // M8 — breeding online via Supabase & cloud backup (Doc 07 §2B, Doc 09 §7)
    eventBus.on("ui/online-open", () => runtime?.onlineOpen()),
    eventBus.on("ui/online-close", () => runtime?.onlineClose()),
    eventBus.on("ui/online-refresh", () => void runtime?.onlineRefresh()),
    eventBus.on("ui/online-send", ({ code }) => void runtime?.onlineSend(code)),
    eventBus.on("ui/online-accept", ({ requestId }) => void runtime?.onlineAccept(requestId)),
    eventBus.on("ui/online-decline", ({ requestId }) => void runtime?.onlineDecline(requestId)),
    eventBus.on("ui/online-claim", ({ requestId }) => void runtime?.onlineClaim(requestId)),
    eventBus.on("ui/cloud-push", () => void runtime?.cloudPush()),
    eventBus.on("ui/cloud-pull", () => void runtime?.cloudPull()),
    eventBus.on("ui/cloud-restore", () => runtime?.cloudRestore()),
    // M5 — audio: SFX dari scene + pengaturan musik/SFX/notify/offline-LLM
    eventBus.on("sfx/play", ({ id }) => audioEngine.playSfx(id)),
    eventBus.on("ui/settings", (s) => runtime?.applySettings(s)),
    // Musik ambient mengikuti musim & fase waktu (Doc 10 §5: 4 musim × siang/malam)
    eventBus.on("ui/continue", () => startAmbientMusic()),
    eventBus.on("ui/continue", () => runtime?.continueGame()),
    eventBus.on("ui/new-game", ({ name, element }) => {
      runtime?.startNewGame(name, element);
      runtime?.startTicker();
    }),
    eventBus.on("ui/tutorial-dismiss", () => {
      localStorage.setItem(TUTORIAL_KEY, "1");
      setUiState({ tutorialDone: true });
    }),
    eventBus.on("debug/speed", ({ multiplier }) => runtime?.setSpeed(multiplier)),
    eventBus.on("debug/set-phase", ({ phase }) => runtime?.setPhase(phase)),
    eventBus.on("debug/skip-day", () => runtime?.skipDay()),
  ];
  return () => {
    offs.forEach((off) => off());
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    runtime = null;
  };
}
