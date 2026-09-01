/** EventBus minimal bertipe (Doc 09 §2 aturan 3 — one-way data). */
import type { GameEventMap } from "./events";

type Handler<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

class TypedEventBus {
  private handlers = new Map<keyof GameEventMap, Set<(p: never) => void>>();

  /** Daftarkan listener; returns fungsi unsubscribe. */
  on<K extends keyof GameEventMap>(event: K, handler: Handler<K>): () => void {
    const set = this.handlers.get(event) ?? new Set<(p: never) => void>();
    set.add(handler as (p: never) => void);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler as (p: never) => void);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.handlers.get(event)?.forEach((handler) => {
      (handler as (p: GameEventMap[K]) => void)(payload);
    });
  }
}

export const eventBus = new TypedEventBus();
