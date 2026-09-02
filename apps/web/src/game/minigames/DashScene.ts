/** Kitsune-dash (Doc 05 §4): runner 60 dtk atau sampai menabrak — ketuk = lompat,
 * tahan = lompat tinggi; rintangan lentera/pagar; koin jalur udara = 2 koin langsung.
 * Jarak 10 m = 1 poin. Bonus elemen fire: tembus rintangan 1× per sesi. */
import Phaser from "phaser";
import { getMinigameById } from "@hagumi/data";
import { MinigameBase } from "./MinigameBase";
import { getGameState } from "../../store/gameState";

const GROUND_Y = 470;
const FOX_X = 70;
const SCROLL_SPEED = 230; // px/dtk
const GRAVITY = 1500;
const JUMP_VY = -560;
const HOLD_GRAVITY = 700; // gravitasi saat menahan = lompat tinggi

interface Obstacle {
  obj: Phaser.GameObjects.Text;
  kind: "lantern" | "fence";
}

export class DashScene extends MinigameBase {
  protected readonly bg = 0xe0955a;
  private fox!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private distTextM = 0;
  private pointMeters = 0; // meter terakhir yang sudah dikonversi poin
  private meters = 0;
  private vy = 0;
  private onGround = true;
  private holding = false;
  private obstacles: Obstacle[] = [];
  private coins: Phaser.GameObjects.Text[] = [];
  private spawnIn = 1.2; // dtk hingga rintangan berikut
  private coinIn = 2.0;
  private dashLeft = 0; // fire: tembus 1× per sesi
  private dashUsedFx?: Phaser.GameObjects.Text;
  private scrolled = 0;

  protected buildArena(): void {
    // Langit + bukit + lintasan
    this.add.rectangle(180, 200, 360, 260, 0xa8c8e8);
    this.add.rectangle(180, GROUND_Y + 85, 360, 170, 0xc9b27c);
    for (let i = 0; i < 9; i++) this.add.rectangle(20 + i * 42, GROUND_Y + 85, 3, 160, 0xf5efe0, 0.35);
    this.add.text(180, 120, "🏃 Ketuk lompat — tahan lompat tinggi!", { fontSize: "12px", color: "#2B2B33" }).setOrigin(0.5);

    this.distText = this.add.text(180, 170, "0 m", { fontSize: "30px", color: "#F5EFE0" }).setOrigin(0.5).setDepth(3);
    this.coinText = this.add.text(180, 210, "🪙 0", { fontSize: "14px", color: "#2B2B33" }).setOrigin(0.5);

    this.fox = this.add.text(FOX_X, GROUND_Y, "🦊", { fontSize: "40px" }).setOrigin(0.5, 1).setDepth(3);

    // Bonus elemen fire (Doc 05 §4): dash tembus rintangan 1× per sesi
    this.dashLeft = getGameState().element === "fire" ? 1 : 0;
    if (this.dashLeft > 0) {
      this.add.text(180, 236, "🔥 Dash siap — tembus 1 rintangan", { fontSize: "10px", color: "#7A2F28" }).setOrigin(0.5);
    }

    this.input.on("pointerdown", () => {
      this.holding = true;
      if (this.running && this.onGround) {
        this.vy = JUMP_VY;
        this.onGround = false;
      }
    });
    this.input.on("pointerup", () => {
      this.holding = false;
    });
  }

  private spawnObstacle(): void {
    const kind: Obstacle["kind"] = Math.random() < 0.6 ? "lantern" : "fence";
    const obj = this.add
      .text(390, GROUND_Y, kind === "lantern" ? "🏮" : "🪧", { fontSize: kind === "lantern" ? "34px" : "30px" })
      .setOrigin(0.5, 1)
      .setDepth(2);
    this.obstacles.push({ obj, kind });
  }

  private spawnCoinArc(): void {
    // Busur 3 koin di jalur udara (Doc 05 §4)
    const baseY = Phaser.Math.Between(300, 380);
    for (let i = 0; i < 3; i++) {
      const coin = this.add
        .text(390 + i * 40, baseY - Math.sin((i / 2) * Math.PI) * 50, "🪙", { fontSize: "22px" })
        .setOrigin(0.5)
        .setDepth(2);
      this.coins.push(coin);
    }
  }

  protected override onStart(): void {
    // spawner dijalankan via update (delta-based)
  }

  override update(_time: number, delta: number): void {
    if (!this.running) return;
    const dt = delta / 1000;

    // Fisika lompat: tahan = gravitasi lemah = lompat tinggi (Doc 05 §4)
    const g = this.holding && this.vy < 0 ? HOLD_GRAVITY : GRAVITY;
    if (!this.onGround) {
      this.vy += g * dt;
      this.fox.y += this.vy * dt;
      if (this.fox.y >= GROUND_Y) {
        this.fox.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
      }
    }
    // Animasi lari sederhana
    this.fox.setAngle(this.onGround ? Math.sin(_time / 60) * 4 : 0);

    // Gulung dunia
    const scroll = SCROLL_SPEED * dt;
    this.scrolled += scroll;
    this.meters = this.scrolled / 20; // 20 px = 1 m (skala visual)
    const whole = Math.floor(this.meters);
    if (whole > this.distTextM) {
      this.distTextM = whole;
    }
    // Jarak N m = 1 poin (N dari minigames.json — Doc 05 §4: 10 m = 1 poin)
    const metersPerPoint = getMinigameById(this.gameId)?.scores.metersPerPoint ?? 10;
    const pointMeters = Math.floor(this.meters / metersPerPoint);
    if (pointMeters > this.pointMeters) {
      this.addPoints(pointMeters - this.pointMeters);
      this.pointMeters = pointMeters;
    }
    this.distText.setText(`${whole} m`);
    this.coinText.setText(`🪙 ${this.coinBonus}`);

    for (const o of [...this.obstacles]) {
      o.obj.x -= scroll;
      if (o.obj.x < -30) {
        this.obstacles = this.obstacles.filter((x) => x !== o);
        o.obj.destroy();
        continue;
      }
      // Tabrakan
      if (Math.abs(o.obj.x - FOX_X) < 26 && this.fox.y > GROUND_Y - 44) {
        if (this.dashLeft > 0) {
          this.dashLeft--;
          this.obstacles = this.obstacles.filter((x) => x !== o);
          o.obj.destroy();
          this.dashUsedFx = this.add.text(FOX_X, GROUND_Y - 60, "🔥", { fontSize: "30px" }).setDepth(4);
          this.time.delayedCall(400, () => this.dashUsedFx?.destroy());
        } else {
          this.endGame(); // menabrak — sesi berakhir (Doc 05 §4)
          return;
        }
      }
    }

    for (const c of [...this.coins]) {
      c.x -= scroll;
      if (c.x < -20) {
        this.coins = this.coins.filter((x) => x !== c);
        c.destroy();
        continue;
      }
      if (Math.abs(c.x - FOX_X) < 30 && Math.abs(c.y - (this.fox.y - 20)) < 34) {
        this.coins = this.coins.filter((x) => x !== c);
        c.destroy();
        this.coinBonus += 2; // koin jalur = koin langsung (Doc 05 §4)
        this.coinText.setText(`🪙 ${this.coinBonus}`);
      }
    }

    // Spawner
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnObstacle();
      this.spawnIn = Phaser.Math.FloatBetween(1.1, 2.1);
    }
    this.coinIn -= dt;
    if (this.coinIn <= 0) {
      this.spawnCoinArc();
      this.coinIn = Phaser.Math.FloatBetween(2.4, 4.2);
    }
  }
}
