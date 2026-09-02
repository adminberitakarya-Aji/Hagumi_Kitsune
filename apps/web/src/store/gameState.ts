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

export interface GameUiState {
  /** Layar aktif: splash (dengan onboarding di dalamnya) atau home. */
  screen: "splash" | "home";
  /** true = ada save valid → Splash menampilkan [Lanjutkan] (Doc 04 §1). */
  hasSave: boolean;
  /** Tutorial ringan Dapur (Doc 04 §5) — sekali saja, flag di localStorage. */
  tutorialDone: boolean;
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
  /** Jumlah ekor saat ini (1–9) — indikator tahap hidup (Doc 01 §3). */
  tails: number;
  /** Care Score 0–100 (dibulatkan) — ditampilkan di HUD sejak M3. */
  careScore: number;
  /** Kode backup base64 hasil ekspor (Doc 09 §4). */
  backupCode: string;
}

const initialState: GameUiState = {
  screen: "splash",
  hasSave: false,
  tutorialDone: true,
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
  tails: 1,
  careScore: 50,
  backupCode: "",
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
