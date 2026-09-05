/**
 * Generator sprite pixel-art kitsune (M5 — Doc 01 §6, Doc 10 §1–3).
 * 12 klip animasi × recolor 5 elemen dari SATU set rutin gambar (palet swap).
 * Ukuran dasar 32×32 px; dewasa diskalakan bulat ×2 (anti-blur — Doc 10 §1).
 *
 * Texture key: `kitsune_<element>` (canvas texture, frame bernama "0".."n-1").
 * Anim key   : `kitsune_<element>_<clip>`.
 */
import Phaser from "phaser";
import { ELEMENT_PALETTE, ELEMENT_SHADE, type Palette } from "./palette";
import { type FoxPal } from "./foxPixels";
import { drawFoxVectorFrame } from "./foxVector";

export const FRAME_SIZE = 32;

/** Klip resmi Doc 01 §6: nama, jumlah frame, loop, fps. */
export const CLIPS: Record<string, { frames: number; loop: boolean; fps: number }> = {
  idle: { frames: 4, loop: true, fps: 5 },
  idle_happy: { frames: 4, loop: true, fps: 5 },
  idle_sad: { frames: 4, loop: true, fps: 4 },
  walk: { frames: 6, loop: true, fps: 8 },
  eat: { frames: 6, loop: false, fps: 6 },
  sleep: { frames: 4, loop: true, fps: 3 },
  sick: { frames: 4, loop: true, fps: 4 },
  petted: { frames: 5, loop: false, fps: 8 },
  bathe: { frames: 6, loop: false, fps: 6 },
  evolve: { frames: 10, loop: false, fps: 10 },
  dead: { frames: 1, loop: false, fps: 1 },
  tail_wag: { frames: 2, loop: true, fps: 4 },
};

export type ClipName = keyof typeof CLIPS;

type EyeStyle = "open" | "happy" | "sad" | "closed" | "dizzy" | "sleep";

interface FrameOpts {
  bob: number; // offset tubuh vertikal (px)
  eyes: EyeStyle;
  earsDown: boolean;
  mouth: "smile" | "open" | "flat" | "wavy";
  /** fase kaki 0..5 (walk) — null = berdiri diam */
  legPhase: number | null;
  /** ekor: offset ujung [-2..2] */
  tailWag: number;
  lying: boolean; // tidur / mati — seluruh tubuh rebah
  inWater: boolean; // bathe — badan di bawah garis air
  aura: number; // 0..1 progres kilau evolusi
  extra: "none" | "zzz" | "sweat" | "heart" | "bubble" | "sparkle";
  headDrop: number; // M10: turunnya kepala (eat) dalam px
}

