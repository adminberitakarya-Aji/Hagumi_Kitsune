/** S4 Rumah Tatami (Doc 12 §3, Doc 02 S4) — sprite final + bg final (M5).
 * Scene hanya RENDER + kirim input ke EventBus; stat diubah oleh gameSystem. */
import Phaser from "phaser";
import { eventBus } from "../lib/eventBus";
import { getGameState } from "../store/gameState";
import { getSky } from "./timeVisual";
import { kitsuneAnim, type ClipName } from "./art/kitsuneArt";
import { buildPropsTextures } from "./art/propsArt";
import { getSeason, ELEMENT_COAT } from "@hagumi/core";

const FOX_HOME = { x: 180, y: 470 };
const WALK_AREA = { minX: 60, maxX: 300, minY: 430, maxY: 540 };
const STROKE_DIST = 120; // Doc 12 §3: belai = usap ≥120px
const BUBBLE_MS = 4000; // Doc 12 §2.4: durasi balon
const POOP_SPOTS = [
  { x: 92, y: 505 },
  { x: 268, y: 528 },
  { x: 150, y: 566 },
]; // 3 titik tatami (maks poop = 3, Doc 12 §3.3)
const SCOOP_HOLD_MS = 400; // Doc 12 §3.3: sapu = tahan 400ms

/** Palet jalur (M3 — placeholder palette swap; sprite final M5, Doc 01 §4). */
const PATH_TINT: Record<string, number> = {
  tenko: 0xf5e6b0, // emas ilahi
  zenko: 0xfdfaf2, // putih suci
  biasa: 0xffffff, // oranye alami (tanpa tint)
  yako: 0xb59a86, // kecoklatan kusam
  nogitsune: 0x9a7ab8, // ungu gelap
};
const TAIL_COLOR: Record<string, number> = {
  tenko: 0xf5e6b0,
  zenko: 0xfdfaf2,
  biasa: 0xe8874a,
  yako: 0x9a7f6a,
  nogitsune: 0x6b4a7a,
};

