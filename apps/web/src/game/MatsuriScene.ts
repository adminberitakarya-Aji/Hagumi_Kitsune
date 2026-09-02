/** S10 Lobi Matsuri (Doc 12 §7.1): 3 kartu mini-game → ui/minigame-start (gate di system). */
import Phaser from "phaser";
import { minigamesConfig } from "@hagumi/data";
import { getSeason } from "@hagumi/core";
import { eventBus } from "../lib/eventBus";
import { bindSceneNav } from "./sceneNav";

export class MatsuriScene extends Phaser.Scene {
  private offs: Array<() => void> = [];
  private recordTexts = new Map<string, Phaser.GameObjects.Text>();
  private cooldownText?: Phaser.GameObjects.Text;

  constructor() {
    super("matsuri");
  }

  create(): void {
    // Latar malam festival final (M5) + lampion
    const seasonKey = `bg_festival_${getSeason(Date.now())}`;
    if (this.textures.exists(seasonKey)) {
      this.add.image(180, 320, seasonKey).setDepth(0);
    } else {
      this.add.rectangle(180, 320, 360, 640, 0x2b2b51);
      this.add.rectangle(180, 100, 360, 120, 0x3d3d6b);
    }
    for (let i = 0; i < 5; i++) {
      const x = 48 + i * 66;
      const lamp = this.add.text(x, 90 + (i % 2) * 18, "🏮", { fontSize: "26px" }).setOrigin(0.5);
      this.tweens.add({
        targets: lamp,
        y: "+=6",
        duration: 1200 + i * 150,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    this.add
      .text(180, 140, "✨ Matsuri ✨", { fontSize: "20px", color: "#F5EFE0" })
      .setOrigin(0.5)
      .setDepth(2);

    // Kembang api ambient (fx judul, Doc 12 §7.1)
    this.time.addEvent({ delay: 1400, loop: true, callback: () => this.firework() });

    // Kartu game (vertical list)
    minigamesConfig.games.forEach((game, i) => {
      const y = 230 + i * 96;
      const card = this.add
        .rectangle(180, y, 328, 88, 0xf5efe0)
        .setStrokeStyle(2, 0x3d4a6b)
        .setInteractive({ useHandCursor: true });
      const label = `${game.icon}  ${game.name}`;
      const text = this.add
        .text(180, y - 26, label, { fontSize: "17px", color: "#2B2B33", fontStyle: "bold" })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(180, y - 4, game.tagline, { fontSize: "9px", color: "#3D4A6B", wordWrap: { width: 300 } })
        .setOrigin(0.5);
      const record = this.add
        .text(132, y + 22, "🏆 Rekor: —", { fontSize: "11px", color: "#2B2B33" })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.recordTexts.set(game.id, record);
      const play = this.add
        .text(262, y + 22, `[MAIN] ⚡−${minigamesConfig.common.energyCost}`, {
          fontSize: "11px",
          color: "#F5EFE0",
          backgroundColor: "#A84438",
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const go = (): void => {
        this.tweens.add({ targets: card, scaleX: 0.94, duration: 80, yoyo: true });
        eventBus.emit("ui/minigame-start", { gameId: game.id });
      };
      card.on("pointerdown", go);
      text.on("pointerdown", go);
      record.on("pointerdown", go);
      play.on("pointerdown", go);
    });

    // Cooldown bersama (Doc 12 §7.1) — teks diisi oleh event minigame/lobby
    this.cooldownText = this.add
      .text(180, 530, "", {
        fontSize: "13px",
        color: "#F5EFE0",
        backgroundColor: "#3D4A6B",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Kembali ke Taman
    this.add
      .rectangle(180, 590, 160, 40, 0xa84438)
      .setStrokeStyle(2, 0x7a2f28)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("scene/goto", { key: "garden" }));
    this.add
      .text(180, 590, "← Kembali", { fontSize: "14px", color: "#F5EFE0" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("scene/goto", { key: "garden" }));

    this.offs = [
      bindSceneNav(this, "matsuri"),
      eventBus.on("minigame/lobby", ({ best, cooldownLeftMs }) => {
        for (const game of minigamesConfig.games) {
          const t = this.recordTexts.get(game.id);
          const b = best[game.id];
          t?.setText(`🏆 Rekor: ${b !== undefined ? b : "—"}`);
        }
        if (this.cooldownText) {
          const s = Math.ceil(cooldownLeftMs / 1000);
          this.cooldownText.setText(
            s > 0 ? `⏳ Cooldown: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "",
          );
        }
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offs.forEach((off) => off()));
  }

  /** Kembang api kecil di langit (ambient, Doc 12 §7.1). */
  private firework(): void {
    const x = Phaser.Math.Between(50, 310);
    const y = Phaser.Math.Between(70, 150);
    const FW_COLORS = [0xf0a8bc, 0xf5e6b0, 0x8fd0ff, 0x7fb069];
    const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)] ?? 0xf5e6b0;
    for (let i = 0; i < 6; i++) {
      const dot = this.add.circle(x, y, 3, color, 0.95).setDepth(1);
      const angle = (i / 6) * Math.PI * 2;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 26,
        y: y + Math.sin(angle) * 26,
        alpha: 0,
        duration: 700,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }
}
