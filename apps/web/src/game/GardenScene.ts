/** S5 Taman Zen (Doc 12 §5, Doc 02 S5): kolam koi ambient, lentera batu menyala malam,
 * batu zen + kitsune duduk (bisa dibelai), beri makan koi (−5🪙 → 😊+3), CTA event musiman,
 * visual fase pagi–malam (gradient 15 menit) & dekor 4 musim (Doc 03 §3–4). */
import Phaser from "phaser";
import { eventBus } from "../lib/eventBus";
import { bindSceneNav } from "./sceneNav";
import { getSky } from "./timeVisual";
import { getGameState } from "../store/gameState";
import { getSeason, type Season } from "@hagumi/core";

/** Dekor musim: partikel jatuh + warna pohon (Doc 03 §4, GDD §9). */
const SEASON_DECOR: Record<Season, { particle: string; treeTint: number | null; note: string }> = {
  spring: { particle: "🌸", treeTint: 0xf0a8bc, note: "Sakura bermekaran" },
  summer: { particle: "✨", treeTint: 0x2e7d46, note: "Kunang-kunang di malam hari" },
  autumn: { particle: "🍁", treeTint: 0xd95f2b, note: "Daun momiji merah" },
  winter: { particle: "❄️", treeTint: 0x9a8f80, note: "Salju turun perlahan" },
};

export class GardenScene extends Phaser.Scene {
  private offs: Array<() => void> = [];
  private skyG!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Rectangle;
  private lanternGlow!: Phaser.GameObjects.Ellipse;
  private seasonParticles: Phaser.GameObjects.Text[] = [];
  private fireflies: Phaser.GameObjects.Text[] = [];
  private tree!: Phaser.GameObjects.Container;
  private kois: Phaser.GameObjects.Text[] = [];
  private ctaBtn?: Phaser.GameObjects.Container;
  private currentEvent: string | null = null;
  private eventClaimed = false;
  private skyTimer = 0;

  constructor() {
    super("garden");
  }

