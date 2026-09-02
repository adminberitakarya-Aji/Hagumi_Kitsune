/** Kingyo-sukui (Doc 05 §2): poi kertas — sentuh & tahan di atas ikan untuk menangkap.
 * Poi basi bertahap (3 retakan; water = 4 tahap), robek jika digerakkan terlalu cepat.
 * Ikan biasa 10 poin, koi emas 50. Poi cadangan bisa dipungut di air (maks +1; earth mulai +1). */
import Phaser from "phaser";
import { MinigameBase } from "./MinigameBase";
import { getGameState } from "../../store/gameState";

interface Fish {
  obj: Phaser.GameObjects.Text;
  gold: boolean;
  progress: number; // 0..1 — kemajuan menangkap saat ditahan
}

const POI_STAGES_BASE = 3; // Doc 05 §2: 3 tahap retak
const CATCH_TIME = 550; // ms menahan untuk menangkap
const SPEED_TEAR_DIST = 18; // px/frame — poi robek bila digerakkan terlalu cepat

export class KingyoScene extends MinigameBase {
  protected readonly bg = 0x6fa8dc;
  private fish: Fish[] = [];
  private scoop!: Phaser.GameObjects.Text;
  private poiStages = POI_STAGES_BASE;
  private sparePoi = 0; // poi cadangan (earth mulai 1)
  private holding = false;
  private lastScoopX = 180;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private poiPickup?: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;

  protected buildArena(): void {
    // Kolam
    this.add.ellipse(180, 380, 330, 420, 0x5a90c8).setStrokeStyle(4, 0x4a7ab0);
    this.add
      .text(180, 110, "🐟 Tahan di atas ikan — jangan gerak cepat!", { fontSize: "11px", color: "#2B2B33" })
      .setOrigin(0.5);

    // Bonus elemen (Doc 05 §2): water poi 4 tahap, earth +1 poi cadangan
    const el = getGameState().element;
    this.poiStages = el === "water" ? POI_STAGES_BASE + 1 : POI_STAGES_BASE;
    this.sparePoi = el === "earth" ? 1 : 0;

    this.stageText = this.add
      .text(180, 510, this.poiLabel(), { fontSize: "14px", color: "#2B2B33" })
      .setOrigin(0.5)
      .setDepth(4);
    this.scoop = this.add.text(180, 560, "🥄", { fontSize: "36px" }).setOrigin(0.5).setDepth(3);

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const nx = Phaser.Math.Clamp(p.x, 20, 340);
      const moved = Math.abs(nx - this.lastScoopX);
      this.lastScoopX = nx;
      this.scoop.setX(nx);
      if (this.running && this.holding && moved > SPEED_TEAR_DIST) this.damagePoi(true);
    });
    this.input.on("pointerdown", () => {
      this.holding = true;
    });
    this.input.on("pointerup", () => {
      this.holding = false;
      for (const f of this.fish) f.progress = 0;
    });
  }

  private poiLabel(): string {
    const cracks = Math.max(0, POI_STAGES_BASE + 1 - this.poiStages);
    return `Poi: ${"●".repeat(Math.max(0, this.poiStages))}${"✖".repeat(cracks)}${this.sparePoi > 0 ? "  🥄+1" : ""}`;
  }

  /** Poi rusak: pakai cadangan bila ada, otherwise sesi berakhir (Doc 05 §2). */
  private damagePoi(fromSpeed: boolean): void {
    if (!this.running) return;
    this.poiStages--;
    const fx = this.add
      .text(this.scoop.x, 520, fromSpeed ? "💨 robek!" : "💥", { fontSize: "14px", color: "#7A2F28" })
      .setOrigin(0.5)
      .setDepth(5);
    this.time.delayedCall(400, () => fx.destroy());
    if (this.poiStages <= 0) {
      if (this.sparePoi > 0) {
        this.sparePoi--;
        this.poiStages = POI_STAGES_BASE;
      } else {
        this.stageText.setText("Poi robek!");
        this.endGame();
      }
    }
    this.stageText.setText(this.poiLabel());
  }

  private spawnFish(): void {
    const gold = Math.random() < 0.15; // koi emas jarang (Doc 05 §2)
    const fish = this.add
      .text(Phaser.Math.Between(40, 320), 170, "🐟", { fontSize: gold ? "30px" : "26px" })
      .setOrigin(0.5)
      .setDepth(2);
    if (gold) fish.setTint(0xffd700);
    const entry: Fish = { obj: fish, gold, progress: 0 };
    this.fish.push(entry);
    this.tweens.add({
      targets: fish,
      y: 620,
      x: fish.x + Phaser.Math.Between(-50, 50),
      duration: gold ? Phaser.Math.Between(1500, 2200) : Phaser.Math.Between(2400, 3600),
      onComplete: () => {
        this.fish = this.fish.filter((f) => f !== entry);
        fish.destroy();
      },
    });
  }
  /** Poi cadangan melayang di air — scoop untuk ambil (maks +1, Doc 05 §2). */
  private spawnPoiPickup(): void {
    if (this.poiPickup || this.sparePoi > 0) return;
    const x = Phaser.Math.Between(50, 310);
    this.poiPickup = this.add.text(x, 200, "🥄", { fontSize: "26px" }).setOrigin(0.5).setDepth(2).setAlpha(0.9);
    this.tweens.add({
      targets: this.poiPickup,
      y: 560,
      angle: 12,
      duration: 4200,
      onComplete: () => {
        this.poiPickup?.destroy();
        this.poiPickup = undefined;
      },
    });
  }

  protected override onStart(): void {
    this.spawnTimer = this.time.addEvent({ delay: 700, loop: true, callback: () => this.spawnFish() });
    this.time.addEvent({ delay: 6500, loop: true, callback: () => this.spawnPoiPickup() });
  }

  override update(_time: number, delta: number): void {
    if (!this.running) return;
    const dt = delta / 1000;
    // Tangkap: tahan scoop di atas ikan (Doc 05 §2)
    for (const fish of [...this.fish]) {
      const near =
        Math.abs(fish.obj.x - this.scoop.x) < 34 && Math.abs(fish.obj.y - this.scoop.y) < 40;
      if (near && this.holding) {
        fish.progress += delta / CATCH_TIME;
        fish.obj.setScale(1 + fish.progress * 0.25);
        if (fish.progress >= 1) {
          this.fish = this.fish.filter((f) => f !== fish);
          const splash = this.add.text(fish.obj.x, fish.obj.y, "✨", { fontSize: "18px" }).setDepth(4);
          this.time.delayedCall(300, () => splash.destroy());
          fish.obj.destroy();
          this.addPoints(fish.gold ? 50 : 10);
          this.damagePoi(false); // poi menipis tiap tangkapan
        }
      } else if (fish.progress > 0) {
        fish.progress = Math.max(0, fish.progress - dt * 2);
        fish.obj.setScale(1 + fish.progress * 0.25);
      }
    }
    // Pungut poi cadangan
    if (
      this.poiPickup &&
      Math.abs(this.poiPickup.x - this.scoop.x) < 30 &&
      Math.abs(this.poiPickup.y - this.scoop.y) < 40
    ) {
      if (this.sparePoi === 0) {
        this.sparePoi = 1;
        this.stageText.setText(this.poiLabel());
      }
      this.poiPickup.destroy();
      this.poiPickup = undefined;
    }
  }

  protected override endGame(aborted = false): void {
    this.spawnTimer?.remove();
    this.poiPickup?.destroy();
    super.endGame(aborted);
  }
}
