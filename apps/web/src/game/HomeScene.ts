/** S4 Rumah Tatami (Doc 12 §3, Doc 02 S4) — visual placeholder, interaksi nyata.
 * Scene hanya RENDER + kirim input ke EventBus; stat diubah oleh gameSystem. */
import Phaser from "phaser";
import { eventBus } from "../lib/eventBus";

const FOX_HOME = { x: 180, y: 470 };
const WALK_AREA = { minX: 60, maxX: 300, minY: 430, maxY: 540 };
const STROKE_DIST = 120; // Doc 12 §3: belai = usap ≥120px
const BUBBLE_MS = 4000; // Doc 12 §2.4: durasi balon

export class HomeScene extends Phaser.Scene {
  private fox!: Phaser.GameObjects.Container;
  private foxBody!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Container;
  private bubbleBg!: Phaser.GameObjects.Rectangle;
  private bubbleText!: Phaser.GameObjects.Text;
  private bubbleTail!: Phaser.GameObjects.Graphics;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private bubbleTween?: Phaser.Tweens.Tween;
  private zzz?: Phaser.GameObjects.Text;
  private walkTimer?: Phaser.Time.TimerEvent;
  private offs: Array<() => void> = [];
  private sleeping = false;
  private eating = false;
  private pointerActive = false;
  private stroked = false;
  private strokeDist = 0;
  private lastX = 0;
  private lastY = 0;

  constructor() {
    super("home");
  }

