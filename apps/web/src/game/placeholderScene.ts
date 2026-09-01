/** Scene placeholder Phaser (M1 Fase A) — diganti Scene Home asli di Fase C. */
import Phaser from "phaser";
import { decayConfig } from "@hagumi/data";

export class PlaceholderScene extends Phaser.Scene {
  private fox!: Phaser.GameObjects.Text;
  private dir = 1;

  constructor() {
    super("placeholder");
  }

  create(): void {
    // Latar tatami sederhana (placeholder — bg final di M5)
    this.add.rectangle(180, 340, 360, 496, 0xc9a87c);
    this.add.rectangle(180, 340, 344, 480, 0xb89a68).setStrokeStyle(2, 0x3d4a6b);

    // "Kitsune" placeholder — diganti sprite pixel-art (Doc 01 §6)
    this.fox = this.add.text(180, 340, "🦊", { fontSize: "48px" }).setOrigin(0.5);

    // Buktikan pipeline @hagumi/data → render (angka dari decay.json, bukan hard-code)
    this.add
      .text(180, 440, `decay hunger/siang: ${decayConfig.day.hunger}/jam`, {
        fontSize: "12px",
        color: "#3D4A6B",
      })
      .setOrigin(0.5);

    this.add
      .text(180, 200, "HAGUMI 育み — M1 Fase A", {
        fontSize: "16px",
        color: "#C1443C",
      })
      .setOrigin(0.5);

    // Interaksi pertama: ketuk = pet lompat (feedback <100ms, Doc 12 §2.6)
    this.input.on("pointerdown", () => {
      this.tweens.add({
        targets: this.fox,
        y: 300,
        duration: 120,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    });
  }

  override update(_time: number, _delta: number): void {
    this.fox.x += this.dir * 0.03;
    if (this.fox.x > 280 || this.fox.x < 80) this.dir *= -1;
  }
}
