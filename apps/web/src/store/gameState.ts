/**
 * Bridge state core → React (Doc 09 §2: one-way data).
 * Fase B/C: store ini akan diisi dari EventBus core (stat berubah → setUiState).
 * React TIDAK pernah menyentuh objek Phaser — hanya membaca state & mengirim aksi.
 */
import { useSyncExternalStore } from "react";

export type StatKey = "hunger" | "happiness" | "energy" | "hygiene";

export interface GameUiState {
  petName: string;
  day: number;
  coins: number;
  health: number;
  stats: Record<StatKey, number>;
}

const initialState: GameUiState = {
  petName: "Kogitsune",
  day: 1,
  coins: 100,
  health: 90,
  stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 },
};

let state: GameUiState = initialState;
const listeners = new Set<() => void>();

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