  create(): void {
    this.drawRoom();
    this.createFox();
    this.createBubble();
    this.setupInput();
    this.startBob();
    this.scheduleWalk();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.offs = [
      eventBus.on("pet/eat", ({ label }) => this.eat(label)),
      eventBus.on("pet/say", ({ text }) => this.say(text)),
      eventBus.on("pet/sleep", ({ on }) => this.setSleeping(on)),
      eventBus.on("fx/hearts", () => this.hearts()),
    ];
    // Shutdown scene → lepas listener & timer (hindari leak saat destroy)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offs.forEach((off) => off());
      this.walkTimer?.remove();
      this.bubbleTimer?.remove();
    });
  }

  // ===== Ruangan (placeholder blok warna — bg final pixel-art di M5) =====

  private drawRoom(): void {
    // Dinding washi (y48..232 — 48px atas tertutup HUD)
    this.add.rectangle(180, 140, 360, 184, 0xede4cc);
    // Jendela shōji + langit
    this.add.rectangle(180, 118, 280, 96, 0xa8c8e8);
    const frame = this.add.graphics();
    frame.lineStyle(8, 0xf5efe0, 1);
    frame.strokeRect(40, 70, 280, 96);
    frame.lineStyle(4, 0xf5efe0, 1);
    frame.lineBetween(180, 70, 180, 166);
    frame.lineBetween(40, 118, 320, 118);
    // Lantai tatami (y232..596) + garis mat & binding hijau
    this.add.rectangle(180, 414, 360, 364, 0xd6c084);
    const tatami = this.add.graphics();
    tatami.lineStyle(2, 0x3e5f3e, 0.3);
    for (let y = 274; y <= 590; y += 84) tatami.lineBetween(0, y, 360, y);
    tatami.lineBetween(120, 232, 120, 400);
    tatami.lineBetween(240, 232, 240, 400);
    // Kotatsu
    this.add.rectangle(260, 276, 112, 64, 0xa84438).setStrokeStyle(3, 0x7a2f28);
    this.add.rectangle(260, 248, 72, 16, 0x8b6b4a).setStrokeStyle(2, 0x5e4630);
    // Pintu kiri (→ Taman) & kanan (→ Dapur) — navigasi stub
    this.add
      .rectangle(20, 300, 40, 130, 0xe8e0ce)
      .setStrokeStyle(2, 0x3d4a6b)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("ui/action", { id: "door-garden" }));
    this.add
      .rectangle(340, 300, 40, 130, 0xe8e0ce)
      .setStrokeStyle(2, 0x3d4a6b)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("ui/action", { id: "door-kitchen" }));
    this.add.text(20, 300, "⛩️", { fontSize: "16px" }).setOrigin(0.5);
    this.add.text(340, 300, "🍵", { fontSize: "16px" }).setOrigin(0.5);
  }

  private createFox(): void {
    const shadow = this.add.ellipse(0, 26, 40, 12, 0x000000, 0.18);
    this.foxBody = this.add.text(0, 0, "🦊", { fontSize: "44px" }).setOrigin(0.5);
    this.fox = this.add.container(FOX_HOME.x, FOX_HOME.y, [shadow, this.foxBody]).setDepth(2);
    this.fox.setSize(72, 72).setInteractive({ useHandCursor: true });
  }

  // ===== Input kanvas: ketuk = patok, usap ≥120px = belai (Doc 12 §3) =====

  private setupInput(): void {
    this.fox.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.pointerActive = true;
      this.stroked = false;
      this.strokeDist = 0;
      this.lastX = p.x;
      this.lastY = p.y;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.pointerActive) return;
      this.strokeDist += Math.hypot(p.x - this.lastX, p.y - this.lastY);
      this.lastX = p.x;
      this.lastY = p.y;
      if (this.strokeDist >= STROKE_DIST && !this.stroked) {
        this.stroked = true;
        eventBus.emit("game/pet-stroke", undefined);
      }
    });
    this.input.on("pointerup", () => {
      if (this.pointerActive && !this.stroked && this.strokeDist < 20) {
        eventBus.emit("game/pet-tap", undefined);
      }
      this.pointerActive = false;
    });
  }

  // ===== Perintah render dari system =====

  private eat(label: string): void {
    this.eating = true;
    this.walkTimer?.remove();
    this.tweens.killTweensOf(this.foxBody);
    const food = this.add
      .text(this.fox.x, this.fox.y - 80, label, { fontSize: "24px" })
      .setOrigin(0.5)
      .setDepth(4);
    this.tweens.add({
      targets: food,
      y: this.fox.y - 6,
      duration: 500,
      ease: "Quad.easeIn",
      onComplete: () => {
        food.destroy();
        this.tweens.add({
          targets: this.foxBody,
          scaleX: 1.15,
          duration: 110,
          yoyo: true,
          repeat: 5, // kunyah 3×
          onComplete: () => {
            this.foxBody.setScale(1);
            this.eating = false;
            this.hearts();
            this.startBob();
            this.scheduleWalk();
          },
        });
      },
    });
  }

  private say(text: string): void {
    this.bubbleText.setText(text);
    const w = Math.min(216, this.bubbleText.width + 24);
    const h = this.bubbleText.height + 14;
    this.bubbleBg.setSize(w, h);
    this.drawTail(h);
    this.bubble.setPosition(
      Phaser.Math.Clamp(this.fox.x, w / 2 + 4, 356 - w / 2),
      Math.max(56 + h / 2, this.fox.y - 58 - h / 2),
    );
    this.bubble.setAlpha(1).setVisible(true);
    this.bubbleTween?.stop();
    this.bubbleTimer?.remove(false);
    this.bubbleTimer = this.time.delayedCall(BUBBLE_MS, () => {
      this.bubbleTween = this.tweens.add({ targets: this.bubble, alpha: 0, duration: 200 });
    });
  }

  private setSleeping(on: boolean): void {
    this.sleeping = on;
    if (on) {
      this.walkTimer?.remove();
      this.tweens.killTweensOf(this.foxBody);
      this.foxBody.setScale(1, 0.7);
      this.foxBody.setY(10);
      this.zzz = this.add.text(this.fox.x + 30, this.fox.y - 44, "💤", { fontSize: "20px" }).setDepth(3);
      this.tweens.add({ targets: this.zzz, y: "-=24", alpha: 0.2, duration: 1500, yoyo: true, repeat: -1 });
    } else {
      this.zzz?.destroy();
      this.zzz = undefined;
      this.foxBody.setScale(1);
      this.foxBody.setY(0);
      this.startBob();
      this.scheduleWalk();
    }
  }

  private hearts(): void {
    for (let i = 0; i < 3; i++) {
      const heart = this.add
        .text(this.fox.x + Phaser.Math.Between(-24, 24), this.fox.y - 30, "❤️", { fontSize: "18px" })
        .setOrigin(0.5)
        .setDepth(4);
      this.tweens.add({
        targets: heart,
        y: "-=44",
        alpha: 0,
        duration: 800,
        delay: i * 150,
        onComplete: () => heart.destroy(),
      });
    }
  }

  // ===== Perilaku ambient =====

  private startBob(): void {
    this.tweens.killTweensOf(this.foxBody);
    this.tweens.add({
      targets: this.foxBody,
      y: 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private scheduleWalk(): void {
    this.walkTimer?.remove();
    this.walkTimer = this.time.delayedCall(Phaser.Math.Between(1800, 4000), () => {
      if (this.sleeping || this.eating) {
        this.scheduleWalk();
        return;
      }
      const tx = Phaser.Math.Between(WALK_AREA.minX, WALK_AREA.maxX);
      const ty = Phaser.Math.Between(WALK_AREA.minY, WALK_AREA.maxY);
      this.foxBody.setFlipX(tx < this.fox.x);
      this.tweens.add({
        targets: this.fox,
        x: tx,
        y: ty,
        duration: 900 + Math.abs(tx - this.fox.x) * 6,
        ease: "Sine.easeInOut",
        onComplete: () => this.scheduleWalk(),
      });
    });
  }

  // ===== Balon bicara (Doc 12 §2.4) =====

  private createBubble(): void {
    this.bubbleBg = this.add.rectangle(0, 0, 10, 10, 0xffffff).setStrokeStyle(2, 0x3d4a6b);
    this.bubbleTail = this.add.graphics();
    this.bubbleText = this.add
      .text(0, 0, "", { fontSize: "14px", color: "#2B2B33", align: "center", wordWrap: { width: 190 } })
      .setOrigin(0.5);
    this.bubble = this.add
      .container(180, 380, [this.bubbleBg, this.bubbleTail, this.bubbleText])
      .setAlpha(0)
      .setDepth(5);
  }

  private drawTail(h: number): void {
    const g = this.bubbleTail;
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-7, h / 2 - 1, 7, h / 2 - 1, 0, h / 2 + 11);
    g.lineStyle(2, 0x3d4a6b, 1);
    g.beginPath();
    g.moveTo(-7, h / 2 - 1);
    g.lineTo(0, h / 2 + 11);
    g.lineTo(7, h / 2 - 1);
    g.strokePath();
  }
}
