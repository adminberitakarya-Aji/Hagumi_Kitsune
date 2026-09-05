/**
 * Kitsune flat-vector renderer v2 (M10 — Doc 10 §0 revisi, Doc 17 §1 revisi 04/09).
 *
 * Gaya: FLAT VECTOR KAWAII — bentuk bulat, kepala besar (~40%), outline lembut 1 warna,
 * shading 2-tone (base + shade alpha), mata glossy, blush sakura.
 * Beda dengan pixel: ROTASI & SQUASH-STRETCH legal → animasi (wag, zoomies M13) luwes.
 *
 * Teknik: digambar pada koordinat 0..32 lalu SUPERSAMPLE ×4 dan diturunkan ke slot
 * texture 32×32 (footprint scene tidak berubah — texture key & anim keys tetap).
 * Kontrak FrameOpts identik dengan renderer pixel (PixelFrameOpts).
 */
import type { FoxPal, PixelFrameOpts } from "./foxPixels";

const SS = 4; // faktor supersample
const SZ = 32; // ukuran slot frame

let scratchCanvas: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

function getScratch(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!scratchCanvas || !scratchCtx) {
    scratchCanvas = document.createElement("canvas");
    scratchCanvas.width = SZ * SS;
    scratchCanvas.height = SZ * SS;
    scratchCtx = scratchCanvas.getContext("2d");
    if (!scratchCtx) throw new Error("foxVector: canvas 2d tidak tersedia");
  }
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  scratchCtx.clearRect(0, 0, SZ * SS, SZ * SS);
  return { canvas: scratchCanvas, ctx: scratchCtx };
}

/** Ellips/blob dengan outline — fondasi semua bentuk kawaii. */
function blob(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  fill: string | null,
  stroke: string | null,
): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill !== null) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke !== null) {
    c.lineWidth = 0.7;
    c.lineJoin = "round";
    c.strokeStyle = stroke;
    c.stroke();
  }
}

/** Telinga segitiga membulat; down = rebah ke samping (rotasi — legal di vector). */
function ear(c: CanvasRenderingContext2D, x: number, y: number, pal: FoxPal, down: boolean): void {
  c.save();
  c.translate(x, y);
  if (down) c.rotate(2.4);
  c.beginPath();
  c.moveTo(-2, 2.6);
  c.quadraticCurveTo(-1.4, -2.8, 0, -3.4);
  c.quadraticCurveTo(1.4, -2.8, 2, 2.6);
  c.closePath();
  c.fillStyle = pal.body;
  c.fill();
  c.lineWidth = 0.7;
  c.strokeStyle = pal.line;
  c.stroke();
  c.beginPath();
  c.moveTo(-0.9, 1.6);
  c.quadraticCurveTo(-0.6, -1.2, 0, -1.7);
  c.quadraticCurveTo(0.6, -1.2, 0.9, 1.6);
  c.closePath();
  c.fillStyle = pal.inner;
  c.globalAlpha = 0.75;
  c.fill();
  c.globalAlpha = 1;
  c.restore();
}

/** Ekor tear-drop yang bisa dirotasi (wag/zoomies) — ujung krem. */
function tail(c: CanvasRenderingContext2D, pal: FoxPal, wag: number): void {
  c.save();
  c.translate(9.5, 19.5);
  c.rotate(wag * 0.11);
  blob(c, -3.4, -4.6, 5.6, 3.7, -0.6, pal.body, pal.line);
  blob(c, -6.6, -7.4, 2.7, 2.3, -0.6, pal.belly, pal.line);
  c.restore();
}

/** Kepala besar kawaii + moncong krem + blush — pusat ekspresi. */
function head(c: CanvasRenderingContext2D, pal: FoxPal, hx: number, hy: number, o: PixelFrameOpts): void {
  ear(c, hx + 20.3, hy + 6.6, pal, o.earsDown);
  ear(c, hx + 25.7, hy + 6.6, pal, o.earsDown);

  blob(c, hx + 23, hy + 11, 6.5, 6.1, 0, pal.body, null);
  c.save();
  c.beginPath();
  c.ellipse(hx + 23, hy + 11, 6.5, 6.1, 0, 0, Math.PI * 2);
  c.clip();
  c.globalAlpha = 0.28;
  blob(c, hx + 23, hy + 14.6, 6.2, 3.4, 0, pal.shade, null);
  c.globalAlpha = 1;
  c.restore();
  blob(c, hx + 23, hy + 11, 6.5, 6.1, 0, null, pal.line);

  blob(c, hx + 25.8, hy + 13.6, 3.1, 2.3, 0, pal.belly, null);
  c.globalAlpha = 0.4;
  blob(c, hx + 20.4, hy + 13.2, 1.2, 0.7, 0, pal.inner, null);
  c.globalAlpha = 1;
  blob(c, hx + 27.4, hy + 13, 0.62, 0.5, 0, pal.eye, null);
  drawFace(c, pal, hx, hy, o);
}

