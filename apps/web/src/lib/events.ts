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
  "pet/appearance": { element: string; path: string; tails: number; coatColor?: string }; // ekor + tint jalur (M3) + warna genetika (M7)
  "fx/hearts": undefined;
  "fx/scoop": { index: number }; // partikel sapu berhasil
  "fx/bathe": undefined; // klip bathe (M5 — aksi onsen)
  "fx/evolve": { kind: "first" | "final" | "elder" }; // kilat aura evolusi (Doc 12 §11.3)
  /* Navigasi scene (M4) — React/system → Phaser */
  "scene/goto": {
    key: "home" | "garden" | "matsuri" | "kingyo" | "wanage" | "dash";
    gameId?: string;
    best?: number; // rekor mini-game untuk layar pra-main (Doc 05 §6)
  };
  /* Mini-game festival Matsuri (Doc 05) */
  "ui/minigame-start": { gameId: string }; // lobi → system (gate + biaya energi)
  "game/minigame-result": { gameId: string; points: number; coinBonus?: number }; // scene → system (hadiah; coinBonus = koin jalur dash)
  "ui/minigame-continue": undefined; // tutup layar hasil → Home
  "minigame/lobby": { best: Record<string, number>; cooldownLeftMs: number }; // system → lobi (rekor + countdown)
  /* Taman & event musiman (Doc 03 §5, Doc 12 §5) */
  "ui/koi-feed": undefined; // beri makan koi (−5🪙 → 😊+3, cd 1 jam)
  "ui/event-cta": { id: "hanami" | "tsukimi" | "omikuji" }; // tombol CTA event di Taman
  "season/event": { id: string | null; claimed: boolean }; // system → Garden (CTA aktif)
  "fx/koi-jump": undefined; // koi melompat saat diberi makan
  /* Backup (Doc 09 §4) — SettingsSheet → system */
  "ui/backup-export": undefined;
  "ui/backup-import": { code: string };
  /* Pengaturan lengkap (M5 — Doc 12 §3.2) — SettingsSheet → system */
  "ui/settings": { music?: boolean; sfx?: boolean; notify?: boolean; offlineLlm?: boolean };
  /* SFX dari scene (M5) — scene minta system memainkan efek (satu gerbang audio) */
  "sfx/play": { id: string };
  /* Companion & dialog kontekstual (M6 — Doc 08, Doc 12 §8) */
  "ui/chat-open": undefined; // ActionBar 💬 → layar Chat
  "ui/chat-close": undefined; // tutup layar Chat
  "ui/chat-send": { text: string }; // kirim pesan pemain → provider (Doc 11 §2)
  "pet/reaction": { emoji: string }; // reaksi emoji non-verbal di atas pet (Doc 08 §1)
  /* Onboarding (Doc 04) — Splash/Onboarding → system */
  "ui/continue": undefined;
  "ui/new-game": { name: string; element: "fire" | "water" | "wind" | "earth" };
  "ui/tutorial-dismiss": undefined;
  /* Debug panel dev-only (Doc 03 §6) */
  "debug/speed": { multiplier: 1 | 10 | 60 | 3600 };
  "debug/set-phase": { phase: "morning" | "day" | "evening" | "night" };
  "debug/skip-day": undefined;
  /* Breeding & keturunan (M7 — Doc 07, Doc 12 §9) */
  "ui/breeding-open": undefined; // pintu Breeding House / ActionBar → layar Breeding
  "ui/breeding-close": undefined;
  "ui/breeding-start": { partnerId: string }; // pilih mitra NPC → telur keturunan
  "ui/breeding-continue": undefined; // tutup layar hasil breeding
  "ui/album-open": undefined; // ActionBar 📖 → Album (pet + telur + silsilah)
  "ui/album-close": undefined;
  "ui/legacy-continue": undefined; // memorial: telur keturunan menetas → garis baru
}
