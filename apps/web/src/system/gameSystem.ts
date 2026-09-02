/**
 * Game runtime (M1 Fase C) — jembatan EventBus → @hagumi/core (Doc 09 §2 aturan 3: one-way data).
 * SATU-SATUNYA tempat stat pet berubah di sisi web: aksi lewat PetStateMachine,
 * persistensi lewat SaveSystem. React & Phaser tidak pernah menyentuh core langsung.
 */
import {
  MemoryStorage,
  MS_PER_DAY,
  PetStateMachine,
  SaveSystem,
  SystemClock,
  createDefaultSave,
  processOfflineCatchUp,
  type ActionRejectReason,
  type DayPhase,
  type PetData,
  type PetElement,
  type SaveData,
} from "@hagumi/core";
import { eventBus } from "../lib/eventBus";
import { FOODS } from "../data/foods";
import { setUiState } from "../store/gameState";
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
  INVALID_STATE: "...",
};

const PAT_LINES = ["Kyuu~!", "Laper...", "Main yuk!", "Ehehe~", "Hari ini cerah, ya!"];

const UNSCRIPTED: Record<string, string> = {
  koin: "🪙 Toko",
  toko: "🏪 Toko",
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
    this.hasSave = true;
    this.persist();
    this.sync();
    setUiState({ screen: "home" });
    pushToast(`Selamat datang, ${petName}! 🦊`);
    // Balon sapaan pertama sesuai kepribadian elemen (Doc 04 §4.4)
    eventBus.emit("pet/say", { text: FIRST_GREETING[element] });
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
    const result = processOfflineCatchUp(save.pet, from, this.simNow);
    this.saveData = { ...save, pet: result.pet };
    this.sync();
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
      stats: {
        hunger: pet.stats.hunger,
        happiness: pet.stats.happiness,
        energy: pet.stats.energy,
        hygiene: pet.stats.hygiene,
      },
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

  feed(foodId: string): void {
    const save = this.saveData;
    if (!save) return;
    const food = FOODS.find((f) => f.id === foodId);
    if (!food) return;
    if (save.player.coins < food.price) {
      pushToast("🪙 Koin tidak cukup");
      return;
    }
    const result = PetStateMachine.feed(save.pet, {
      hungerRestore: food.hunger,
      happinessBonus: food.happiness,
      isSnack: food.happiness !== undefined, // camilan boleh saat kenyang
      nowMs: Date.now(),
      recentFeeds: this.recentFeeds,
    });
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.saveData = {
      ...save,
      pet: result.pet,
      player: { ...save.player, coins: save.player.coins - food.price },
    };
    this.recentFeeds.push(Date.now());
    this.sync();
    this.persist();
    pushToast(`${food.icon} Kenyang! 🍖+${food.hunger}`);
    eventBus.emit("pet/eat", { label: food.icon });
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

  // ===== Autosave & backup (Doc 09 §4) =====

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
    eventBus.on("game/pet-tap", () => runtime?.poke()),
    eventBus.on("game/pet-stroke", () => runtime?.stroke()),
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
