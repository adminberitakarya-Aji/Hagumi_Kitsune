/** Dasar semua mini-game (Doc 05 §6, Doc 12 §7): layar pra-main, timer, poin, HUD mini,
 * tombol keluar (2-tap konfirmasi), akhiri sesi. Scene turunan mengurus gameplay via
 * onStart() + addPoints()/endGame(). */
import Phaser from "phaser";
import { getMinigameById, minigamesConfig } from "@hagumi/data";
import { eventBus } from "../../lib/eventBus";
import { bindSceneNav } from "../sceneNav";

export abstract class MinigameBase extends Phaser.Scene {
  /** Diisi dari scene.start data (dikirim system saat scene/goto minigame). */
  protected gameId = "";
  /** Rekor saat ini (layar pra-main, Doc 05 §6). */
  protected best = 0;
  protected points = 0;
  /** Koin langsung dari jalur (dash — Doc 05 §4: koin jalur = koin langsung). */
  protected coinBonus = 0;
  /** Gameplay berjalan? (false saat layar pra-main / sesi berakhir). */
  protected running = false;
  private timeLeft = 0;
  private timer?: Phaser.Time.TimerEvent;
  private timeText?: Phaser.GameObjects.Text;
  private pointsText?: Phaser.GameObjects.Text;
  private ended = false;
  private exitArmed = false;

  /** Warna latar & nuansa per game — di-overwrite turunan. */
  protected abstract readonly bg: number;

  init(data: { gameId?: string; best?: number }): void {
    this.gameId = data.gameId ?? "";
    this.best = data.best ?? 0;
    this.points = 0;
    this.coinBonus = 0;
    this.timeLeft = getMinigameById(this.gameId)?.durationSec ?? 30;
    this.ended = false;
    this.running = false;
    this.exitArmed = false;
  }

  create(): void {
    this.add.rectangle(180, 320, 360, 640, this.bg);
    this.buildArena();
    this.buildHud();
    this.buildPreStart();
    const offs = [
      bindSceneNav(this, this.scene.key),
      eventBus.on("scene/goto", () => this.timer?.remove()),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => offs.forEach((off) => off()));
  }

  /** Layar pra-main (Doc 05 §6): judul, aturan 1 kalimat, rekor, [Main] dengan biaya energi. */
  private buildPreStart(): void {
    const def = getMinigameById(this.gameId);
    const w = 300;
    const cx = 180;
    const panel = this.add.rectangle(cx, 300, w, 190, 0xf5efe0, 0.97).setStrokeStyle(3, 0x3d4a6b).setDepth(10);
    this.add
      .text(cx, 238, `${def?.icon ?? "🎮"} ${def?.name ?? "Mini-game"}`, {
        fontSize: "20px",
        color: "#2B2B33",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, 272, def?.tagline ?? "", { fontSize: "11px", color: "#3D4A6B", align: "center", wordWrap: { width: w - 40 } })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(cx, 312, `🏆 Rekor: ${this.best}`, { fontSize: "13px", color: "#2B2B33" })
      .setOrigin(0.5)
      .setDepth(11);
    const btn = this.add
      .rectangle(cx, 356, 120, 40, 0xa84438)
      .setStrokeStyle(2, 0x7a2f28)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);
    this.add
      .text(cx, 356, `Main ⚡−${minigamesConfig.common.energyCost}`, { fontSize: "15px", color: "#F5EFE0" })
      .setOrigin(0.5)
      .setDepth(12);
    btn.on("pointerdown", () => {
      panel.destroy();
      btn.destroy();
      this.startPlay();
    });
  }

  /** HUD mini atas (Doc 12 §7.2): waktu | poin | keluar (konfirmasi 2-tap). */
  private buildHud(): void {
    const bar = this.add.rectangle(180, 62, 360, 28, 0x3d4a6b, 0.85).setDepth(5);
    this.timeText = this.add
      .text(14, 62, `⏱ ${this.timeLeft}`, { fontSize: "14px", color: "#F5EFE0" })
      .setOrigin(0, 0.5)
      .setDepth(6);
    this.pointsText = this.add
      .text(300, 62, "⭐ 0", { fontSize: "14px", color: "#F5EFE0" })
      .setOrigin(1, 0.5)
      .setDepth(6);
    const exit = this.add
      .text(344, 62, "✕", { fontSize: "16px", color: "#F5EFE0", backgroundColor: "#A84438", padding: { x: 5, y: 2 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(6);
    exit.on("pointerdown", () => {
      if (this.exitArmed) {
        this.endGame(true);
        return;
      }
      this.exitArmed = true;
      exit.setText("Yakin?");
      this.time.delayedCall(1600, () => {
        this.exitArmed = false;
        exit.setText("✕");
      });
    });
    void bar;
  }

  /** Mulai sesi: timer berjalan, gameplay aktif. */
  private startPlay(): void {
    if (this.ended) return;
    this.running = true;
    this.onStart();
    this.timer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft--;
        this.timeText?.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 0) this.endGame();
      },
    });
  }

  protected addPoints(n: number): void {
    this.points += n;
    this.pointsText?.setText(`⭐ ${this.points}`);
  }

  /** Akhiri sesi → kirim hasil ke system (hadiah dihitung core, Doc 05 §5).
   * aborted = keluar lewat ✕ (tanpa layar "Selesai"). */
  protected endGame(aborted = false): void {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    this.timer?.remove();
    const finish = (): void => {
      eventBus.emit("game/minigame-result", {
        gameId: this.gameId,
        points: this.points,
        coinBonus: this.coinBonus > 0 ? this.coinBonus : undefined,
      });
    };
    if (aborted) {
      finish();
      return;
    }
    const overlay = this.add.rectangle(180, 320, 360, 640, 0x2b2b33, 0.7).setDepth(8);
    this.add
      .text(180, 300, "Selesai!", { fontSize: "26px", color: "#F5EFE0" })
      .setOrigin(0.5)
      .setDepth(9);
    this.add
      .text(180, 340, `Poin: ${this.points}`, { fontSize: "18px", color: "#F0A8BC" })
      .setOrigin(0.5)
      .setDepth(9);
    this.time.delayedCall(900, () => {
      overlay.destroy();
      finish();
    });
  }

  /** Hook turunan: mulai spawner/pergerakan (dipanggil saat [Main] ditekan). */
  protected onStart(): void {
    // default: tidak ada
  }

  /** Arena gameplay — diimplementasi tiap game. */
  protected abstract buildArena(): void;
}
