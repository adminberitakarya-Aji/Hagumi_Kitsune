/**
 * FoxAgent (M13 â€” Doc 13 Â§2 & Â§6): TUBUH dari otak `decideBehavior` (@hagumi/core).
 * FSM eksekusi intent di Phaser: walk/run + akselerasi, legPhaseâ†”kecepatan, flipX,
 * y-sort, mikro-perilaku diam, zoomies, need-driven go_to, flavor taman.
 * Renderer TIDAK pernah memutuskan â€” hanya meminta intent & mengeksekusinya.
 * Posisi EPHEMERAL â€” tidak masuk skema save (Doc 09 Â§3 tetap).
 */
import Phaser from "phaser";
import {
  decideBehavior,
  getDayPhase,
  getSeason,
  ELEMENT_COAT,
  MathRng,
  type BehaviorDecision,
  type GoToTarget,
  type PetElement,
  type PetState,
} from "@hagumi/core";
import { behaviorConfig, getSeasonFlavor } from "@hagumi/data";
import { eventBus } from "../lib/eventBus";
import { getGameState } from "../store/gameState";
import { kitsuneAnim, type ClipName } from "./art/kitsuneArt";

export type { ClipName };

export interface FoxPoint {
  x: number;
  y: number;
}

/** POI flavor scene (Doc 13 Â§6): batu zen, sniff koi, kupu-kupu, lentera. */
export interface FoxPoi {
  name: string;
  /** Titik statis atau getter dinamis (kupu-kupu bergerak). null = POI tidak tersedia. */
  at: FoxPoint | (() => FoxPoint | null);
  /** Klip saat tiba di POI. */
  clip: ClipName;
  weight: number;
  /** true = menuju POI dengan lari (kejar kupu-kupu). */
  run?: boolean;
}

export interface FoxAgentConfig {
  /** Area jelajah (waypoint map â€” Doc 13 Â§6). */
  wanderBounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** Titik go_to tetap scene ini (kitchen/futon; poop dari poopSpots). */
  targets?: Partial<Record<GoToTarget, FoxPoint>>;
  /** Titik POOP_SPOTS (Doc 12 Â§3.3). */
  poopSpots?: FoxPoint[];
  /** POI taman â€” mikro flavor setelah tiba / saat jelajah (Doc 13 Â§6). */
  pois?: FoxPoi[];
  /** y-sort depth di area berumput (Doc 13 Â§6). */
  ySort?: boolean;
  /** Tiba di futon sendiri saat malam + energy < 25 â†’ minta tidur (Doc 13 DoD). */
  onAutoSleep?: () => void;
}

/** Palet jalur (M3) + warna ekor â€” dipindah dari HomeScene agar dipakai agent. */
const PATH_TINT: Record<string, number> = {
  tenko: 0xf5e6b0,
  zenko: 0xfdfaf2,
  biasa: 0xffffff,
  yako: 0xb59a86,
  nogitsune: 0x9a7ab8,
};
const TAIL_COLOR: Record<string, number> = {
  tenko: 0xf5e6b0,
  zenko: 0xfdfaf2,
  biasa: 0xe8874a,
  yako: 0x9a7f6a,
  nogitsune: 0x6b4a7a,
};

export class FoxAgent {
  /** Container kitsune (interactive â€” scene bisa menambah handler input). */
  readonly fox: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Sprite;
  element: PetElement;
  personality: PetElement;

  private readonly scene: Phaser.Scene;
  private readonly cfg: FoxAgentConfig;
  private readonly rng = new MathRng();
  private readonly tailsG: Phaser.GameObjects.Graphics;
  private stage: "baby" | "teen" | "adult" | "elder" = "baby";
  private currentClip: ClipName = "idle";
  private offs: Array<() => void> = [];
  private brainTimer?: Phaser.Time.TimerEvent;

  /** Scene memegang kendali sementara (makan/mandi/evolusi/petted) â€” gating Doc 13 Â§6. */
  private isHeld = false;

  // Gerak: akselerasi + target (Doc 13 Â§5 â€” FoxAgent FSM)
  private moveTarget: FoxPoint | null = null;
  private runMode = false;
  private speed = 0;
  private onArriveCb: (() => void) | null = null;

