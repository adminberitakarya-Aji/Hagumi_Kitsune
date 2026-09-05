/** Wanage (Doc 05 §3): timing meter — ring meluncur, ketuk untuk lempar ke tiang target.
 * 8 lemparan (config); tiang: biasa 10, emas (kecil & jauh) 40, bergerak 30.
 * Angin acak per lemparan menggeser jurangan; elemen wind = indikator angin terlihat jelas. */
import Phaser from "phaser";
import { getMinigameById } from "@hagumi/data";
import { MinigameBase } from "./MinigameBase";
import { eventBus } from "../../lib/eventBus";
import { getGameState } from "../../store/gameState";

type PegKind = "normal" | "gold" | "moving";

const PEG_LABEL: Record<PegKind, string> = { normal: "🎯", gold: "🥇", moving: "🔃" };

export class WanageScene extends MinigameBase {
  protected readonly bg = 0x7fb069;
  private throwsLeft = 8;
  private marker!: Phaser.GameObjects.Text;
  private zone!: Phaser.GameObjects.Rectangle;
  private pegText!: Phaser.GameObjects.Text;
  private throwText!: Phaser.GameObjects.Text;
  private windText!: Phaser.GameObjects.Text;
  private markerX = 40;
  private dir = 1;
  private speed = 3.2;
  private peg: PegKind = "normal";
  private zoneCenter = 180;
  private zoneHalfWidth = 35;
  private wind = 0;
  private moving = true;
  private phaseT = 0;
  private showWind = false;

  protected buildArena(): void {
    const throws = getMinigameById(this.gameId)?.throws ?? 8;
    this.throwsLeft = throws;
    this.speed = 2.8 + (8 - throws) * 0.1; // makin sedikit lemparan → makin cepat (config-driven)

    this.add.text(180, 120, "🎯 Ketuk saat ring di atas tiang!", { fontSize: "13px", color: "#2B2B33" }).setOrigin(0.5);

    // Bar timing + tiang target
    this.add.rectangle(180, 300, 320, 26, 0xd6c084).setStrokeStyle(2, 0x3d4a6b);
    this.zone = this.add.rectangle(180, 300, 70, 26, 0xf0a8bc, 0.9).setStrokeStyle(2, 0xa84438);
    this.pegText = this.add.text(180, 258, "🎯", { fontSize: "22px" }).setOrigin(0.5);
    this.marker = this.add.text(40, 300, "⭕", { fontSize: "26px" }).setOrigin(0.5).setDepth(2);
    this.throwText = this.add
      .text(180, 352, `Lemparan: ${this.throwsLeft}`, { fontSize: "16px", color: "#2B2B33" })
      .setOrigin(0.5);
    this.windText = this.add.text(180, 380, "", { fontSize: "14px", color: "#3D4A6B" }).setOrigin(0.5);

    // Bonus elemen wind (Doc 05 §3): indikator angin terlihat jelas
    this.showWind = getGameState().element === "wind";

    this.nextPeg();
    this.input.on("pointerdown", () => this.toss());
  }

  /** Tiang baru per lemparan: biasa 50% · bergerak 30% · emas 20% (kecil, jauh). */
  private nextPeg(): void {
    const roll = Math.random();
    this.peg =
      roll < 0.5 ? "normal" : roll < 0.8 ? "moving" : "gold";
    this.zoneHalfWidth = this.peg === "gold" ? 18 : this.peg === "moving" ? 30 : 38;
    const GOLD_SPOTS = [55, 80, 280, 305]; // jauh di tepi
    this.zoneCenter =
      this.peg === "gold"
        ? (GOLD_SPOTS[Math.floor(Math.random() * GOLD_SPOTS.length)] ?? 70)
        : Phaser.Math.Between(70, 290);
    this.zone.setX(this.zoneCenter).setSize(this.zoneHalfWidth * 2, 26);
    this.pegText.setText(PEG_LABEL[this.peg]).setX(this.zoneCenter);
    this.wind = Phaser.Math.Between(-3, 3); // angin acak per lemparan
    this.updateWindText();
  }

  private updateWindText(): void {
    if (this.showWind) {
      // Terlihat jelas (elemen wind)
      this.windText.setText(this.wind === 0 ? "Angin: tenang" : `Angin: ${this.wind > 0 ? "→" : "←"} ${Math.abs(this.wind)}`);
    } else {
      // Tersembunyi sebagian (arah saja, tanpa besaran)
      this.windText.setText(this.wind === 0 ? "Angin: tenang" : this.wind > 0 ? "Angin: →?" : "Angin: ←?");
    }
  }

  private toss(): void {
    if (!this.running || this.throwsLeft <= 0) return;
    // Angin menggeser jurangan ring (Doc 05 §3)
    const landing = this.markerX + this.wind * 6;
    const dist = Math.abs(landing - this.zoneCenter);
    const pegScore = getMinigameById(this.gameId)?.scores ?? {};
    if (dist <= this.zoneHalfWidth) {
      // Pas di tiang
      const pts =
        this.peg === "gold" ? (pegScore.rare ?? 40) : this.peg === "moving" ? (pegScore.moving ?? 30) : (pegScore.normal ?? 10);
      this.addPoints(pts);
      eventBus.emit("sfx/play", { id: "pop" }); // ring melingkar tiang (M11)
      const fx = this.add.text(this.zoneCenter, 270, "✨", { fontSize: "20px" }).setDepth(4);
      this.time.delayedCall(300, () => fx.destroy());
      this.speed += 0.5; // makin cepat tiap sukses
    } else if (dist <= this.zoneHalfWidth + 30) {
      this.addPoints(5); // nyaris
    } else {
      eventBus.emit("sfx/play", { id: "fail" }); // meleset total (M11)
    }
    this.throwsLeft--;
    this.throwText.setText(this.throwsLeft > 0 ? `Lemparan: ${this.throwsLeft}` : "Terakhir!");
    if (this.throwsLeft <= 0) {
      this.time.delayedCall(600, () => this.endGame());
    } else {
      this.nextPeg();
    }
  }

  protected override onStart(): void {
    // ring meluncur segera
  }

  override update(_time: number, delta: number): void {
    if (!this.running) return;
    this.phaseT += delta / 1000;
    // Ring meluncur
    this.markerX += this.dir * this.speed;
    if (this.markerX > 330 || this.markerX < 30) this.dir *= -1;
    // Tiang bergerak: osilasi halus di sekitar pusat
    if (this.peg === "moving") {
      const osc = Math.sin(this.phaseT * 2.4) * 46;
      const cx = Phaser.Math.Clamp(this.zoneCenter + osc, 40, 320);
      this.zone.setX(cx);
      this.pegText.setX(cx);
    }
    this.marker.setX(this.markerX);
  }
}