export class HomeScene extends Phaser.Scene {
  private fox!: Phaser.GameObjects.Container;
  private foxSprite!: Phaser.GameObjects.Sprite;
  private element = "fire";
  private stage = "baby";
  private currentClip: ClipName = "idle";
  private tailsG!: Phaser.GameObjects.Graphics;
  private bubble!: Phaser.GameObjects.Container;
  private bubbleBg!: Phaser.GameObjects.Rectangle;
  private bubbleText!: Phaser.GameObjects.Text;
  private bubbleTail!: Phaser.GameObjects.Graphics;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private bubbleTween?: Phaser.Tweens.Tween;
  private walkTimer?: Phaser.Time.TimerEvent;
  private poops: Phaser.GameObjects.Container[] = [];
  private scoopTimer?: Phaser.Time.TimerEvent;
  private scoopHint?: Phaser.GameObjects.Text;
  private offs: Array<() => void> = [];
  private sleeping = false;
  private windowSky!: Phaser.GameObjects.Rectangle;
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
    buildPropsTextures(this); // fx_poop, nav_torii, nav_tea (M10 — idempoten)
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
      eventBus.on("fx/bathe", () => this.playOnce("bathe")),
      eventBus.on("poop/count", ({ count }) => this.setPoopCount(count)),
      eventBus.on("pet/appearance", (a) => this.setAppearance(a)),
      eventBus.on("fx/scoop", ({ index }) => this.scoopFx(index)),
      eventBus.on("fx/evolve", () => this.evolveFlash()),
      eventBus.on("pet/reaction", ({ emoji }) => this.reaction(emoji)), // M6 (Doc 08 §1)
    ];
    // Shutdown scene → lepas listener & timer (hindari leak saat destroy)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offs.forEach((off) => off());
      this.walkTimer?.remove();
      this.bubbleTimer?.remove();
      this.scoopTimer?.remove();
    });
  }

  /** Kilat aura evolusi (Doc 12 §11.3): kilatan putih-emas + cahaya memancar dari kitsune. */
  private evolveFlash(): void {
    this.walkTimer?.remove();
    this.tweens.killTweensOf(this.foxSprite);
    this.playOnce("evolve"); // klip evolusi 10 frame (Doc 01 §6)
    const light = this.add.circle(this.fox.x, this.fox.y, 8, 0xf5e6b0, 0.95).setDepth(6);
    const flash = this.add.rectangle(180, 320, 360, 544, 0xffffff, 0).setDepth(7);
    this.tweens.add({ targets: flash, fillAlpha: 0.85, duration: 180, yoyo: true, repeat: 1 });
    this.tweens.add({
      targets: light,
      radius: 260,
      alpha: 0,
      duration: 1400,
      ease: "Cubic.easeOut",
      onComplete: () => {
        light.destroy();
        flash.destroy();
      },
    });
    this.tweens.add({
      targets: this.fox,
      angle: { from: -8, to: 8 },
      duration: 90,
      yoyo: true,
      repeat: 9, // gemetar kuat — tubuh berubah
      onComplete: () => {
        this.fox.setAngle(0);
        this.startBob();
        this.scheduleWalk();
      },
    });
  }

  // ===== Ruangan (bg final dari texture prosedural — M5) =====

  private drawRoom(): void {
    // BG final `bg_home_<musim>`: dinding washi + seigaiha + tatami + kotatsu
    const seasonKey = `bg_home_${getSeason(getGameState().nowMs)}`;
    if (this.textures.exists(seasonKey)) {
      this.add.image(180, 320, seasonKey).setDepth(0);
    } else {
      this.add.rectangle(180, 320, 360, 640, 0xede4cc);
    }
    // Jendela shōji + langit — warna mengikuti fase waktu (Doc 03 §3)
    this.windowSky = this.add.rectangle(180, 118, 280, 96, 0xa8c8e8);
    this.refreshWindowSky();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshWindowSky() });
    const frame = this.add.graphics();
    frame.lineStyle(8, 0xf5efe0, 1);
    frame.strokeRect(40, 70, 280, 96);
    frame.lineStyle(4, 0xf5efe0, 1);
    frame.lineBetween(180, 70, 180, 166);
    frame.lineBetween(40, 118, 320, 118);
    // Pintu kiri (→ Taman) & kanan (→ Dapur) — area sentuh ≥48px (Doc 10 §4)
    this.add
      .rectangle(20, 300, 48, 130, 0xe8e0ce, 0.01)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("scene/goto", { key: "garden" }));
    this.add
      .rectangle(340, 300, 48, 130, 0xe8e0ce, 0.01)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => eventBus.emit("ui/action", { id: "door-kitchen" }));
    this.add.image(20, 300, "nav_torii");
    this.add.image(340, 300, "nav_tea");
  }

  /** Langit di luar jendela mengikuti fase waktu (Doc 03 §3; musim ikut warna fase). */
  private refreshWindowSky(): void {
    const sky = getSky(getGameState().nowMs);
    this.windowSky.setFillStyle(sky.top, 1);
  }

  private createFox(): void {
    this.tailsG = this.add.graphics();
    const shadow = this.add.ellipse(0, 30, 44, 12, 0x000000, 0.18);
    const g = getGameState();
    this.element = g.element;
    this.stage = "baby"; // stage sinkron lewat pet/appearance (tails>=3 → dewasa)
    this.foxSprite = this.add.sprite(0, 0, `kitsune_${this.element}`).setOrigin(0.5, 0.75);
    this.fox = this.add.container(FOX_HOME.x, FOX_HOME.y, [this.tailsG, shadow, this.foxSprite]).setDepth(2);
    this.fox.setSize(72, 72).setInteractive({ useHandCursor: true });
    // Tampilan awal dari state yang sudah ada (event appearance dikirim sebelum scene jalan)
    this.setAppearance({ element: g.element, path: g.path, tails: g.tails });
    // Audit klip ambient: happiness <30 → idle_sad, >80 (10%) → idle_happy (Doc 01 §6)
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.refreshAmbientClip() });
  }

  /** Skala bulat sesuai tahap (Doc 10 §1: ×1/×2 — anti blur). */
  private applyStageScale(): void {
    const scale = this.stage === "baby" || this.stage === "teen" ? 2 : 3;
    this.foxSprite.setScale(scale);
  }

  /** Ganti klip ambient bila tidak sedang transien (makan/mandi/tidur/evolusi). */
  private refreshAmbientClip(): void {
    if (this.sleeping || this.eating) return;
    const transient = ["eat", "petted", "bathe", "evolve", "dead"];
    if (transient.includes(this.currentClip)) return;
    const g = getGameState();
    let clip: ClipName = "idle";
    if (g.sick) clip = "sick";
    else if (g.stats.happiness < 30) clip = "idle_sad";
    else if (g.stats.happiness > 80 && Math.random() < 0.1) clip = "idle_happy";
    this.playClip(clip);
  }

  /** Putar klip loop (jika beda dari sekarang). */
  private playClip(clip: ClipName): void {
    if (this.currentClip === clip && this.foxSprite.anims.isPlaying) return;
    this.currentClip = clip;
    this.foxSprite.play(kitsuneAnim(this.element, clip));
  }

  /** Putar klip sekali → kembali idle. */
  private playOnce(clip: ClipName): void {
    this.currentClip = clip;
    this.foxSprite.play(kitsuneAnim(this.element, clip));
    this.foxSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.currentClip === clip) this.playClip("idle");
    });
  }

  /** Ekor bertambah + tint jalur (M3 DoD: ekor terlihat bertambah di sprite). */
  private setAppearance({ element, path, tails, coatColor }: { element: string; path: string; tails: number; coatColor?: string }): void {
    const elementChanged = element !== this.element;
    this.element = element;
    this.stage = tails >= 3 ? "adult" : "baby";
    if (elementChanged) this.foxSprite.setTexture(`kitsune_${element}`);
    this.applyStageScale();
    // M7 — warna bulu genetika: tint mix induk, kecuali masih warna dasar elemen
    const baseCoat = ELEMENT_COAT[element as keyof typeof ELEMENT_COAT];
    const hasGeneticCoat =
      coatColor !== undefined && coatColor.toUpperCase() !== baseCoat.toUpperCase();
    const tint = hasGeneticCoat
      ? Number.parseInt(coatColor.slice(1), 16)
      : (PATH_TINT[path] ?? 0xffffff);
    this.foxSprite.setTint(tint);
    const color = TAIL_COLOR[path] ?? 0xe8874a;
    const g = this.tailsG;
    g.clear();
    // Kipas ekor di belakang tubuh: puff kecil menumpuk dari bawah ke atas
    for (let i = 0; i < Math.max(tails, 1); i++) {
      const px = -24 - (i % 2) * 5;
      const py = 8 - i * 7;
      g.fillStyle(color, 0.95);
      g.fillCircle(px, py, 7);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(px - 2, py - 2, 2.5);
    }
    this.playClip("idle");
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
    this.tweens.killTweensOf(this.foxSprite);
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
        this.playOnce("eat"); // klip makan 6 frame (Doc 01 §6)
        this.time.delayedCall(1000, () => {
          this.eating = false;
          this.hearts();
          this.scheduleWalk();
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

  /** Emoji reaksi non-verbal (M6 — Doc 08 §1): feedback instan aksi, melayang di atas pet. */
  private reaction(emoji: string): void {
    const emo = this.add
      .text(this.fox.x, this.fox.y - 40, emoji, { fontSize: "22px" })
      .setOrigin(0.5)
      .setDepth(8);
    this.tweens.add({
      targets: emo,
      y: this.fox.y - 74,
      alpha: 0,
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => emo.destroy(),
    });
  }

  private setSleeping(on: boolean): void {
    this.sleeping = on;
    if (on) {
      this.walkTimer?.remove();
      this.tweens.killTweensOf(this.foxSprite);
      this.playClip("sleep"); // klip tidur (rebah + Z z Z baked — Doc 01 §6)
    } else {
      this.playClip("idle");
      this.scheduleWalk();
    }
  }

  // ===== Poop di tatami (Doc 12 §3.3 — tahan 400ms untuk menyapu) =====

  private setPoopCount(count: number): void {
    while (this.poops.length < count) {
      const spot = POOP_SPOTS[this.poops.length] ?? POOP_SPOTS[0]!;
      const poop = this.add
        .container(spot.x, spot.y, [this.add.image(0, 0, "fx_poop")])
        .setDepth(1);
      poop.setSize(48, 48).setInteractive({ useHandCursor: true });
      this.attachScoopHold(poop, this.poops.length);
      this.poops.push(poop);
    }
    while (this.poops.length > count) this.poops.pop()?.destroy();
  }

  /** Sapu = tahan 400ms di atas poop (Doc 12 §3.3). Lepas lebih awal = batal. */
  private attachScoopHold(poop: Phaser.GameObjects.Container, index: number): void {
    const cancel = (): void => {
      this.scoopTimer?.remove();
      this.scoopTimer = undefined;
      this.scoopHint?.destroy();
      this.scoopHint = undefined;
    };
    poop.on("pointerdown", () => {
      cancel();
      this.scoopHint = this.add
        .text(poop.x, poop.y - 28, "tahan...", { fontSize: "10px", color: "#3d4a6b" })
        .setOrigin(0.5)
        .setDepth(5);
      this.scoopTimer = this.time.delayedCall(SCOOP_HOLD_MS, () => {
        cancel();
        eventBus.emit("game/poop-scoop", { index });
      });
    });
    poop.on("pointerup", cancel);
    poop.on("pointerout", cancel);
  }

  private scoopFx(index: number): void {
    const i = Math.min(Math.max(index, 0), this.poops.length - 1);
    const poop = this.poops.splice(i, 1)[0];
    const pos = poop ? { x: poop.x, y: poop.y } : { x: 180, y: 500 };
    poop?.destroy();
    const sparkle = this.add
      .text(pos.x, pos.y, "✨", { fontSize: "16px" })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: sparkle,
      y: "-=24",
      alpha: 0,
      duration: 500,
      onComplete: () => sparkle.destroy(),
    });
  }

  private hearts(): void {
    this.playOnce("petted"); // klip belai — wajah senang (Doc 01 §6)
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
    // klip idle final sudah punya bob baked — tween lama emoji tidak diperlukan lagi
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
      this.foxSprite.setFlipX(tx < this.fox.x);
      this.playClip("walk"); // klip jalan 6 frame (Doc 01 §6)
      this.tweens.add({
        targets: this.fox,
        x: tx,
        y: ty,
        duration: 900 + Math.abs(tx - this.fox.x) * 6,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.playClip("idle");
          this.scheduleWalk();
        },
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