  create(): void {
    const season = getSeason(getGameState().nowMs);
    const decor = SEASON_DECOR[season];

    this.drawSky();
    this.drawGround();
    this.drawPond();
    this.drawTree(season);
    this.drawLantern();
    this.drawZenRock();
    this.drawButtons();
    this.drawNav();
    this.spawnSeasonParticles(season);
    if (season === "summer") this.spawnFireflies();

    this.offs = [
      bindSceneNav(this, "garden"),
      eventBus.on("fx/koi-jump", () => this.koiJump()),
      eventBus.on("season/event", ({ id, claimed }) => {
        this.currentEvent = id;
        this.eventClaimed = claimed;
        this.updateCta();
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offs.forEach((off) => off());
      this.seasonParticles.forEach((p) => p.destroy());
      this.fireflies.forEach((f) => f.destroy());
    });
    void decor;
  }

  // ===== Latar & suasana =====

  /** Langit gradient per fase — di-update tiap ±0.5 dtk (interpolasi 15 menit, Doc 03 §3). */
  private drawSky(): void {
    this.skyG = this.add.graphics().setDepth(0);
    this.overlay = this.add.rectangle(180, 320, 360, 640, 0xffffff, 0).setDepth(9);
    this.refreshSky();
  }

  private refreshSky(): void {
    const sky = getSky(getGameState().nowMs);
    const g = this.skyG;
    g.clear();
    g.fillGradientStyle(sky.top, sky.top, sky.bottom, sky.bottom, 1);
    g.fillRect(0, 0, 360, 360);
    this.overlay.setFillStyle(sky.overlay, sky.overlayAlpha);
    // Lentera menyala hanya malam (Doc 03 §3)
    this.lanternGlow.setAlpha(sky.night ? 0.5 : 0);
    this.fireflies.forEach((f) => f.setVisible(sky.night));
  }

  private drawGround(): void {
    // Bukit rumput
    this.add.ellipse(180, 420, 560, 260, 0x7fb069).setDepth(1);
    // Jalur batu ke torii
    for (let i = 0; i < 4; i++) this.add.rectangle(180, 300 + i * 26, 34, 14, 0xb5a48a).setDepth(1).setAngle(Phaser.Math.Between(-8, 8));
  }

  /** Pohon musiman: sakura (semi) / hijau tua (panas) / momiji (gugur) / gundul bersalju (dingin). */
  private drawTree(season: Season): void {
    const foliage = SEASON_DECOR[season].treeTint;
    const trunk = this.add.rectangle(0, 10, 14, 84, 0x8b6b4a);
    const crown = [
      this.add.circle(0, -32, 44, 0x7fb069),
      this.add.circle(-34, -14, 28, 0x7fb069),
      this.add.circle(34, -14, 28, 0x7fb069),
    ];
    if (foliage !== null) crown.forEach((c) => c.setFillStyle(foliage));
    else crown.forEach((c) => c.setAlpha(0.15)); // winter: gundul
    this.tree = this.add.container(292, 200, [trunk, ...crown]).setDepth(2);
    this.tweens.add({ targets: this.tree, angle: { from: -1.2, to: 1.2 }, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private drawLantern(): void {
    // Lentera batu tōrō (menyala malam, Doc 02 S5)
    this.add.rectangle(38, 262, 26, 10, 0x9a9a9a).setDepth(2);
    this.add.rectangle(38, 292, 12, 40, 0xb5b5b5).setDepth(2);
    this.add.rectangle(38, 320, 34, 22, 0xcfcfcf).setStrokeStyle(2, 0x8a8a8a).setDepth(2);
    this.add.rectangle(38, 338, 30, 8, 0x9a9a9a).setDepth(2);
    this.lanternGlow = this.add.ellipse(38, 318, 90, 90, 0xffd98a, 0).setDepth(2);
    this.add.text(38, 318, "🔥", { fontSize: "13px" }).setOrigin(0.5).setDepth(3);
  }

  // ===== Kolam koi & batu zen =====

  private drawPond(): void {
    this.add.ellipse(180, 430, 240, 110, 0x4a7ab0).setStrokeStyle(4, 0x3a6a9e).setDepth(2);
    // 3 koi warna berbeda berenang ambient (Doc 02 S5)
    const colors = [0xff8c5a, 0xf5efe0, 0xd95f2b];
    for (let i = 0; i < 3; i++) {
      const koi = this.add.text(140 + i * 40, 420, "🐟", { fontSize: "20px" }).setOrigin(0.5).setDepth(3);
      koi.setTint(colors[i] ?? 0xffffff);
      this.kois.push(koi);
      this.tweens.add({
        targets: koi,
        x: { from: 110 + i * 30, to: 240 + i * 10 },
        y: { from: 415 + i * 6, to: 440 - i * 5 },
        duration: 2600 + i * 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onYoyo: () => koi.setFlipX(true),
        onRepeat: () => koi.setFlipX(false),
      });
    }
  }

  private drawZenRock(): void {
    // Batu zen + kitsune duduk — belai tetap bisa (Doc 12 §5)
    this.add.ellipse(70, 528, 72, 40, 0x9aa89a).setStrokeStyle(2, 0x7a8a7a).setDepth(3);
    const fox = this.add.text(70, 505, "🦊", { fontSize: "36px" }).setOrigin(0.5, 1).setDepth(4);
    this.tweens.add({ targets: fox, y: "+=3", duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    fox.setInteractive({ useHandCursor: true });
    fox.on("pointerdown", () => eventBus.emit("game/pet-stroke", undefined));
  }

  // ===== Tombol aksi (Doc 12 §5) =====

  private drawButtons(): void {
    // Beri makan koi: −5🪙 → 😊+3 (cooldown 1 jam dicek system)
    const koiBtn = this.add.container(180, 480, [
      this.add.rectangle(0, 0, 200, 44, 0xf5efe0).setStrokeStyle(2, 0x3d4a6b),
      this.add.text(0, 0, "🥘 Beri Makan Koi −5🪙", { fontSize: "13px", color: "#2B2B33" }).setOrigin(0.5),
    ]).setDepth(6);
    koiBtn.setSize(200, 44).setInteractive({ useHandCursor: true });
    koiBtn.on("pointerdown", () => {
      this.tweens.add({ targets: koiBtn, scaleX: 0.94, duration: 80, yoyo: true });
      eventBus.emit("ui/koi-feed", undefined);
    });

    // CTA event musiman (hanya saat event aktif — Doc 12 §5)
    this.ctaBtn = this.add.container(180, 532, [
      this.add.rectangle(0, 0, 220, 40, 0xf5e6b0).setStrokeStyle(2, 0xa84438),
      this.add.text(0, 0, "", { fontSize: "13px", color: "#7A2F28", fontStyle: "bold" }).setOrigin(0.5),
    ]).setDepth(6);
    this.ctaBtn.setSize(220, 40).setInteractive({ useHandCursor: true });
    this.ctaBtn.setVisible(false);
    this.ctaBtn.on("pointerdown", () => {
      if (!this.currentEvent || this.currentEvent === "matsuri") return;
      this.tweens.add({ targets: this.ctaBtn, scaleX: 0.94, duration: 80, yoyo: true });
      eventBus.emit("ui/event-cta", { id: this.currentEvent as "hanami" | "tsukimi" | "omikuji" });
    });
  }

  /** Navigasi torii & pintu rumah (Doc 02 S5). */
  private drawNav(): void {
    const torii = (): void => eventBus.emit("scene/goto", { key: "matsuri" });
    this.add.rectangle(180, 208, 96, 14, 0xa84438).setStrokeStyle(2, 0x7a2f28).setDepth(2).setInteractive({ useHandCursor: true }).on("pointerdown", torii);
    this.add.rectangle(180, 258, 10, 46, 0xa84438).setStrokeStyle(1, 0x7a2f28).setDepth(1);
    this.add.rectangle(142, 236, 10, 46, 0xa84438).setStrokeStyle(1, 0x7a2f28).setDepth(1).setInteractive({ useHandCursor: true }).on("pointerdown", torii);
    this.add.rectangle(218, 236, 10, 46, 0xa84438).setStrokeStyle(1, 0x7a2f28).setDepth(1).setInteractive({ useHandCursor: true }).on("pointerdown", torii);
    this.add.text(180, 190, "⛩️ Matsuri", { fontSize: "11px", color: "#7A2F28" }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true }).on("pointerdown", torii);

    this.add
      .rectangle(330, 470, 44, 110, 0xe8e0ce)
      .setStrokeStyle(2, 0x3d4a6b)
      .setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("scene/goto", { key: "home" }));
    this.add.text(330, 470, "🏠", { fontSize: "16px" }).setOrigin(0.5).setDepth(3);
  }

  /** CTA label per event (Doc 03 §5); matsuri → tombol menuju lobi. */
  private updateCta(): void {
    if (!this.ctaBtn) return;
    const label = this.ctaBtn.list[1] as Phaser.GameObjects.Text;
    if (!this.currentEvent) {
      this.ctaBtn.setVisible(false);
      return;
    }
    const info: Record<string, { text: string; claimed: string }> = {
      hanami: { text: "🌸 Hanami! Piknik 😊+20", claimed: "🌸 Hanami selesai hari ini" },
      matsuri: { text: "🎆 Matsuri — koin ×1.5!", claimed: "🎆 Matsuri berlangsung" },
      tsukimi: { text: "🌕 Tsukimi! Dango gratis", claimed: "🌕 Tsukimi selesai" },
      omikuji: { text: "🎍 Omikuji Tahun Baru", claimed: "🎍 Omikuji besok lagi" },
    };
    const i = info[this.currentEvent];
    if (!i) {
      this.ctaBtn.setVisible(false);
      return;
    }
    label.setText(this.eventClaimed ? i.claimed : i.text);
    this.ctaBtn.setVisible(true);
    if (this.currentEvent === "matsuri") {
      // CTA matsuri → langsung ke lobi festival
      this.ctaBtn.off("pointerdown");
      this.ctaBtn.on("pointerdown", () => eventBus.emit("scene/goto", { key: "matsuri" }));
    }
  }

  // ===== Ambient musim & fx =====

  /** Partikel jatuh per musim (Doc 03 §4: dekor & suasana). */
  private spawnSeasonParticles(season: Season): void {
    const particle = SEASON_DECOR[season].particle;
    for (let i = 0; i < 10; i++) {
      const p = this.add
        .text(Phaser.Math.Between(0, 360), Phaser.Math.Between(-40, 640), particle, { fontSize: "14px" })
        .setDepth(5)
        .setAlpha(0.8);
      this.seasonParticles.push(p);
      this.tweens.add({
        targets: p,
        y: "+=680",
        x: "+=30",
        angle: 200,
        duration: Phaser.Math.Between(9000, 16000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 9000),
        onRepeat: () => p.setY(-30).setX(Phaser.Math.Between(0, 360)),
      });
    }
  }

  /** Kunang-kunang musim panas — hanya terlihat malam (Doc 03 §4, GDD §9). */
  private spawnFireflies(): void {
    for (let i = 0; i < 6; i++) {
      const f = this.add
        .text(Phaser.Math.Between(60, 300), Phaser.Math.Between(280, 420), "✨", { fontSize: "12px" })
        .setDepth(5)
        .setVisible(false);
      this.fireflies.push(f);
      this.tweens.add({
        targets: f,
        x: "+=40",
        y: "+=24",
        alpha: { from: 1, to: 0.2 },
        duration: Phaser.Math.Between(1400, 2600),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  /** Koi melompat saat diberi makan (fx, Doc 12 §5). */
  private koiJump(): void {
    const koi = Phaser.Utils.Array.GetRandom(this.kois);
    if (!koi) return;
    this.tweens.add({
      targets: koi,
      y: "-=56",
      angle: -30,
      duration: 320,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => koi.setAngle(0),
    });
    const splash = this.add.text(koi.x, koi.y - 10, "💧", { fontSize: "14px" }).setDepth(4);
    this.tweens.add({ targets: splash, alpha: 0, y: "-=20", duration: 600, onComplete: () => splash.destroy() });
  }

  override update(_time: number, delta: number): void {
    // Refresh langit murah: 2× per detik
    this.skyTimer += delta;
    if (this.skyTimer >= 500) {
      this.skyTimer = 0;
      this.refreshSky();
    }
  }
}
