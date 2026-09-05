/**
 * Bridge state core → React (Doc 09 §2: one-way data).
 * Fase B/C: store ini akan diisi dari EventBus core (stat berubah → setUiState).
 * React TIDAK pernah menyentuh objek Phaser — hanya membaca state & mengirim aksi.
 */
import { useSyncExternalStore } from "react";

export type StatKey = "hunger" | "happiness" | "energy" | "hygiene";

export interface OfflineSummaryUi {
  summaryText: string;
  elapsedHours: number;
  poopsSpawned: number;
  becameSick: boolean;
  died: boolean;
}

export interface InventoryUi {
  food: Record<string, number>;
  medicine: Record<string, number>;
  owned: string[];
}

export interface LoginRewardUi {
  day: number;
  coins: number;
}

export interface EvolutionUi {
  kind: "first" | "final" | "elder";
  tier: string;
  path?: string;
}

export interface MinigameResultUi {
  gameId: string;
  name: string;
  icon: string;
  points: number;
  coins: number;
  happiness: number;
  best: number;
  newRecord: boolean;
}

/** Layar Chat companion (M6 — Doc 12 §8). */
export interface ChatMessageUi {
  /** "player" = pesan pemain, "pet" = balasan companion. */
  from: "player" | "pet";
  text: string;
}

export interface ChatUi {
  messages: ChatMessageUi[];
  /** Sisa kuota happiness hari ini (Doc 08 §5: maks +10/hari). */
  quotaLeft: number;
  /** true = ada memori lalai yang bisa dimaafkan lewat kata "maaf". */
  canForgive: boolean;
  /** true = companion "sedang mengetik" (3 titik — Doc 12 §8). */
  typing?: boolean;
  /** Tingkat provider aktif (M9 — Doc 11 §1): tier2 = LLM via edge. */
  tier: "tier1" | "tier2";
}

/* Breeding & keturunan (M7 — Doc 07, Doc 12 §9) */

/** Mitra NPC harian + preview anak deterministik (Doc 12 §9.2). */
export interface BreedingPartnerUi {
  id: string;
  name: string;
  element: string;
  /** Elemen anak hasil kombinasi (tabel mix — deterministik). */
  childElement: string;
  /** Warna bulu anak hasil mix HSV (deterministik, tanpa jitter). */
  childCoat: string;
}

export interface BreedingUi {
  partners: BreedingPartnerUi[];
  canBreed: boolean;
  /** Alasan gerbang (TOO_YOUNG/LOW_HEALTH/...) untuk daftar syarat UI. */
  reasons: string[];
  costCoins: number;
  cooldownLeftMs: number;
  childrenCount: number;
  maxChildren: number;
  happinessBonus: number;
  hasEgg: boolean;
}

export interface AlbumPersonUi {
  name: string;
  element: string;
  path: string;
  livedDays?: number;
  careScore?: number;
}

export interface AlbumUi {
  pet: {
    name: string;
    element: string;
    path: string;
    coatColor?: string;
    day: number;
    careScore: number;
    gen: number;
    childrenCount: number;
  };
  egg: { element: string; coatColor: string; gen: number; parents: AlbumPersonUi[] } | null;
  /** Silsilah maks 3 generasi (Doc 07 §4): baris-0 = orangtua pet aktif. */
  generations: AlbumPersonUi[][];
}

/** Warisan pet yang mati (Doc 07 §5) — tampil di Memorial. */
export interface LegacyUi {
  name: string;
  livedDays: number;
  memoryCoins: number;
  inheritedItemName: string | null;
  hasEgg: boolean;
  childName: string | null;
  childElement: string | null;
  childCoat: string | null;
}

/* Breeding online via Supabase (M8 — Doc 07 §2B) */

/** Satu permintaan breeding online di menu Tukar Kode. */
export interface OnlineRequestUi {
  id: string;
  /** "pending" = menunggu mitra, "ready" = telur siap diklaim. */
  status: "pending" | "ready";
  direction: "incoming" | "outgoing";
  partnerName: string;
  partnerElement: string;
  partnerCoat: string;
  partnerGen: number;
  createdAt: number;
}

/** Layar Tukar Kode antar-pemain (M8); null = tertutup. */
export interface OnlineBreedingUi {
  /** "unconfigured" = Supabase belum diset; "offline" = server tak terjangkau. */
  status: "unconfigured" | "offline" | "ready";
  myCode: string;
  canBreed: boolean;
  reasons: string[];
  requests: OnlineRequestUi[];
  sentToday: number;
  maxPerDay: number;
  busy: boolean;
}

/** Status cloud backup di Pengaturan (M8 — sinkronisasi opsional). */
export interface CloudSyncUi {
  busy: boolean;
  /** Ringkasan diff — tampil sebagai warning konflik (LWW). */
  diffSummary: string | null;
  localNewer: boolean;
}

