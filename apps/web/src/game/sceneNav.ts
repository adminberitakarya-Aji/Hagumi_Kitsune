/** Navigasi antar-scene via EventBus (Doc 09 §2): scene aktif mendengarkan scene/goto
 * dan berpindah bila target berbeda. Hanya satu scene aktif → hanya satu listener hidup. */
import type { Scene } from "phaser";
import { eventBus } from "../lib/eventBus";

export function bindSceneNav(scene: Scene, currentKey: string): () => void {
  return eventBus.on("scene/goto", ({ key, gameId, best }) => {
    if (key === currentKey) return;
    scene.scene.start(key, { gameId, best });
  });
}