/** Parameter pose per frame per klip (Doc 01 §6 tabel pemicu). */
function optsFor(clip: ClipName, i: number): FrameOpts {
  const base: FrameOpts = {
    bob: 0,
    eyes: "open",
    earsDown: false,
    mouth: "smile",
    legPhase: null,
    tailWag: 0,
    lying: false,
    inWater: false,
    aura: 0,
    extra: "none",
    headDrop: 0,
  };
  switch (clip) {
    case "idle":
      return { ...base, bob: [0, 0, 1, 0][i] ?? 0, tailWag: i % 2 === 0 ? 1 : -1 };
    case "idle_happy":
      return { ...base, bob: i % 2, eyes: "happy", tailWag: i % 2 === 0 ? 2 : -2 };
    case "idle_sad":
      return { ...base, eyes: "sad", earsDown: true, mouth: "wavy", tailWag: i % 2 === 0 ? -2 : -1 };
    case "walk":
      return { ...base, bob: i % 2, legPhase: i, tailWag: i % 2 === 0 ? 1 : -1 };
    case "eat":
      return {
        ...base,
        bob: i % 2 === 0 ? 2 : 0,
        mouth: i % 2 === 0 ? "open" : "smile",
        eyes: i < 2 ? "happy" : "open",
        tailWag: i % 2 === 0 ? 2 : 0,
        headDrop: i % 2 === 0 ? 2 : 1,
      };
    case "sleep":
      return { ...base, lying: true, eyes: "sleep", mouth: "flat", bob: i < 2 ? 0 : 1, extra: i >= 2 ? "zzz" : "none" };
    case "sick":
      return { ...base, eyes: "dizzy", earsDown: true, mouth: "wavy", extra: "sweat", bob: i % 2 };
    case "petted":
      return { ...base, eyes: "happy", extra: i >= 2 ? "heart" : "none", tailWag: i % 2 === 0 ? 2 : -2, bob: i === 4 ? 1 : 0 };
    case "bathe":
      return { ...base, inWater: true, eyes: i < 3 ? "closed" : "happy", extra: i >= 2 ? "bubble" : "none", bob: i % 2 };
    case "evolve":
      return { ...base, eyes: "closed", aura: i / 9, bob: i < 5 ? 0 : 1, extra: i >= 4 ? "sparkle" : "none" };
    case "dead":
      return { ...base, lying: true, eyes: "dizzy", mouth: "flat" };
    case "tail_wag":
      return { ...base, tailWag: i === 0 ? 2 : -2 };
    default:
      return base;
  }
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** @deprecated M10 — digantikan `drawFoxPixelFrame` (foxPixels.ts); dipertahankan sebagai fallback/referensi. */
export function drawFoxFrame(ctx: CanvasRenderingContext2D, pal: Palette, ox: number, oy: number, o: FrameOpts): void {
  const X = (x: number): number => ox + x;
  const Y = (y: number): number => oy + y + o.bob;
  const baseY = o.lying ? 9 : 0; // rebah: tubuh turun

  if (o.inWater) {
    // garis air — badan tersirat di bawahnya
    px(ctx, X(2), Y(25), 28, 2, "#BFE3F5");
    px(ctx, X(10), Y(27), 14, 2, "#8FB6D9");
  }

  // ===== Ekor (kiri, mengarah atas; wag menggeser ujung) =====
  if (!o.inWater) {
    const wag = o.tailWag;
    const tipY = o.lying ? 18 : 12 + (o.earsDown ? 4 : 0);
    px(ctx, X(4 - wag), Y(tipY + 3), 6, 4, pal.body); // pangkal
    px(ctx, X(1 - wag), Y(tipY), 6, 5, pal.body);
    px(ctx, X(0 - wag), Y(tipY - 3), 5, 4, pal.belly); // ujung krem
    px(ctx, X(2 - wag), Y(tipY + 1), 4, 2, pal.line);
  }

  // ===== Tubuh =====
  if (!o.inWater) {
    px(ctx, X(9), Y(17 + baseY), 14, 10, pal.body);
    px(ctx, X(12), Y(21 + baseY), 8, 5, pal.belly); // perut
    px(ctx, X(9), Y(17 + baseY), 14, 1, pal.line);
    px(ctx, X(9), Y(26 + baseY), 14, 1, pal.line);
  }

  // ===== Kaki =====
  if (o.legPhase !== null && !o.inWater && !o.lying) {
    const p = o.legPhase % 3;
    const front = p === 0 ? 1 : p === 1 ? 0 : -1;
    px(ctx, X(11 + front), Y(27), 3, 3, pal.body);
    px(ctx, X(19 - front), Y(27), 3, 3, pal.body);
  } else if (!o.inWater) {
    px(ctx, X(11), Y(27), 3, 3, pal.body);
    px(ctx, X(19), Y(27), 3, 3, pal.body);
  }

  // ===== Kepala =====
  const hy = (o.lying ? 14 : 6) + (o.inWater ? 10 : 0);
  if (!o.earsDown) {
    px(ctx, X(9), Y(hy - 3), 3, 4, pal.body); // telinga kiri
    px(ctx, X(21), Y(hy - 3), 3, 4, pal.body); // telinga kanan
    px(ctx, X(10), Y(hy - 2), 1, 2, pal.inner);
    px(ctx, X(22), Y(hy - 2), 1, 2, pal.inner);
  } else {
    px(ctx, X(7), Y(hy + 3), 4, 2, pal.body);
    px(ctx, X(22), Y(hy + 3), 4, 2, pal.body);
  }
  px(ctx, X(8), Y(hy), 17, 11, pal.body); // kepala
  px(ctx, X(8), Y(hy), 17, 1, pal.line);
  px(ctx, X(8), Y(hy + 10), 17, 1, pal.line);
  px(ctx, X(8), Y(hy), 1, 11, pal.line);
  px(ctx, X(24), Y(hy), 1, 11, pal.line);
  px(ctx, X(17), Y(hy + 6), 8, 5, pal.belly); // moncong
  px(ctx, X(21), Y(hy + 7), 2, 2, pal.eye); // hidung

  // mata & mulut
  const ey = hy + 3;
  const my = hy + 8;
  if (o.eyes === "open") {
    px(ctx, X(12), Y(ey), 2, 3, pal.eye);
    px(ctx, X(19), Y(ey), 2, 3, pal.eye);
    px(ctx, X(12), Y(ey), 1, 1, "#FFFFFF");
    px(ctx, X(19), Y(ey), 1, 1, "#FFFFFF");
  } else if (o.eyes === "happy") {
    px(ctx, X(12), Y(ey + 1), 2, 1, pal.eye);
    px(ctx, X(19), Y(ey + 1), 2, 1, pal.eye);
    px(ctx, X(13), Y(ey), 1, 1, pal.eye);
    px(ctx, X(18), Y(ey), 1, 1, pal.eye);
  } else if (o.eyes === "sad") {
    px(ctx, X(12), Y(ey + 1), 2, 1, pal.eye);
    px(ctx, X(19), Y(ey + 1), 2, 1, pal.eye);
    px(ctx, X(13), Y(ey), 1, 1, pal.eye);
    px(ctx, X(18), Y(ey), 1, 1, pal.eye);
  } else if (o.eyes === "closed" || o.eyes === "sleep") {
    px(ctx, X(12), Y(ey + 1), 2, 1, pal.eye);
    px(ctx, X(19), Y(ey + 1), 2, 1, pal.eye);
  } else if (o.eyes === "dizzy") {
    px(ctx, X(12), Y(ey), 2, 1, pal.eye);
    px(ctx, X(13), Y(ey + 1), 1, 1, pal.eye);
    px(ctx, X(12), Y(ey + 2), 1, 1, pal.eye);
    px(ctx, X(19), Y(ey), 2, 1, pal.eye);
    px(ctx, X(19), Y(ey + 1), 1, 1, pal.eye);
    px(ctx, X(20), Y(ey + 2), 1, 1, pal.eye);
  }
  if (o.mouth === "smile") px(ctx, X(19), Y(my), 3, 1, pal.line);
  else if (o.mouth === "open") {
    px(ctx, X(19), Y(my), 3, 2, pal.line);
    px(ctx, X(20), Y(my), 1, 1, pal.inner);
  } else if (o.mouth === "flat") px(ctx, X(19), Y(my), 2, 1, pal.line);
  else if (o.mouth === "wavy") {
    px(ctx, X(18), Y(my), 1, 1, pal.line);
    px(ctx, X(19), Y(my + 1), 1, 1, pal.line);
    px(ctx, X(20), Y(my), 1, 1, pal.line);
  }

  // ===== Extra =====
  if (o.extra === "zzz") {
    px(ctx, X(26), Y(2), 3, 1, pal.line);
    px(ctx, X(28), Y(5), 2, 1, pal.line);
  } else if (o.extra === "sweat") {
    px(ctx, X(26), Y(2), 2, 2, "#8FB6D9");
    px(ctx, X(26), Y(4), 1, 1, "#8FB6D9");
  } else if (o.extra === "heart") {
    px(ctx, X(26), Y(0), 2, 1, "#C1443C");
    px(ctx, X(29), Y(0), 2, 1, "#C1443C");
    px(ctx, X(26), Y(1), 5, 2, "#C1443C");
    px(ctx, X(27), Y(3), 3, 1, "#C1443C");
    px(ctx, X(28), Y(4), 1, 1, "#C1443C");
  } else if (o.extra === "bubble") {
    px(ctx, X(27), Y(4), 2, 2, "#EAF3FB");
    px(ctx, X(29), Y(9), 2, 2, "#EAF3FB");
    px(ctx, X(3), Y(6), 2, 2, "#EAF3FB");
  } else if (o.extra === "sparkle") {
    px(ctx, X(2), Y(2), 1, 1, pal.accent);
    px(ctx, X(29), Y(6), 1, 1, pal.accent);
    px(ctx, X(5), Y(28), 1, 1, pal.accent);
    px(ctx, X(28), Y(26), 1, 1, pal.accent);
  }

  // ===== Aura evolusi =====
  if (o.aura > 0) {
    const r = Math.round(4 + o.aura * 12);
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.35 + o.aura * 0.4;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 16 - r + 0.5, oy + 16 - r + 0.5, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
}

/** Bangun texture + anims untuk satu elemen. Aman dipanggil ulang (idempoten). */
export function buildKitsuneTextures(scene: Phaser.Scene, element: string): void {
  const pal = ELEMENT_PALETTE[element] ?? ELEMENT_PALETTE.fire!;
  const texKey = `kitsune_${element}`;
  if (scene.textures.exists(texKey)) return;

  const totalFrames = Object.values(CLIPS).reduce((sum, c) => sum + c.frames, 0);
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_SIZE * totalFrames;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const foxPal: FoxPal = { ...pal, shade: ELEMENT_SHADE[element] ?? pal.line };
  let slot = 0;
  const layout = new Map<string, { start: number; count: number }>();
  for (const [clip, def] of Object.entries(CLIPS)) {
    layout.set(clip, { start: slot, count: def.frames });
    for (let i = 0; i < def.frames; i++) {
      drawFoxVectorFrame(ctx, foxPal, slot * FRAME_SIZE, 0, optsFor(clip as ClipName, i));
      slot++;
    }
  }

  const tex = scene.textures.addCanvas(texKey, canvas);
  if (!tex) return;
  for (let i = 0; i < totalFrames; i++) tex.add(String(i), 0, i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE);

  for (const [clip, { start, count }] of layout) {
    const animKey = `kitsune_${element}_${clip}`;
    if (scene.anims.exists(animKey)) continue;
    const def = CLIPS[clip]!;
    scene.anims.create({
      key: animKey,
      frames: Array.from({ length: count }, (_, i) => ({ key: texKey, frame: String(start + i) })),
      frameRate: def.fps,
      repeat: def.loop ? -1 : 0,
    });
  }
}

/** Anim key untuk klip & elemen (dipakai scene saat memilih klip). */
export function kitsuneAnim(element: string, clip: ClipName): string {
  return `kitsune_${element}_${clip}`;
}


