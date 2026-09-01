# DOC 09 — Arsitektur, Modul & Save System 🏗️

> Sumber desain: GDD §10. Kerangka teknis yang mengikat semua doc.

## 1. Struktur Folder — Monorepo (FINAL) 🔒

Prinsip **ports & adapters**: logika game (`packages/core`) **tidak tahu** platform apa pun — renderer, storage, audio, LLM semua berupa adapter yang bisa ditukar. Satu kode → web (PWA) & native (Capacitor).

```
hagumi/
├─ pnpm-workspace.yaml
├─ packages/
│  ├─ core/                # ⭐ LOGIKA MURNI TypeScript — ZERO dependency platform
│  │  ├─ pet/              #   stats, state-machine, evolution, care-score
│  │  ├─ time/             #   tick, offline-catchup, day-phase, season
│  │  ├─ breeding/         #   genetics, lineage, legacy
│  │  ├─ economy/          #   koin, item, streak
│  │  ├─ companion/        #   dialogue-engine, memory, personality-card
│  │  ├─ save/             #   skema save + migrasi (tanpa localStorage!)
│  │  └─ ports.ts          #   IStorage · IClock · IRng · IAudio · INotifier · ILlmProvider
│  ├─ data/                # JSON balance + validasi skema (Zod):
│  │  └─ items.json · decay.json · evolution.json · seasons.json · dialog_*.json
│  ├─ llm/                 # ADAPTER provider AI (Doc 11):
│  │  └─ provider-openai.ts · provider-gemini.ts · provider-ollama.ts · provider-offline.ts
│  ├─ ui/                  # komponen DOM shared: washi panel, hanko button, stat bar, modal
│  └─ assets/              # sprites (pipeline recolor elemen) · audio
├─ apps/
│  ├─ web/                 # Vite + Phaser 3 + PWA — host adapter & scene (Doc 02)
│  │  └─ src/scenes/       # 12 scene Phaser (tipis: panggil core, render)
│  └─ native/              # shell Capacitor (APK/IPA) — HANYA config, tanpa logika
├─ services/
│  └─ supabase/            # backend tipis: edge function proxy LLM + (nanti) breeding online
├─ tools/                  # script dev: recolor-palettes · simulate-90-days · balance-report
└─ docs/                   # dokumentasi ini
```

**Aturan perbatasan (wajib):**
- `packages/core` DILARANG import dari `apps/*`, `packages/llm`, DOM API, atau Phaser — hanya tahu kontrak di `ports.ts`.
- `apps/web` = adapter tipis: parse input → panggil core → render. Tidak ada logika game di sini.
- `apps/native` = shell Capacitor saja (config + plugin notifikasi/storage) — satu kode sumber untuk web & native.
- Workspaces (pnpm): tiap paket punya `package.json`, `tsconfig`, dan test sendiri.

## 2. Bahasa, Tooling & Aturan Arsitektur

1. Bahasa: **TypeScript strict** — tangkap bug tipe sebelum mengorbankan save pemain.
2. Rendering: **Phaser 3**; teks/menu = DOM overlay dari `packages/ui` (font pixel tetap tajam).
3. **One-way data:** UI → `EventBus` → system (core) → state → render. UI tidak pernah mengubah stat langsung.
4. Semua angka balance dari `packages/data/*.json` (divalidasi skema saat load).
5. `PetStats.applyDecay(hours, phase, sleeping)` = fungsi murni terhadap input waktu → headless-testable tanpa browser.
6. Autosave pada: setiap aksi, setiap pindah scene, `visibilitychange`/`beforeunload` (implementasi `IStorage` di adapter — web: localStorage; native: SecureStorage/Preferences).
7. Backend **Supabase** (MVP): auth ringan + edge function proxy LLM (Doc 11) + sinkronisasi save opsional; nanti dipakai breeding antar-pemain.

## 3. Skema Save (localStorage key: `hagumi_save_v1`)

```json
{
  "version": 1,
  "lastTick": 1735700000000,
  "player": { "coins": 240, "loginStreak": { "count": 3, "lastDay": "2026-08-31" } },
  "pet": {
    "name": "Kogitsune", "element": "fire",
    "birthAt": 1730000000000,
    "stage": "adult", "state": "idle",
    "stats": { "hunger": 72, "happiness": 88, "energy": 40, "hygiene": 65, "health": 90 },
    "careScore": 78, "tails": 4, "path": "zenko",
    "sickSince": null, "lastPoopAt": 1735698000000,
    "memoryLog": [ { "t": 0, "key": "evolved", "detail": "..." } ]
  },
  "inventory": { "food": {}, "medicine": {}, "owned": [], "placedDecor": [] },
  "breeding": { "childrenCount": 1, "cooldownUntil": 0, "lineage": {} },
  "settings": { "sound": true, "notify": true }
}
```

## 4. SaveSystem (aturan versi & backup)

- `version` + fungsi `migrate(old)` untuk tiap perubahan skema (wajib — game hidup 90 hari, update jalan terus).
- **Backup manual:** layar Pengaturan → "Ekspor Kode Simpanan" (base64 dari JSON) / "Impor" — pertahanan utama pemain.
- Autosave debounced 500 ms; tulis atomik (tulis tmp → rename) untuk hindari save korup.
- Anti-corup: validasi skema saat load; gagal → tawarkan impor backup, JANGAN overwrite otomatis.

## 5. Data-Driven Config (wajib)

| File | Isi |
|---|---|
| `decay.json` | decay/jam per stat per fase (Doc 01 §2) |
| `items.json` | katalog Doc 06 |
| `evolution.json` | ambang Care Score, tahap, ekor (Doc 01 §3–4) |
| `seasons.json` | tanggal, makanan, event (Doc 03 §4–5) |
| `dialog_*.json` | baris dialog per elemen (Doc 08) |

## 6. Acceptance Criteria

- [ ] Modul terpisah sesuai §1; tidak ada import melingkar.
- [ ] Save v1 valid; migrasi contoh v1→v2 lulus test.
- [ ] Matikan tab di tengah aksi → buka lagi: tidak ada state setengah jadi.
- [ ] Semua angka balance diubah lewat JSON tanpa menyentuh kode.