export function drawFoxVectorFrame(
  ctx: CanvasRenderingContext2D,
  pal: FoxPal,
  ox: number,
  oy: number,
  o: PixelFrameOpts,
): void {
  const { canvas, ctx: sc } = getScratch();
  sc.save();
  sc.scale(SS, SS);
  paint(sc, pal, o);
  sc.restore();

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(ox, oy, SZ, SZ);
  ctx.drawImage(canvas, 0, 0, SZ * SS, SZ * SS, ox, oy, SZ, SZ);
  ctx.restore();
}

/** Lukis satu pose penuh pada kanvas supersample (koordinat 0..32). */
function paint(c: CanvasRenderingContext2D, pal: FoxPal, o: PixelFrameOpts): void {
  if (o.inWater) {
    blob(c, 16, 25.6, 14, 1.9, 0, "#BFE3F5", null);
    blob(c, 17, 27.4, 8, 1.4, 0, "#8FB6D9", null);
    head(c, pal, 0, 8.4, o);
    drawExtras(c, pal, o);
    drawAura(c, pal, o);
    return;
  }

  if (o.lying) {
    // rebah (sleep/dead): badan panjang membulat, kepala bertumpu, ekor melingkar depan
    c.globalAlpha = 0.12;
    blob(c, 15.5, 29.4, 11, 1.7, 0, "#000000", null);
    c.globalAlpha = 1;
    tail(c, pal, o.tailWag);
    blob(c, 14, 24, 10, 4.2, 0, pal.body, null);
    c.save();
    c.beginPath();
    c.ellipse(14, 24, 10, 4.2, 0, 0, Math.PI * 2);
    c.clip();
    c.globalAlpha = 0.3;
    blob(c, 14, 26.4, 9.4, 2.2, 0, pal.shade, null);
    c.globalAlpha = 1;
    c.restore();
    blob(c, 14, 24, 10, 4.2, 0, null, pal.line);
    blob(c, 18.6, 26.6, 1.7, 1.1, 0, pal.belly, pal.line);
    head(c, pal, 1, 6.4, o);
    drawExtras(c, pal, o);
    drawAura(c, pal, o);
    return;
  }

  // ===== Berdiri: bayangan → ekor → kaki → badan → kepala =====
  c.globalAlpha = 0.12;
  blob(c, 15.5, 29.6, 10, 1.8, 0, "#000000", null);
  c.globalAlpha = 1;

  c.save();
  c.translate(0, o.bob);
  tail(c, pal, o.tailWag);

  // kaki gemuk pendek (fase jalan: geser ±1, angkat bergantian)
  const phase = o.legPhase === null ? -1 : o.legPhase % 3;
  const frontShift = phase === 0 ? 1 : phase === 1 ? 0 : -1;
  const lift = 0.8;
  blob(c, 11.4 - frontShift, 26.6 - (phase === 1 ? lift : 0), 1.6, 2.7, 0, pal.body, pal.line);
  blob(c, 17.6 + frontShift, 26.6 - (phase === 0 ? lift : 0), 1.6, 2.7, 0, pal.body, pal.line);

  // badan bulat + shading 2-tone + dada krem
  blob(c, 15, 21.3, 7.4, 6.3, 0, pal.body, null);
  c.save();
  c.beginPath();
  c.ellipse(15, 21.3, 7.4, 6.3, 0, 0, Math.PI * 2);
  c.clip();
  c.globalAlpha = 0.3;
  blob(c, 15, 25.2, 7, 3, 0, pal.shade, null);
  c.globalAlpha = 1;
  c.restore();
  blob(c, 18.8, 22.6, 3.4, 3.9, 0, pal.belly, null);
  blob(c, 15, 21.3, 7.4, 6.3, 0, null, pal.line);

  head(c, pal, 0, o.headDrop * 0.9, o);
  c.restore();
  drawExtras(c, pal, o);
  drawAura(c, pal, o);
}

// ===== Wajah: mata glossy besar & mulut kecil (koordinat kepala) =====

