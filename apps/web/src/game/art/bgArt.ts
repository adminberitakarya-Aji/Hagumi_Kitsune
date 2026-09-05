/**
 * Generator background 12 scene × musim (M5 — Doc 10 §3, Doc 02 §2).
 * **REVISI v2 (M10 — Doc 10 §0):** flat vector kawaii — bentuk membulat (roundRect/ellipse),
 * palet inti Doc 10 §2 + pola seigaiha/asanoha dipertahankan.
 * Texture key: `bg_<scene>_<musim>` (ukuran 360×640, viewport penuh).
 */
import type Phaser from "phaser";

export const BG_W = 360;
export const BG_H = 640;

export type SceneId =
  | "splash"
  | "egg_altar"
  | "naming"
  | "home"
  | "garden"
  | "onsen"
  | "bedroom"
  | "kitchen"
  | "shop"
  | "festival"
  | "breeding"
  | "album";

export const SCENES: SceneId[] = [
  "splash",
  "egg_altar",
  "naming",
  "home",
  "garden",
  "onsen",
  "bedroom",
  "kitchen",
  "shop",
  "festival",
  "breeding",
  "album",
];

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

/** Langit per musim (atas→bawah) — senada gradient fase Doc 03 §3. */
const SEASON_SKY: Record<SeasonId, [string, string]> = {
  spring: ["#BFD8EC", "#F5EFE0"],
  summer: ["#9CC4E4", "#F2ECD9"],
  autumn: ["#D9B88F", "#F5EFE0"],
  winter: ["#C4CFE0", "#EFF2F6"],
};

