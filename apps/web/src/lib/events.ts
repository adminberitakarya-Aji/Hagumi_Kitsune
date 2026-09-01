/** Kontrak event lintas dunia (Doc 09 §2 aturan 3): UI → system → (state) → render.
 * Satu-satunya jalur komunikasi antara React, system, dan Phaser. */
export interface GameEventMap {
  /* UI → system (niat aksi) */
  "ui/action": { id: string }; // tombol menu/HUD/door yang belum punya layar → toast stub
  "ui/feed": { foodId: string };
  "ui/bath": undefined;
  "ui/sleep": { on: boolean };
  /* Phaser → system (input di kanvas) */
  "game/pet-tap": undefined; // patok
  "game/pet-stroke": undefined; // belai (usap ≥120px)
  /* system → Phaser (perintah render — Phaser tidak pernah mengubah stat) */
  "pet/eat": { label: string };
  "pet/say": { text: string };
  "pet/sleep": { on: boolean };
  "fx/hearts": undefined;
}