function drawFace(c: CanvasRenderingContext2D, pal: FoxPal, hx: number, hy: number, o: PixelFrameOpts): void {
  const k = pal.eye;
  const lx = hx + 21;
  const rx = hx + 25.4;
  const ey = hy + 11;
  switch (o.eyes) {
    case "open":
      blob(c, lx, ey, 1.35, 1.5, 0, k, null);
      blob(c, rx, ey, 1.35, 1.5, 0, k, null);
      blob(c, lx - 0.4, ey - 0.5, 0.5, 0.5, 0, "#FFFFFF", null);
      blob(c, rx - 0.4, ey - 0.5, 0.5, 0.5, 0, "#FFFFFF", null);
      blob(c, lx + 0.4, ey + 0.4, 0.25, 0.25, 0, "#FFFFFF", null);
      blob(c, rx + 0.4, ey + 0.4, 0.25, 0.25, 0, "#FFFFFF", null);
      break;
    case "happy": // ∩ melengkung senang
      arc(c, lx, ey + 0.4, 1.15, Math.PI, Math.PI * 2, k);
      arc(c, rx, ey + 0.4, 1.15, Math.PI, Math.PI * 2, k);
      break;
    case "sad": // ∪ turun + air mata kecil
      arc(c, lx, ey - 0.2, 1.15, 0, Math.PI, k);
      arc(c, rx, ey - 0.2, 1.15, 0, Math.PI, k);
      blob(c, rx + 0.9, ey + 1.6, 0.45, 0.65, 0, "#8FB6D9", null);
      break;
    case "closed":
    case "sleep":
      arc(c, lx, ey - 0.4, 1.25, Math.PI * 0.15, Math.PI * 0.85, k);
      arc(c, rx, ey - 0.4, 1.25, Math.PI * 0.15, Math.PI * 0.85, k);
      break;
    case "dizzy": // X
      line(c, lx - 0.9, ey - 0.9, lx + 0.9, ey + 0.9, k);
      line(c, lx + 0.9, ey - 0.9, lx - 0.9, ey + 0.9, k);
      line(c, rx - 0.9, ey - 0.9, rx + 0.9, ey + 0.9, k);
      line(c, rx + 0.9, ey - 0.9, rx - 0.9, ey + 0.9, k);
      break;
  }

  const mx = hx + 27.2;
  const my = hy + 14.6;
  switch (o.mouth) {
    case "smile":
      arc(c, mx, my - 0.4, 1.1, Math.PI * 0.15, Math.PI * 0.85, pal.line);
      break;
    case "open":
      blob(c, mx, my, 1, 1.2, 0, pal.line, null);
      blob(c, mx, my + 0.5, 0.55, 0.5, 0, pal.inner, null);
      break;
    case "flat":
      line(c, mx - 0.8, my, mx + 0.8, my, pal.line);
      break;
    case "wavy":
      c.beginPath();
      c.moveTo(mx - 1.1, my);
      c.quadraticCurveTo(mx - 0.4, my + 0.7, mx, my);
      c.quadraticCurveTo(mx + 0.4, my - 0.7, mx + 1.1, my);
      c.lineWidth = 0.6;
      c.strokeStyle = pal.line;
      c.stroke();
      break;
  }
}

function arc(c: CanvasRenderingContext2D, x: number, y: number, r: number, a0: number, a1: number, color: string): void {
  c.beginPath();
  c.arc(x, y, r, a0, a1);
  c.lineWidth = 0.8;
  c.lineCap = "round";
  c.strokeStyle = color;
  c.stroke();
}

function line(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.lineWidth = 0.7;
  c.lineCap = "round";
  c.strokeStyle = color;
  c.stroke();
}

// ===== Efek ekstra & aura =====

function drawExtras(c: CanvasRenderingContext2D, pal: FoxPal, o: PixelFrameOpts): void {
  switch (o.extra) {
    case "zzz":
      c.beginPath();
      c.moveTo(26, 2);
      c.lineTo(29, 2);
      c.lineTo(26, 5);
      c.lineTo(29, 5);
      c.lineWidth = 0.7;
      c.strokeStyle = pal.line;
      c.stroke();
      break;
    case "sweat":
      blob(c, 27, 2.6, 0.95, 1.15, 0, "#8FB6D9", null);
      break;
    case "heart":
      blob(c, 26.7, 1.7, 0.95, 0.9, 0, "#C1443C", null);
      blob(c, 28.5, 1.7, 0.95, 0.9, 0, "#C1443C", null);
      c.beginPath();
      c.moveTo(25.9, 2.2);
      c.lineTo(29.3, 2.2);
      c.lineTo(27.6, 4.7);
      c.closePath();
      c.fillStyle = "#C1443C";
      c.fill();
      break;
    case "bubble":
      c.globalAlpha = 0.85;
      blob(c, 27.4, 4.4, 1.2, 1.2, 0, null, "#EAF3FB");
      blob(c, 29.4, 8.8, 0.8, 0.8, 0, null, "#EAF3FB");
      blob(c, 3.6, 7, 0.9, 0.9, 0, null, "#EAF3FB");
      c.globalAlpha = 1;
      break;
    case "sparkle":
      star(c, 3, 3, pal.accent);
      star(c, 29, 7, pal.accent);
      star(c, 6, 28, pal.accent);
      star(c, 28, 26, pal.accent);
      break;
    default:
      break;
  }
}

/** Bintang 4 arah (kilau evolusi). */
function star(c: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  c.beginPath();
  c.moveTo(x, y - 1.1);
  c.lineTo(x + 0.35, y - 0.35);
  c.lineTo(x + 1.1, y);
  c.lineTo(x + 0.35, y + 0.35);
  c.lineTo(x, y + 1.1);
  c.lineTo(x - 0.35, y + 0.35);
  c.lineTo(x - 1.1, y);
  c.lineTo(x - 0.35, y - 0.35);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

function drawAura(c: CanvasRenderingContext2D, pal: FoxPal, o: PixelFrameOpts): void {
  if (o.aura <= 0) return;
  const r = 6 + o.aura * 7;
  c.globalAlpha = 0.35 + o.aura * 0.4;
  c.beginPath();
  c.arc(16, 16, r, 0, Math.PI * 2);
  c.lineWidth = 1.1;
  c.strokeStyle = pal.accent;
  c.stroke();
  c.globalAlpha = 0.18;
  c.beginPath();
  c.arc(16, 16, r + 2, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 1;
}


