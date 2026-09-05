/** Aset kecil scene (M10 — Doc 17 §3.2): poop & penanda pintu — flat vector kawaii (Doc 10 §0).
 * Texture kecil dibangun idempoten via canvas 2D — key: fx_poop, nav_torii, nav_tea. */
import type Phaser from "phaser";

function makeTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

export function buildPropsTextures(scene: Phaser.Scene): void {
  // Poop kawaii: 3 gumpalan membulat + kilau
  makeTex(scene, "fx_poop", 24, 20, (c) => {
    c.lineWidth = 1.2;
    c.strokeStyle = "#6E5A38";
    c.fillStyle = "#B08968";
    const blob = (x: number, y: number, rx: number, ry: number): void => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    };
    blob(12, 14.5, 9.5, 4.6);
    blob(12, 9.6, 6.6, 3.8);
    blob(12, 5.4, 4.2, 2.9);
    c.globalAlpha = 0.4;
    c.fillStyle = "#FFFFFF";
    c.beginPath();
    c.ellipse(9.4, 5.2, 1.5, 1, -0.5, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  });

  // Penanda pintu Taman: mini torii
  makeTex(scene, "nav_torii", 20, 20, (c) => {
    c.strokeStyle = "#C1443C";
    c.lineWidth = 2.2;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(2, 5);
    c.quadraticCurveTo(10, 2.6, 18, 5);
    c.stroke();
    c.beginPath();
    c.moveTo(3.6, 9);
    c.lineTo(16.4, 9);
    c.stroke();
    c.beginPath();
    c.moveTo(5.4, 4.6);
    c.lineTo(5.4, 18);
    c.moveTo(14.6, 4.6);
    c.lineTo(14.6, 18);
    c.stroke();
    c.beginPath();
    c.moveTo(10, 5.4);
    c.lineTo(10, 8.4);
    c.stroke();
  });

  // Penanda pintu Dapur: cangkir matcha + uap
  makeTex(scene, "nav_tea", 20, 20, (c) => {
    c.fillStyle = "#9DB88A";
    c.strokeStyle = "#3D4A6B";
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(4, 8);
    c.lineTo(16, 8);
    c.quadraticCurveTo(16, 15, 10, 15);
    c.quadraticCurveTo(4, 15, 4, 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(16, 9);
    c.quadraticCurveTo(19, 10, 16.6, 12.6);
    c.stroke();
    c.strokeStyle = "#8A8296";
    c.beginPath();
    c.moveTo(8.4, 5.6);
    c.quadraticCurveTo(9.6, 4, 8.4, 2.4);
    c.stroke();
    c.beginPath();
    c.moveTo(12, 5.6);
    c.quadraticCurveTo(13.2, 4, 12, 2.4);
    c.stroke();
  });
}