/** Aksen musim (tanaman/bunga di scene luar). */
const SEASON_ACCENT: Record<SeasonId, string> = {
  spring: "#F0A8BC",
  summer: "#5E8C6A",
  autumn: "#D95F2B",
  winter: "#DDE6F0",
};

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** Kotak membulat — gaya flat vector kawaii (Doc 10 §0 revisi v2). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Pola seigaiha (gelombang Jepang) — Doc 10 §4 panel bg. */
function seigaiha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 0.35,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const r = 10;
  for (let row = 0; row * 10 < h + r; row++) {
    const cy = y + row * 10;
    for (let col = 0; col * r < w + r; col++) {
      const cx = x + col * r + (row % 2 ? r / 2 : 0);
      for (const rr of [r, r - 4, r - 8]) {
        if (rr <= 0) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, Math.PI, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Pola asanoha (daun rami) — Doc 10 §4. */
function asanoha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 0.25,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const s = 24;
  for (let gy = y; gy < y + h; gy += s) {
    for (let gx = x; gx < x + w; gx += s) {
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + s, gy);
      ctx.lineTo(gx + s / 2, gy + s);
      ctx.closePath();
      ctx.moveTo(gx + s / 2, gy);
      ctx.lineTo(gx + s / 2, gy + s);
      ctx.moveTo(gx, gy + s * 0.5);
      ctx.lineTo(gx + s, gy + s * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function sky(ctx: CanvasRenderingContext2D, season: SeasonId, night = false): void {
  const [top, bottom] = SEASON_SKY[season];
  const g = ctx.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, night ? "#3D4A6B" : top);
  g.addColorStop(1, night ? "#56618C" : bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BG_W, 280);
  if (night) {
    ctx.fillStyle = "#F5EFE0"; // bulan sabit kawaii (Doc 10 §0)
    ctx.beginPath();
    ctx.arc(297, 57, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#56618C";
    ctx.beginPath();
    ctx.arc(301, 53, 7.5, 0, Math.PI * 2);
    ctx.fill();
    for (const [sx, sy] of [
      [40, 40],
      [90, 70],
      [150, 30],
      [210, 80],
      [250, 36],
      [320, 100],
    ] as const) {
      rect(ctx, sx, sy, 2, 2, "#F5EFE0");
    }
  }
}

/** Latar dasar indoor: dinding washi + pola samar + lantai. */
function indoorBase(ctx: CanvasRenderingContext2D, floor: string): void {
  rect(ctx, 0, 0, BG_W, 280, "#EFE7D2");
  seigaiha(ctx, 0, 0, BG_W, 280, "#C9A87C", 0.14);
  rect(ctx, 0, 232, BG_W, BG_H - 232, floor);
}

function drawScene(ctx: CanvasRenderingContext2D, scene: SceneId, season: SeasonId): void {
  const accent = SEASON_ACCENT[season];
  switch (scene) {
    case "splash": {
      sky(ctx, season);
      // torii
      rect(ctx, 90, 120, 12, 140, "#C1443C");
      rect(ctx, 258, 120, 12, 140, "#C1443C");
      rect(ctx, 70, 108, 220, 12, "#C1443C");
      rect(ctx, 82, 132, 196, 8, "#A84438");
      asanoha(ctx, 0, 260, BG_W, 380, "#C9A87C", 0.1);
      rect(ctx, 0, 280, BG_W, BG_H - 280, "#D6C084"); // jalan batu
      seigaiha(ctx, 0, 520, BG_W, 120, "#8A8296", 0.12);
      break;
    }
    case "egg_altar": {
      indoorBase(ctx, "#C9A87C");
      // altar kayu — papan atas membulat (Doc 10 §0)
      roundRect(ctx, 60, 300, 240, 20, 9, "#A87C50");
      rect(ctx, 80, 320, 20, 160, "#8B6840");
      rect(ctx, 260, 320, 20, 160, "#8B6840");
      asanoha(ctx, 0, 340, BG_W, 300, "#8A8296", 0.1);
      break;
    }
    case "naming": {
      rect(ctx, 0, 0, BG_W, BG_H, "#EFE7D2");
      seigaiha(ctx, 0, 0, BG_W, BG_H, "#C9A87C", 0.16);
      break;
    }
    case "home": {
      // Dinding washi + tatami (HomeScene menambah jendela dinamis & interaksi)
      rect(ctx, 0, 48, BG_W, 184, "#EDE4CC");
      seigaiha(ctx, 0, 48, BG_W, 100, "#C9A87C", 0.1);
      rect(ctx, 0, 232, BG_W, BG_H - 232, "#D6C084"); // tatami
      const tat = ctx;
      tat.strokeStyle = "#3E5F3E";
      tat.globalAlpha = 0.3;
      tat.lineWidth = 2;
      for (let y = 274; y <= 590; y += 84) {
        tat.beginPath();
        tat.moveTo(0, y);
        tat.lineTo(BG_W, y);
        tat.stroke();
      }
      for (const x of [120, 240]) {
        tat.beginPath();
        tat.moveTo(x, 232);
        tat.lineTo(x, 400);
        tat.stroke();
      }
      tat.globalAlpha = 1;
      // kotatsu
      roundRect(ctx, 204, 244, 112, 64, 12, "#A84438");
      roundRect(ctx, 222, 222, 76, 22, 9, "#8B6840");
      break;
    }
    case "garden": {
      sky(ctx, season);
      rect(ctx, 0, 280, BG_W, BG_H - 280, "#9DB88A"); // rumput
      // kolam koi
      ctx.fillStyle = "#7FA8C9";
      ctx.beginPath();
      ctx.ellipse(180, 430, 130, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      seigaiha(ctx, 60, 380, 240, 110, "#F5EFE0", 0.25);
      // lentera batu
      roundRect(ctx, 300, 330, 14, 40, 5, "#8A8296");
      roundRect(ctx, 292, 310, 30, 22, 8, "#9AA2AE");
      // batu zen
      roundRect(ctx, 40, 560, 40, 16, 7, "#9AA2AE");
      // pohon musiman (kanan atas)
      rect(ctx, 310, 240, 8, 46, "#8B6840");
      ctx.fillStyle = accent;
      for (const [tx, ty] of [
        [300, 230],
        [316, 226],
        [308, 216],
        [322, 240],
      ] as const) {
        ctx.fillRect(tx, ty, 14, 10);
      }
      break;
    }
    case "onsen": {
      sky(ctx, season, true);
      rect(ctx, 0, 280, BG_W, BG_H - 280, "#8B6840"); // dek kayu
      roundRect(ctx, 40, 380, 280, 170, 26, "#7FA8C9");
      seigaiha(ctx, 50, 390, 260, 140, "#F5EFE0", 0.3);
      roundRect(ctx, 30, 368, 300, 14, 7, "#C9A87C");
      break;
    }
    case "bedroom": {
      indoorBase(ctx, "#C9A87C");
      roundRect(ctx, 60, 400, 240, 110, 18, "#F7C8D0"); // futon
      roundRect(ctx, 60, 400, 240, 22, 11, "#E8B0BE");
      roundRect(ctx, 290, 120, 26, 40, 8, "#F5E6B0"); // andon
      break;
    }
    case "kitchen": {
      indoorBase(ctx, "#C9A87C");
      rect(ctx, 30, 200, 300, 16, "#8B6840"); // rak
      rect(ctx, 30, 320, 300, 16, "#8B6840");
      asanoha(ctx, 0, 420, BG_W, 220, "#8A8296", 0.08);
      break;
    }
    case "shop": {
      sky(ctx, season);
      rect(ctx, 0, 200, BG_W, BG_H - 200, "#C9A87C"); // warung
      // noren
      roundRect(ctx, 60, 210, 60, 70, 6, "#A84438");
      roundRect(ctx, 150, 210, 60, 70, 6, "#A84438");
      roundRect(ctx, 240, 210, 60, 70, 6, "#A84438");
      asanoha(ctx, 0, 300, BG_W, 340, "#8A8296", 0.08);
      break;
    }
    case "festival": {
      sky(ctx, season, true); // malam — Doc 02 S10
      rect(ctx, 0, 240, BG_W, BG_H - 240, "#4A4A6E");
      rect(ctx, 0, 300, BG_W, BG_H - 300, "#3D3D5C");
      // tali lampion
      ctx.strokeStyle = "#8A8296";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.quadraticCurveTo(180, 170, BG_W, 120);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const lx = 40 + i * 56;
        const ly = 130 + Math.round(24 * Math.sin((i / 5) * Math.PI));
        // lampion membulat kawaii (Doc 10 §0)
        ctx.fillStyle = "#C1443C";
        ctx.beginPath();
        ctx.ellipse(lx + 8, ly + 11, 9, 11.5, 0, 0, Math.PI * 2);
        ctx.fill();
        roundRect(ctx, lx + 2, ly + 21, 12, 4, 2, "#F5EFE0");
      }
      // tenda permainan — atap membulat
      for (const sx of [30, 210]) {
        roundRect(ctx, sx, 330, 120, 14, 7, "#C1443C");
        roundRect(ctx, sx + 6, 344, 108, 70, 8, "#A84438");
      }
      break;
    }
    case "breeding": {
      indoorBase(ctx, "#C9A87C");
      // tali enmusubi + plakat altar membulat
      roundRect(ctx, 120, 300, 120, 16, 8, "#A84438");
      roundRect(ctx, 130, 318, 100, 62, 12, "#F5EFE0");
      seigaiha(ctx, 138, 326, 84, 46, "#C1443C", 0.2);
      break;
    }
    case "album": {
      indoorBase(ctx, "#B8A47C");
      for (let i = 0; i < 6; i++) {
        const fx = 40 + (i % 3) * 100;
        const fy = 260 + Math.floor(i / 3) * 120;
        roundRect(ctx, fx, fy, 80, 100, 10, "#8B6840"); // bingkai foto
        roundRect(ctx, fx + 6, fy + 6, 68, 88, 7, "#F5EFE0");
      }
      break;
    }
  }
}

/** Bangun semua texture bg untuk scene yang dipakai Phaser + musim aktif. Idempoten. */
export function buildBackgrounds(
  scene: Phaser.Scene,
  season: SeasonId,
  scenes: readonly SceneId[] = SCENES,
): void {
  for (const id of scenes) {
    const key = `bg_${id}_${season}`;
    if (scene.textures.exists(key)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = BG_W;
    canvas.height = BG_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;
    drawScene(ctx, id, season);
    scene.textures.addCanvas(key, canvas);
  }
}