/** Hint kontekstual FTUE 2.0 (M14 — Doc 14 §6); null = tidak tampil. */
export interface HintUi {
  id: string;
  text: string;
  /** futon/toko → sheet App · album → layar Album · garden → scene Taman. */
  cta: string | null;
  ctaLabel: string | null;
}

/** Goal eksplisit hari-1 (M14 — Doc 14 §6): "jaga tetap hidup 1 hari penuh". */
export interface DayGoalUi {
  title: string;
  subtitle: string;
}

export interface GameUiState {
  /** Layar aktif: splash (dengan onboarding di dalamnya) atau home. */
  screen: "splash" | "home";
  /** true = ada save valid → Splash menampilkan [Lanjutkan] (Doc 04 §1). */
  hasSave: boolean;
  /** Tutorial ringan Dapur (Doc 04 §5) — sekali saja, flag di localStorage. */
  tutorialDone: boolean;
  /** Hint kontekstual aktif (M14 — Doc 14 §6); null = tidak tampil. */
  hint: HintUi | null;
  /** Goal hari-1 (M14 — Doc 14 §6); null = selesai/tidak relevan. */
  dayGoal: DayGoalUi | null;
  petName: string;
  day: number;
  coins: number;
  health: number;
  sleeping: boolean;
  /** Jam simulasi saat ini (ms epoch) — mengikuti time-lapse debug. */
  nowMs: number;
  stats: Record<StatKey, number>;
  /** Poop aktif di tatami (maks 3, Doc 12 §3.3). */
  poopCount: number;
  /** State SICK — menampilkan banner obat (Doc 12 §11.5). */
  sick: boolean;
  /** Pet meninggal — Memorial (Doc 12 §11.4). */
  dead: boolean;
  /** Inventaris (Doc 09 §3) untuk Dapur & Toko. */
  inventory: InventoryUi;
  /** Hadiah login hari ini (Doc 12 §11.2); null = tidak tampil. */
  loginReward: LoginRewardUi | null;
  /** Hasil offline catch-up saat buka game (Doc 12 §11.1); null = tidak tampil. */
  offline: OfflineSummaryUi | null;
  /** Cutscene evolusi aktif (Doc 12 §11.3); null = tidak tampil. */
  evolution: EvolutionUi | null;
  /** Jalur folklor terkunci (tenko/zenko/biasa/yako/nogitsune) — label tier HUD. */
  path: string;
  /** Elemen pet (fire/water/wind/earth/mystic) — untuk tint/visual scene. */
  element: string;
  /** Kepribadian dialog (M7 warisan; default = elemen) — bobot otonomi M13. */
  personality: string;
  /** Jumlah ekor saat ini (1–9) — indikator tahap hidup (Doc 01 §3). */
  tails: number;
  /** Care Score 0–100 (dibulatkan) — ditampilkan di HUD sejak M3. */
  careScore: number;
  /** Layar hasil mini-game (Doc 05 §6); null = tidak tampil. */
  minigameResult: MinigameResultUi | null;
  /** Layar Chat companion (M6 — Doc 12 §8); null = tertutup. */
  chat: ChatUi | null;
  /** Layar Breeding House (M7 — Doc 12 §9.2); null = tertutup. */
  breeding: BreedingUi | null;
  /** Layar Album (M7 — Doc 12 §9.1); null = tertutup. */
  album: AlbumUi | null;
  /** Warisan pet mati (M7 — Doc 07 §5); null = tidak ada / sudah dilanjutkan. */
  legacy: LegacyUi | null;
  /** Kode backup base64 hasil ekspor (Doc 09 §4). */
  backupCode: string;
  /** Layar Tukar Kode breeding online (M8 — Doc 07 §2B); null = tertutup. */
  onlineBreeding: OnlineBreedingUi | null;
  /** Status cloud backup (M8 — sinkronisasi opsional). */
  cloudSync: CloudSyncUi;
}

const initialState: GameUiState = {
  screen: "splash",
  hasSave: false,
  tutorialDone: true,
  hint: null,
  dayGoal: null,
  petName: "Kogitsune",
  day: 1,
  coins: 100,
  health: 90,
  sleeping: false,
  nowMs: Date.now(),
  stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 },
  poopCount: 0,
  sick: false,
  dead: false,
  inventory: { food: {}, medicine: {}, owned: [] },
  loginReward: null,
  offline: null,
  evolution: null,
  path: "biasa",
  element: "fire",
  personality: "fire",
  tails: 1,
  careScore: 50,
  minigameResult: null,
  chat: null,
  breeding: null,
  album: null,
  legacy: null,
  backupCode: "",
  onlineBreeding: null,
  cloudSync: { busy: false, diffSummary: null, localNewer: false },
};

let state: GameUiState = initialState;
const listeners = new Set<() => void>();

/** Akses state saat ini (dipakai system, bukan komponen React). */
export function getGameState(): GameUiState {
  return state;
}

export function setUiState(patch: Partial<GameUiState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGameState(): GameUiState {
  return useSyncExternalStore(subscribe, () => state);
}
