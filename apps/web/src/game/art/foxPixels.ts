/**
 * Kitsune pixel-map sprite v2 (M10 — Doc 17 kontrak aset).
 *
 * Menggantikan gambar kotak prosedural dengan PIXEL ART ASLI: sprite ditulis sebagai
 * peta karakter (1 karakter = 1 peran palet, 1 karakter = 1 pixel), digambar pixel-perfect.
 * Animasi = part-swap: badan/kepala/ekor = layer terpisah yang direposisi/ditukar per frame —
 * pola produksi studio pixel-art; klip baru (M13) cukup menambah layer.
 *
 * Karakter peta: "." transparan · o outline · f body · d shade · w belly · k eye · r inner · h putih.
 * API identik renderer lama (drawFoxFrame) — scene & texture key tidak berubah.
 */
import type { Palette } from "./palette";

export interface FoxPal extends Palette {
  /** Warna bayangan tubuh (lebih gelap dari body — slot §2 Doc 17). */
  shade: string;
}

/** Opsi frame — struktur identik FrameOpts kitsuneArt (headDrop ditambah M10). */
export interface PixelFrameOpts {
  bob: number;
  eyes: "open" | "happy" | "sad" | "closed" | "dizzy" | "sleep";
  earsDown: boolean;
  mouth: "smile" | "open" | "flat" | "wavy";
  legPhase: number | null;
  tailWag: number;
  lying: boolean;
  inWater: boolean;
  aura: number;
  extra: "none" | "zzz" | "sweat" | "heart" | "bubble" | "sparkle";
  headDrop: number;
  /** M13 (Doc 13 §5): pose duduk — ekor melingkar, tubuh piramida. */
  sit?: boolean;
  /** M13: condong badan (radian; + = kepala turun, peregangan/lari). */
  lean?: number;
  /** M13: rotasi seluruh pose (radian) — chase_tail berputar. */
  spin?: number;
  /** M13: geser kepala horizontal (px) — look_around menoleh. */
  headSide?: number;
}

// ===== Layer pixel (menghadap kanan; digambar dalam kanvas 32×32) =====

/** Ekor melengkung naik ke kiri, ujung krem di atas — 12×14, origin (1+wag, 8). */
const TAIL = [
  ".wwo........",
  "wwffo.......",
  "wwfffo......",
  ".wfffdo.....",
  ".wffffdo....",
  "..wffffdo...",
  "..wffffdo...",
  "...wffffdo..",
  "...wffffdo..",
  "....wffffdo.",
  "....wffffdo.",
  ".....wfffdo.",
  ".....wfffo..",
  "......offo..",
];

/** Torso + dada krem di depan (kanan) — 16×12, origin (8, 14). */
const BODY = [
  "....offffffo....",
  "..offffffffffo..",
  ".offffffffffffo.",
  ".offffffffffffo.",
  "offffffffffffffo",
  "offffffffffffwwo",
  "offffffffffffwwo",
  ".offfffffffffwo.",
  "..offffffffffwo.",
  "..offfffffffffo.",
  "....offfffo.....",
  "......oooo......",
];

/** Kepala 3/4 menghadap kanan + telinga tegak + moncong krem & hidung — 13×12, origin (17, 4). */
const HEAD = [
  ".oo....oo....",
  ".ofo..ofo....",
  ".ofoo.ofoo...",
  ".offfoofffo..",
  "..offffffffo.",
  ".offffffffffo",
  ".offffffffffo",
  ".offffffffffo",
  ".offffffwwwko",
  ".offffffwwwko",
  ".offffffffo..",
  "..ooooooooo..",
];

function roleColor(c: string, pal: FoxPal): string | null {
  switch (c) {
    case "o":
      return pal.line;
    case "f":
      return pal.body;
    case "d":
      return pal.shade;
    case "w":
      return pal.belly;
    case "k":
      return pal.eye;
    case "r":
      return pal.inner;
    case "h":
      return "#FFFFFF";
    default:
      return null;
  }
}

