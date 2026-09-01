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
  type ActionRejectReason,
  type PetData,
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
  gear: "⚙️ Pengaturan",
  toko: "🏪 Toko",
  album: "📖 Album",
  chat: "💬 Chat",
  "door-garden": "⛩️ Taman",
  "door-kitchen": "🍵 Dapur (scene)",
};

class GameRuntime {
  private readonly saveSystem: SaveSystem;
  private saveData: SaveData;
  private recentFeeds: number[] = [];

  constructor() {
    const primary = new SaveSystem(new WebStorage(), new SystemClock());
    const loaded = primary.load();
    if (loaded.success) {
      this.saveSystem = primary;
      this.saveData = loaded.data;
      return;
    }
    if (loaded.error === "CORRUPTED") pushToast("⚠️ Save lama rusak — pet baru dimulai");
    // Storage gagal / belum ada save → starter kit (Doc 04) + fallback MemoryStorage
    this.saveSystem = new SaveSystem(new MemoryStorage(), new SystemClock());
    this.saveData = createDefaultSave({
      petName: "Kogitsune",
      element: "fire",
      nowMs: Date.now(),
    });
    this.persist();
  }

  private get pet(): PetData {
    return this.saveData.pet;
  }

  /** PetData → GameUiState (satu arah: core → store → React). */
  sync(): void {
    const pet = this.saveData.pet;
    const day = Math.floor((Date.now() - pet.birthAt) / MS_PER_DAY) + 1;
    setUiState({
      petName: pet.name,
      day,
      coins: this.saveData.player.coins,
      health: pet.stats.health,
      sleeping: pet.state === "sleeping",
      stats: {
        hunger: pet.stats.hunger,
        happiness: pet.stats.happiness,
        energy: pet.stats.energy,
        hygiene: pet.stats.hygiene,
      },
    });
  }

  private persist(): void {
    const result = this.saveSystem.save(this.saveData);
    if (!result.success) pushToast("⚠️ Gagal menyimpan progress");
  }

  private reject(reason: ActionRejectReason): void {
    pushToast(REJECT_TEXT[reason]);
    eventBus.emit("pet/say", { text: REJECT_TEXT[reason] });
  }

  private finishTransientAfter(ms: number): void {
    window.setTimeout(() => {
      this.saveData = {
        ...this.saveData,
        pet: PetStateMachine.finishTransientState(this.saveData.pet),
      };
      this.sync();
    }, ms);
  }

  feed(foodId: string): void {
    const food = FOODS.find((f) => f.id === foodId);
    if (!food) return;
    if (this.saveData.player.coins < food.price) {
      pushToast("🪙 Koin tidak cukup");
      return;
    }
    const result = PetStateMachine.feed(this.pet, {
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
      ...this.saveData,
      pet: result.pet,
      player: { ...this.saveData.player, coins: this.saveData.player.coins - food.price },
    };
    this.recentFeeds.push(Date.now());
    this.sync();
    this.persist();
    pushToast(`${food.icon} Kenyang! 🍖+${food.hunger}`);
    eventBus.emit("pet/eat", { label: food.icon });
    this.finishTransientAfter(1800);
  }

  bathe(): void {
    const result = PetStateMachine.bathe(this.pet);
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.saveData = { ...this.saveData, pet: result.pet };
    this.sync();
    this.persist();
    pushToast("♨️ Wangi sedap! 😊+5");
    eventBus.emit("pet/say", { text: "Kyaa~ segarnya!" });
    this.finishTransientAfter(2000);
  }

  toggleSleep(): void {
    const sleeping = this.pet.state === "sleeping";
    const result = sleeping ? PetStateMachine.wake(this.pet) : PetStateMachine.sleep(this.pet);
    if (!result.success) {
      if (result.reason) this.reject(result.reason);
      return;
    }
    this.saveData = { ...this.saveData, pet: result.pet };
    this.sync();
    this.persist();
    eventBus.emit("pet/sleep", { on: !sleeping });
    if (!sleeping) pushToast("🛏️ Selamat tidur...");
  }

  poke(): void {
    eventBus.emit("pet/say", {
      text:
        this.pet.state === "sleeping"
          ? "Zzz..."
          : (PAT_LINES[Math.floor(Math.random() * PAT_LINES.length)] ?? "Kyuu?"),
    });
  }

  stroke(): void {
    const result = PetStateMachine.pet(this.pet); // Happiness +2 (Doc 02 S4)
    if (!result.success) {
      if (result.reason === "ALREADY_SLEEPING") eventBus.emit("pet/say", { text: "Zzz..." });
      return;
    }
    this.saveData = { ...this.saveData, pet: result.pet };
    this.sync();
    this.persist();
    eventBus.emit("fx/hearts", undefined);
  }
}

let runtime: GameRuntime | null = null;

export function initGameSystem(): () => void {
  runtime = new GameRuntime();
  runtime.sync();
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
  ];
  return () => {
    offs.forEach((off) => off());
    runtime = null;
  };
}