  // Zoomies (cooldown dihitung renderer, Doc 13 Â§3)
  private lastZoomiesAt = 0;

  // Poop menunggu (index POOP_SPOTS; -1 = tidak ada)
  private pendingPoopIndex = -1;

  constructor(scene: Phaser.Scene, cfg: FoxAgentConfig, element: PetElement, personality: PetElement) {
    this.scene = scene;
    this.cfg = cfg;
    this.element = element;
    this.personality = personality;

    this.tailsG = scene.add.graphics();
    const shadow = scene.add.ellipse(0, 30, 44, 12, 0x000000, 0.18);
    this.sprite = scene.add.sprite(0, 0, `kitsune_${this.element}`).setOrigin(0.5, 0.75);
    this.fox = scene.add
      .container(180, 470, [this.tailsG, shadow, this.sprite])
      .setDepth(cfg.ySort ? 3 : 2);
    this.fox.setSize(72, 72).setInteractive({ useHandCursor: true });
  }

  /** Faktor skala tahap (Doc 10 Â§1: Ã—1/Ã—2 â€” anti blur) + posisi awal. */
  create(at: FoxPoint): void {
    this.fox.setPosition(at.x, at.y);
    this.applyStageScale();
    // Tampilan awal dari state yang sudah ada (event appearance dikirim sebelum scene jalan)
    const g = getGameState();
    this.setAppearance({ element: g.element, path: g.path, tails: g.tails });
    this.offs.push(eventBus.on("pet/appearance", (a) => this.setAppearance(a)));
    // Audit klip ambient (Doc 01 Â§6): happiness <30 â†’ idle_sad, >80 (10%) â†’ idle_happy
    this.scene.time.addEvent({ delay: 2000, loop: true, callback: () => this.refreshAmbientClip() });
    // Kepribadian Air pemalu: menghindar saat pointer mendekat (Doc 13 Fase C)
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.refreshAmbientClip();
    this.scheduleBrain();
  }

  destroy(): void {
    this.brainTimer?.remove(false);
    this.offs.forEach((off) => off());
    this.offs = [];
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
  }

  /** Scene mengambil kendali (makan/mandi/evolusi/tidur) â€” timer otak ditunda. */
  hold(): void {
    this.isHeld = true;
    this.brainTimer?.remove(false);
    this.cancelMove();
  }

  /** Scene melepas kendali â†’ otak jalan lagi. */
  release(): void {
    if (!this.isHeld) return;
    this.isHeld = false;
    this.refreshAmbientClip();
    this.scheduleBrain();
  }

  /** Renderer melaporkan poop baru pada POOP_SPOTS[index] (Doc 13 Â§3 go_to). */
  notifyPoop(index: number | null): void {
    this.pendingPoopIndex = index ?? -1;
    if (index !== null && !this.isHeld && !this.moveTarget) this.tickBrain();
  }