/** Gambar peta pixel pixel-perfect (baris pendek/panjang aman — tanpa crash). */
function blit(ctx: CanvasRenderingContext2D, map: string[], pal: FoxPal, ox: number, oy: number): void {
  for (let y = 0; y < map.length; y++) {
    const row = map[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      const color = roleColor(row.charAt(x), pal);
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Gambar satu frame kitsune 32×32 pada offset canvas (ox, oy) — renderer v2. */
export function drawFoxPixelFrame(
  ctx: CanvasRenderingContext2D,
  pal: FoxPal,
  ox: number,
  oy: number,
  o: PixelFrameOpts,
): void {
  if (o.inWater) {
    // garis air — badan tersirat di bawahnya (environment, bukan sprite)
    px(ctx, ox + 2, oy + 25 + o.bob, 28, 2, "#BFE3F5");
    px(ctx, ox + 10, oy + 27 + o.bob, 14, 2, "#8FB6D9");
    const wx = ox + 17;
    const wy = oy + 16 + o.bob;
    blit(ctx, HEAD, pal, wx, wy);
    drawFace(ctx, pal, wx, wy, o);
    drawExtras(ctx, pal, ox, oy + o.bob, o);
    return;
  }

  if (o.lying) {
    // rebah (sleep/dead): tubuh horizontal rendah, kepala bertumpu di depan
    blit(ctx, TAIL, pal, ox + o.tailWag, oy + 16 + o.bob);
    blit(ctx, BODY, pal, ox + 5, oy + 21 + o.bob);
    const lx = ox + 16;
    const ly = oy + 15 + o.bob;
    blit(ctx, HEAD, pal, lx, ly);
    if (o.earsDown) drawEarsDown(ctx, pal, lx, ly);
    drawFace(ctx, pal, lx, ly, o);
    drawExtras(ctx, pal, ox, oy + o.bob, o);
    return;
  }

  // ===== Berdiri: ekor → tubuh → kaki → kepala (urutan = depth) =====
  blit(ctx, TAIL, pal, ox + 1 + o.tailWag, oy + 8 + o.bob);
  blit(ctx, BODY, pal, ox + 8, oy + 14 + o.bob);

  if (o.legPhase !== null) {
    const phase = o.legPhase % 3;
    const front = phase === 0 ? 1 : phase === 1 ? 0 : -1;
    px(ctx, ox + 11 + front, oy + 26 + o.bob, 3, 4, pal.body);
    px(ctx, ox + 18 - front, oy + 26 + o.bob, 3, 4, pal.body);
  } else {
    px(ctx, ox + 11, oy + 26 + o.bob, 3, 4, pal.body);
    px(ctx, ox + 18, oy + 26 + o.bob, 3, 4, pal.body);
  }

  const hx = ox + 17;
  const hy = oy + 4 + o.headDrop + o.bob;
  blit(ctx, HEAD, pal, hx, hy);
  if (o.earsDown) drawEarsDown(ctx, pal, hx, hy);
  drawFace(ctx, pal, hx, hy, o);
  drawExtras(ctx, pal, ox, oy + o.bob, o);
  drawAura(ctx, pal, ox, oy, o);
}

// ===== Wajah: mata & mulut (koordinat lokal kepala 13×12) =====

function drawFace(
  ctx: CanvasRenderingContext2D,
  pal: FoxPal,
  hx: number,
  hy: number,
  o: PixelFrameOpts,
): void {
  const k = pal.eye;
  switch (o.eyes) {
    case "open":
      px(ctx, hx + 2, hy + 6, 2, 3, k);
      px(ctx, hx + 6, hy + 6, 2, 3, k);
      px(ctx, hx + 2, hy + 6, 1, 1, "#FFFFFF"); // kilau mata
      px(ctx, hx + 6, hy + 6, 1, 1, "#FFFFFF");
      break;
    case "happy": // ^^ — mata melengkung naik
      px(ctx, hx + 2, hy + 7, 1, 1, k);
      px(ctx, hx + 3, hy + 6, 1, 1, k);
      px(ctx, hx + 6, hy + 7, 1, 1, k);
      px(ctx, hx + 7, hy + 6, 1, 1, k);
      break;
    case "sad": // mata turun
      px(ctx, hx + 2, hy + 7, 2, 1, k);
      px(ctx, hx + 6, hy + 7, 2, 1, k);
      px(ctx, hx + 3, hy + 6, 1, 1, k);
      px(ctx, hx + 7, hy + 6, 1, 1, k);
      break;
    case "closed":
    case "sleep":
      px(ctx, hx + 2, hy + 7, 2, 1, k);
      px(ctx, hx + 6, hy + 7, 2, 1, k);
      break;
    case "dizzy": // mata X
      px(ctx, hx + 2, hy + 6, 1, 1, k);
      px(ctx, hx + 3, hy + 7, 1, 1, k);
      px(ctx, hx + 2, hy + 7, 1, 1, k);
      px(ctx, hx + 3, hy + 6, 1, 1, k);
      px(ctx, hx + 6, hy + 6, 1, 1, k);
      px(ctx, hx + 7, hy + 7, 1, 1, k);
      px(ctx, hx + 6, hy + 7, 1, 1, k);
      px(ctx, hx + 7, hy + 6, 1, 1, k);
      break;
  }

  const my = hy + 10;
  switch (o.mouth) {
    case "smile":
      px(ctx, hx + 8, my, 3, 1, pal.line);
      break;
    case "open":
      px(ctx, hx + 8, my, 3, 2, pal.line);
      px(ctx, hx + 9, my, 1, 1, pal.inner);
      break;
    case "flat":
      px(ctx, hx + 8, my, 2, 1, pal.line);
      break;
    case "wavy":
      px(ctx, hx + 8, my, 1, 1, pal.line);
      px(ctx, hx + 9, my + 1, 1, 1, pal.line);
      px(ctx, hx + 10, my, 1, 1, pal.line);
      break;
  }
}

/** Telinga rebah: hapus telinga tegak pada peta, lalu gambar kuping datar di sisi kepala. */
function drawEarsDown(ctx: CanvasRenderingContext2D, pal: FoxPal, hx: number, hy: number): void {
  ctx.clearRect(hx + 1, hy, 3, 4);
  ctx.clearRect(hx + 7, hy, 3, 4);
  px(ctx, hx, hy + 5, 3, 2, pal.body);
  px(ctx, hx + 10, hy + 5, 3, 2, pal.body);
  px(ctx, hx, hy + 7, 3, 1, pal.line);
  px(ctx, hx + 10, hy + 7, 3, 1, pal.line);
}

// ===== Efek ekstra (zzz, keringat, hati, gelembung, kilau) =====

function drawExtras(
  ctx: CanvasRenderingContext2D,
  pal: FoxPal,
  ox: number,
  oy: number,
  o: PixelFrameOpts,
): void {
  switch (o.extra) {
    case "zzz":
      px(ctx, ox + 26, oy + 2, 3, 1, pal.line);
      px(ctx, ox + 28, oy + 5, 2, 1, pal.line);
      break;
    case "sweat":
      px(ctx, ox + 26, oy + 2, 2, 2, "#8FB6D9");
      px(ctx, ox + 26, oy + 4, 1, 1, "#8FB6D9");
      break;
    case "heart":
      px(ctx, ox + 26, oy, 2, 1, "#C1443C");
      px(ctx, ox + 29, oy, 2, 1, "#C1443C");
      px(ctx, ox + 26, oy + 1, 5, 2, "#C1443C");
      px(ctx, ox + 27, oy + 3, 3, 1, "#C1443C");
      px(ctx, ox + 28, oy + 4, 1, 1, "#C1443C");
      break;
    case "bubble":
      px(ctx, ox + 27, oy + 4, 2, 2, "#EAF3FB");
      px(ctx, ox + 29, oy + 9, 2, 2, "#EAF3FB");
      px(ctx, ox + 3, oy + 6, 2, 2, "#EAF3FB");
      break;
    case "sparkle":
      px(ctx, ox + 2, oy + 2, 1, 1, pal.accent);
      px(ctx, ox + 29, oy + 6, 1, 1, pal.accent);
      px(ctx, ox + 5, oy + 28, 1, 1, pal.accent);
      px(ctx, ox + 28, oy + 26, 1, 1, pal.accent);
      break;
    default:
      break;
  }
}

/** Aura evolusi — kotak kilau membesar mengikuti progres 0..1. */
function drawAura(
  ctx: CanvasRenderingContext2D,
  pal: FoxPal,
  ox: number,
  oy: number,
  o: PixelFrameOpts,
): void {
  if (o.aura <= 0) return;
  const r = Math.round(4 + o.aura * 12);
  ctx.strokeStyle = pal.accent;
  ctx.globalAlpha = 0.35 + o.aura * 0.4;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 16 - r + 0.5, oy + 16 - r + 0.5, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

