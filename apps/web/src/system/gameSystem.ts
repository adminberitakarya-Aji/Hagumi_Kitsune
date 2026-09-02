/**
 * Game runtime (M1 Fase C) — jembatan EventBus → @hagumi/core (Doc 09 §2 aturan 3: one-way data).
 * SATU-SATUNYA tempat stat pet berubah di sisi web: aksi lewat PetStateMachine,
 * persistensi lewat SaveSystem. React & Phaser tidak pernah menyentuh core langsung.
 */
import {
  MemoryStorage,
  MS_PER_DAY,
  MS_PER_HOUR,
  PetStateMachine,
  SaveSystem,
  SystemClock,
  checkPathRecovery,
  createDefaultSave,
  evolveIfNeeded,
  processOfflineCatchUp,
  samplePetCare,
  shouldSpawnPoop,
  spawnPoop,
  scoopPoop,
  updateLoginStreak,
  type ActionRejectReason,
  type DayPhase,
  type EvolutionParams,
  type PetData,
  type PetElement,
  type PetStats,
  type SaveData,
} from "@hagumi/core";
import { evolutionConfig, getItemById, rulesConfig } from "@hagumi/data"; // katalog asli M2/M3 (fail-fast JSON)
import { eventBus } from "../lib/eventBus";
import { getGameState, setUiState } from "../store/gameState";
import { pushToast } from "../store/toastStore";
import { WebStorage } from "./webStorage";

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
  album: "📖 Album",
  chat: "💬 Chat",
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
    this.sync();
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
    eventBus.emit("pet/appearance", { element: pet.element, path: pet.path, tails: pet.tails });
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
    const state = this.saveData?.pet.state;
    eventBus.emit("pet/say", {
      text:
        state === "sleeping"
          ? "Zzz..."
          : (PAT_LINES[Math.floor(Math.random() * PAT_LINES.length)] ?? "Kyuu?"),
    });
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

  /** Setelah memorial: hapus save → kembali ke Splash/Altar (Doc 12 §11.4). */
  resetAfterDeath(): void {
    this.saveSystem.deleteSave();
    this.saveData = null;
    this.hasSave = false;
    this.recentFeeds = [];
    this.feedsSincePoop = 0;
    setUiState({ screen: "splash", hasSave: false, dead: false, offline: null });
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
    eventBus.on("ui/backup-export", () => runtime?.exportBackup()),
    eventBus.on("ui/backup-import", ({ code }) => runtime?.importBackup(code)),
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
