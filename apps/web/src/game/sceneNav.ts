/** Navigasi antar-scene via EventBus (Doc 09 §2): scene aktif mendengarkan scene/goto
 * dan berpindah bila target berbeda. Hanya satu scene aktif → hanya satu listener hidup.
 * M12 (Doc 14 §4): transisi kamera fade out/in — bukan cut hitam. */
import Phaser from "phaser";
import type { Scene } from "phaser";
import { eventBus } from "../lib/eventBus";

export function bindSceneNav(scene: Scene, currentKey: string): () => void {
  scene.cameras.main.fadeIn(220, 43, 43, 51); // scene baru masuk dengan lembut
  return eventBus.on("scene/goto", ({ key, gameId, best }) => {
    if (key === currentKey) return;
    const cam = scene.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.start(key, { gameId, best });
    });
    cam.fadeOut(220, 43, 43, 51);
  });
}
