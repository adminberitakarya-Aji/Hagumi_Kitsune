/** Toast (Doc 12 §2.5): top-center y=88, antrean maks 3, auto-hilang 2,5 dtk. */
import { useSyncExternalStore } from "react";

export interface ToastItem {
  id: number;
  text: string;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function pushToast(text: string): void {
  const item: ToastItem = { id: nextId++, text };
  toasts = [...toasts.slice(-2), item]; // antrean maks 3
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    notify();
  }, 2500);
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, () => toasts);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
