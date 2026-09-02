/**
 * BootScene (M5) — membangun seluruh aset seni final secara prosedural
 * (sprite kitsune 12 klip × 5 elemen + bg 12 scene + pola seigaiha/asanoha),
 * lalu lanjut ke scene pertama. Tidak ada file aset placeholder di build.
 */
import Phaser from "phaser";
import { getSeason, PET_ELEMENTS } from "@hagumi/core";
import { getGameState } from "../store/gameState";
import { buildKitsuneTextures } from "./art/kitsuneArt";
import { buildBackgrounds, type SeasonId } from "./art/bgArt";

const SEASON_MAP: Record<string, SeasonId> = {
  spring: "spring",
  summer: "summer",
  autumn: "autumn",
  winter: "winter",
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    // Sprite final: 12 klip × recolor 5 elemen (Doc 01 §6, Doc 10 §2)
    for (const element of PET_ELEMENTS) buildKitsuneTextures(this, element);
    // BG 12 scene varian musim aktif (musim mengikuti kalender nyata — Doc 03 §3)
    const season = SEASON_MAP[getSeason(getGameState().nowMs)] ?? "spring";
    buildBackgrounds(this, season);

    this.scene.start("home");
  }
}
