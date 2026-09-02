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
  /** Hasil offline catch-up saat buka game (Doc 12 §11.1); null = tidak tampil. */
  offline: OfflineSummaryUi | null;
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
  offline: null,
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