  // ===== Gerak & sinkronisasi (Doc 13 Â§6: legPhaseâ†”kecepatan, flipX, y-sort) =====

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    if (this.moveTarget) {
      const season = getSeason(getGameState().nowMs);
      const flavor = getSeasonFlavor(season); // winter: walkSpeedMul 0.8 (Doc 13 Â§4)
      const base = this.runMode ? behaviorConfig.speed.run : behaviorConfig.speed.walk;
      const maxSpeed = this.runMode ? base : base * (flavor?.walkSpeedMul ?? 1);
      // Akselerasi (Doc 13 Â§5): capai kecepatan target dalam accelMs
      const accelPerSec = (behaviorConfig.speed.accelMs / 1000) * maxSpeed;
      this.speed = Math.min(maxSpeed, this.speed + accelPerSec * dt);
      const dx = this.moveTarget.x - this.fox.x;
      const dy = this.moveTarget.y - this.fox.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (dist <= step) {
        this.fox.setPosition(this.moveTarget.x, this.moveTarget.y);
        const cb = this.onArriveCb;
        this.stopMoving();
        cb?.();
      } else {
        this.fox.x += (dx / dist) * step;
        this.fox.y += (dy / dist) * step;
        this.sprite.setFlipX(dx < 0);
      }
      // legPhase tersinkron kecepatan gerak (Doc 13 Â§6)
      this.sprite.anims.timeScale = Math.max(0.4, this.speed / base);
    } else {
      this.sprite.anims.timeScale = 1;
    }
    if (this.cfg.ySort) this.fox.setDepth(Math.round(this.fox.y / 10));
  }

  private startMove(target: FoxPoint, run: boolean, onArrive: () => void): void {
    this.moveTarget = { ...target };
    this.runMode = run;
    this.onArriveCb = onArrive;
    this.playClip(run ? "run" : "walk");
  }

  private stopMoving(): void {
    this.moveTarget = null;
    this.runMode = false;
    this.speed = 0;
    this.onArriveCb = null;
    this.sprite.anims.timeScale = 1;
    this.playClip("idle");
  }

  private cancelMove(): void {
    if (!this.moveTarget) return;
    this.moveTarget = null;
    this.onArriveCb = null;
    this.speed = 0;
  }

  // ===== Otak: minta intent dari core, eksekusi (Doc 13 Â§2) =====

  private scheduleBrain(delayMs?: number): void {
    this.brainTimer?.remove(false);
    const delay = delayMs ?? this.rng.int(behaviorConfig.tick.minMs, behaviorConfig.tick.maxMs + 1);
    this.brainTimer = this.scene.time.delayedCall(delay, () => this.tickBrain());
  }

  private tickBrain(arrived = false): void {
    if (this.isHeld) {
      this.scheduleBrain(800); // renderer menunda timer, bukan membatalkan (Doc 13 Â§6)
      return;
    }
    const g = getGameState();
    const decision = decideBehavior(
      {
        stats: {
          hunger: g.stats.hunger,
          happiness: g.stats.happiness,
          energy: g.stats.energy,
          hygiene: g.stats.hygiene,
          health: g.health,
        },
        dayPhase: getDayPhase(g.nowMs),
        season: getSeason(g.nowMs),
        element: this.element,
        personality: this.personality,
        petState: this.currentPetState(),
        needsPoop: this.pendingPoopIndex >= 0,
        sinceZoomiesMs: this.scene.time.now - this.lastZoomiesAt,
        arrived,
      },
      this.rng,
    );
    this.execute(decision);
  }

  private currentPetState(): PetState {
    const g = getGameState();
    if (g.dead) return "dead";
    if (g.sleeping) return "sleeping";
    if (g.sick) return "sick";
    if (this.isHeld) return "eating"; // transien scene
    return "idle";
  }

  private execute(d: BehaviorDecision): void {
    switch (d.intent) {
      case "wait":
        this.playClip("idle");
        this.scheduleBrain();
        break;
      case "wander": {
        // Taman: POI flavor (Doc 13 Â§6) jadi peluang saat jelajah
        const poi = this.pickPoi(0.4);
        if (poi) {
          this.visitPoi(poi);
          break;
        }
        this.startMove(this.pickWanderPoint(), false, () => this.onArrived());
        break;
      }
      case "go_to":
        this.executeGoTo(d.target ?? "kitchen");
        break;
      case "zoomies":
        this.executeZoomies(d.sprints ?? 2);
        break;
      case "roll_discomf":
        this.executeRoll(d.durationMs ?? 3000);
        break;
      case "nap_spot":
        // tidur di tempat (bukan futon) â€” visual saja, state core tak berubah
        this.playClip("sleep");
        this.scene.time.delayedCall(d.durationMs ?? 5000, () => {
          if (!this.isHeld) {
            this.playClip("idle");
            this.scheduleBrain();
          }
        });
        break;
      default: {
        // mikro diam: sit/sniff/stretch/look_around/chase_tail (Doc 13 Â§3)
        this.playClip(d.intent as ClipName);
        this.scene.time.delayedCall(d.durationMs ?? 3000, () => {
          if (!this.isHeld) {
            this.playClip("idle");
            this.scheduleBrain();
          }
        });
      }
    }
  }

  /** Setelah tiba tujuan: peluang POI taman â†’ mikro berbobot dari otak (Doc 13 Â§3). */
  private onArrived(): void {
    const poi = this.pickPoi(0.35);
    if (poi) {
      this.visitPoi(poi);
      return;
    }
    this.tickBrain(true);
  }

  // ===== Eksekusi intent spesifik =====

  private executeGoTo(target: GoToTarget): void {
    const point = this.resolveGoTo(target);
    if (!point) {
      this.scheduleBrain();
      return;
    }
    this.startMove(point, false, () => {
      this.sprite.setFlipX(!this.sprite.flipX); // putar badan (sinyal Doc 13 Â§3)
      if (target === "kitchen") {
        // lapar â†’ duduk mengendus pintu dapur (sinyal alami, bukan toast)
        this.playClip("sniff");
        this.after(2600);
      } else if (target === "futon") {
        const g = getGameState();
        if (getDayPhase(g.nowMs) === "night" && !g.sleeping) {
          this.cfg.onAutoSleep?.(); // menuju futon sendiri saat malam + energy < 25 (DoD M13)
        } else {
          this.playClip("sit");
          this.after(2600);
        }
      } else {
        // poop: sampai POOP_SPOT â†’ berjongkok, lalu lepas prioritas
        this.playClip("sit");
        this.scene.time.delayedCall(2200, () => {
          this.pendingPoopIndex = -1;
          this.after(0);
        });
      }
    });
  }

  private resolveGoTo(target: GoToTarget): FoxPoint | null {
    if (target === "poop") {
      const spot = this.cfg.poopSpots?.[Math.max(0, this.pendingPoopIndex)];
      return spot ?? this.cfg.poopSpots?.[0] ?? null;
    }
    return this.cfg.targets?.[target] ?? null;
  }

  private executeZoomies(sprints: number): void {
    this.lastZoomiesAt = this.scene.time.now; // mulai cooldown (Doc 13 Â§3)
    let legs = sprints * 2; // bolak-balik
    const run = (): void => {
      this.startMove(this.pickWanderPoint(), true, () => {
        legs -= 1;
        if (legs > 0) {
          run();
        } else {
          // habis: duduk termenung (Doc 13 Â§3)
          this.playClip("sit");
          this.after(1600);
        }
      });
    };
    run();
  }

  private executeRoll(durationMs: number): void {
    this.playClip("stretch"); // berguling tidak nyaman (Doc 13 Â§3)
    this.scene.tweens.add({
      targets: this.fox,
      angle: 360,
      duration: durationMs * 0.6,
      ease: "Sine.easeInOut",
      onComplete: () => this.fox.setAngle(0),
    });
    const dust = this.scene.add
      .text(this.fox.x, this.fox.y + 8, "ðŸ’«", { fontSize: "12px" })
      .setDepth(4);
    this.scene.tweens.add({
      targets: dust,
      alpha: 0,
      y: "-=14",
      duration: 800,
      onComplete: () => dust.destroy(),
    });
    this.scene.time.delayedCall(durationMs, () => this.after(0));
  }

  /** Lanjut ke idle + jadwalkan otak (dibatalkan bila scene memegang kendali). */
  private after(delayMs: number): void {
    if (this.isHeld) return;
    this.playClip("idle");
    this.scheduleBrain(delayMs || undefined);
  }

  // ===== POI taman (Doc 13 Â§6) & kepribadian =====

  /** Titik jelajah acak dalam waypoint map scene (Doc 13 §6). */
  private pickWanderPoint(): FoxPoint {
    const b = this.cfg.wanderBounds;
    return {
      x: this.rng.int(b.minX, b.maxX + 1),
      y: this.rng.int(b.minY, b.maxY + 1),
    };
  }

  private pickPoi(chance: number): FoxPoi | null {
    const pois = this.cfg.pois;
    if (!pois || pois.length === 0 || this.rng.next() >= chance) return null;
    const available = pois.filter((p) => {
      const at = typeof p.at === "function" ? p.at() : p.at;
      return at !== null;
    });
    if (available.length === 0) return null;
    const total = available.reduce((sum, p) => sum + p.weight, 0);
    let roll = this.rng.next() * total;
    for (const p of available) {
      roll -= p.weight;
      if (roll < 0) return p;
    }
    return available[available.length - 1]!;
  }

  private visitPoi(poi: FoxPoi): void {
    const at = typeof poi.at === "function" ? poi.at() : poi.at;
    if (!at) {
      this.scheduleBrain();
      return;
    }
    this.startMove(at, poi.run === true, () => {
      this.playClip(poi.clip);
      this.after(2800);
    });
  }

  /** Air pemalu: menghindar saat pointer mendekat <70px (Doc 13 Fase C). */
  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.personality !== "water") return;
    if (this.isHeld || this.moveTarget) return;
    const g = getGameState();
    if (g.sleeping || g.dead || g.sick) return;
    const dist = Phaser.Math.Distance.Between(p.worldX, p.worldY, this.fox.x, this.fox.y);
    if (dist >= 70) return;
    const angle = Math.atan2(this.fox.y - p.worldY, this.fox.x - p.worldX);
    const b = this.cfg.wanderBounds;
    const tx = Phaser.Math.Clamp(this.fox.x + Math.cos(angle) * 60, b.minX, b.maxX);
    const ty = Phaser.Math.Clamp(this.fox.y + Math.sin(angle) * 60, b.minY, b.maxY);
    this.startMove({ x: tx, y: ty }, false, () => this.tickBrain(true));
  }

  // ===== Tampilan (dipindah dari HomeScene â€” agent pemilik fox) =====

  playClip(clip: ClipName): void {
    if (this.currentClip === clip && this.sprite.anims.isPlaying) return;
    this.currentClip = clip;
    this.sprite.play(kitsuneAnim(this.element, clip));
  }

  /** Putar klip sekali â†’ kembali idle; otak di-hold selama klip. */
  playOnce(clip: ClipName): void {
    this.isHeld = true;
    this.brainTimer?.remove(false);
    this.cancelMove();
    this.currentClip = clip;
    this.sprite.play(kitsuneAnim(this.element, clip));
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.currentClip === clip) {
        this.playClip("idle");
        this.release();
      }
    });
  }

  /** Ekor bertambah + tint jalur (M3) + warna genetika (M7). */
  setAppearance(a: { element: string; path: string; tails: number; coatColor?: string }): void {
    const elementChanged = a.element !== this.element;
    this.element = a.element as PetElement;
    this.stage = a.tails >= 3 ? "adult" : "baby";
    const g = getGameState();
    this.personality = (g.personality as PetElement) ?? this.element;
    if (elementChanged) this.sprite.setTexture(`kitsune_${a.element}`);
    this.applyStageScale();
    const baseCoat = ELEMENT_COAT[a.element as keyof typeof ELEMENT_COAT];
    const coat = a.coatColor;
    const hasGeneticCoat = coat !== undefined && coat.toUpperCase() !== baseCoat.toUpperCase();
    const tint = hasGeneticCoat ? Number.parseInt(coat.slice(1), 16) : (PATH_TINT[a.path] ?? 0xffffff);
    this.sprite.setTint(tint);
    const color = TAIL_COLOR[a.path] ?? 0xe8874a;
    const gg = this.tailsG;
    gg.clear();
    // Kipas ekor di belakang tubuh: puff kecil menumpuk dari bawah ke atas
    for (let i = 0; i < Math.max(a.tails, 1); i++) {
      const px = -24 - (i % 2) * 5;
      const py = 8 - i * 7;
      gg.fillStyle(color, 0.95);
      gg.fillCircle(px, py, 7);
      gg.fillStyle(0xffffff, 0.25);
      gg.fillCircle(px - 2, py - 2, 2.5);
    }
    this.playClip("idle");
  }

  /** Skala bulat tahap (Doc 10 Â§1): bayi/remaja Ã—2, dewasa Ã—3 â€” anti blur. */
  private applyStageScale(): void {
    const scale = this.stage === "baby" || this.stage === "teen" ? 2 : 3;
    this.sprite.setScale(scale);
  }

  /** Ganti klip ambient bila tidak transien/bergerak (Doc 01 Â§6). */
  private refreshAmbientClip(): void {
    if (this.isHeld || this.moveTarget) return;
    const busy: Array<ClipName | string> = [
      "eat",
      "petted",
      "bathe",
      "evolve",
      "dead",
      "walk",
      "run",
      "sit",
      "sniff",
      "stretch",
      "look_around",
      "chase_tail",
    ];
    if (busy.includes(this.currentClip)) return;
    const g = getGameState();
    let clip: ClipName = "idle";
    if (g.sick) clip = "sick";
    else if (g.stats.happiness < 30) clip = "idle_sad";
    else if (g.stats.happiness > 80 && Math.random() < 0.1) clip = "idle_happy";
    this.playClip(clip);
  }
}
