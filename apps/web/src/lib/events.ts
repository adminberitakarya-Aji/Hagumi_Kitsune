/** Kontrak event lintas dunia (Doc 09 §2 aturan 3): UI → system → (state) → render.
 * Satu-satunya jalur komunikasi antara React, system, dan Phaser. */
export interface GameEventMap {
  /* UI → system (niat aksi) */
  "ui/action": { id: string }; // tombol menu/HUD/door yang belum punya layar → toast stub
  "ui/feed": { foodId: string };
  "ui/bath": undefined;
  "ui/sleep": { on: boolean };
  "ui/buy": { itemId: string }; // Toko Dagashiya (Doc 12 §6)
  "ui/use-medicine": undefined; // banner sakit / Dapur tab Obat
  "ui/memorial-continue": undefined; // memorial → hapus save → Splash (Doc 12 §11.4)
  "ui/evolve-continue": undefined; // tutup cutscene evolusi → kembali IDLE (Doc 12 §11.3)
  /* Phaser → system (input di kanvas) */
  "game/pet-tap": undefined; // patok
  "game/pet-stroke": undefined; // belai (usap ≥120px)
  "game/poop-scoop": { index: number }; // sapu poop (hold 400ms, Doc 12 §3.3)
  /* system → Phaser (perintah render — Phaser tidak pernah mengubah stat) */
  "pet/eat": { label: string };
  "pet/say": { text: string };
  "pet/sleep": { on: boolean };
  "poop/count": { count: number }; // sinkron visual poop di tatami
  "pet/appearance": { element: string; path: string; tails: number }; // ekor + tint jalur (M3)
  "fx/hearts": undefined;
  "fx/scoop": { index: number }; // partikel sapu berhasil
  "fx/evolve": { kind: "first" | "final" | "elder" }; // kilat aura evolusi (Doc 12 §11.3)
  /* Backup (Doc 09 §4) — SettingsSheet → system */
  "ui/backup-export": undefined;
  "ui/backup-import": { code: string };
  /* Onboarding (Doc 04) — Splash/Onboarding → system */
  "ui/continue": undefined;
  "ui/new-game": { name: string; element: "fire" | "water" | "wind" | "earth" };
  "ui/tutorial-dismiss": undefined;
  /* Debug panel dev-only (Doc 03 §6) */
  "debug/speed": { multiplier: 1 | 10 | 60 | 3600 };
  "debug/set-phase": { phase: "morning" | "day" | "evening" | "night" };
  "debug/skip-day": undefined;
}
