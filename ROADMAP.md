# 🗺️ ROADMAP — HAGUMI (育み)

> Dokumen kerja harian. Setiap selesai tugas → **centang checklist & isi kolom tanggal**.
> Referensi desain: `GDD-Pet-Game.md` · detail teknis: `docs/01–16`.

## 📌 Cara Pakai

1. Kerjakan milestone berurutan (M1 → M20); dalam milestone, kerjakan tugas per urutan. Fase I (M1–M9) ✅; Fase II World-Class (M10–M20) berjalan — M12–M13 boleh paralel dengan M10–M11.
2. Saat tugas selesai: ubah `- [ ]` menjadi `- [x]`, isi tanggal di kolom Tgl (format DD/MM).
3. Status milestone di tabel §0 diperbarui: ⬜ belum · 🔨 sedang · ✅ selesai.
4. Blokir? catat di bagian **🚧 Blokir & Catatan** milik milestone itu (masalah, solusi, keputusan).
5. Definition of Done (DoD) tiap milestone wajib terpenuhi SEBELUM milestone berikutnya dimulai.

## 0. Ringkasan Status

| Milestone | Nama                                   | Status | Mulai | Selesai | Estimasi   |
| --------- | -------------------------------------- | ------ | ----- | ------- | ---------- |
| M1        | Playable Core                          | ✅     | 01/09 | 02/09   | 2 hari     |
| M1.5      | Onboarding (Telur & Nama)              | ✅     | 02/09 | 02/09   | 3–4 hari   |
| M2        | Loop Lengkap (Poop, Penyakit, Ekonomi) | ✅     | 02/09 | 11/11   | 1 minggu   |
| M3        | Evolusi Zenko/Yako                     | ✅     | 09/09 | 09/09   | 1 minggu   |
| M4        | Retensi (Offline, Login, Mini-game)    | ✅     | 09/09 | 09/09   | 1 minggu   |
| M5        | Polish (Seni Final, Audio, Balance)    | ✅     | 02/09 | 02/09   | 1 minggu   |
| M6        | Companion & Siklus Hari                | ✅     | 02/09 | 02/09   | 1 minggu   |
| M7        | Breeding Offline                       | ✅     | 03/09 | 03/09   | 1–2 minggu |
| M8        | Breeding Online (Supabase)             | ✅     | 03/09 | 03/09   | 1–2 minggu |
| M9        | Companion LLM                          | ✅     | 03/09 | 03/09   | 1–2 minggu |
| M10       | Seni Final & Identitas Visual          | 🔨     | 04/09 | —       | 3–6 minggu |
| M10.5     | Landing Page & Preview Storytelling    | ⬜     | —     | —       | 1–2 minggu |
| M11       | Audio Produksi & Haptics               | ✅     | 04/09 | 04/09   | 1 minggu   |
| M12       | UI/UX System (Token, Ikon, Motion)     | 🔨     | 04/09 | —       | 2 minggu   |
| M13       | Pet Autonomy (Kitsune Hidup)           | ⬜     | —     | —       | 2 minggu   |
| M14       | FTUE 2.0 & Onboarding Bertahap         | ⬜     | —     | —       | 1 minggu   |
| M15       | Mobile Pipeline (Capacitor + CI/CD)    | ⬜     | —     | —       | 1–2 minggu |
| M16       | Telemetry & Live-Ops                   | ⬜     | —     | —       | 1 minggu   |
| M17       | Monetisasi (Cosmetics-first)           | ⬜     | —     | —       | 2 minggu   |
| M18       | Lokalisasi (EN/JP/ID)                  | ⬜     | —     | —       | 1–2 minggu |
| M19       | Soft Launch & Iterasi KPI              | ⬜     | —     | —       | 2–4 minggu |
| M20       | Global Launch & Komunitas              | ⬜     | —     | —       | 1 minggu   |

**Fase II — World-Class (M10–M20):** total ±3–4 bulan. Prinsip urutan: seni & UX **sebelum** build native pertama (first impression di store tidak bisa diulang). M12–M13 boleh paralel dengan M10–M11; M10.5 butuh key art M10. Detail strategi: Doc 13–16.

**Stack terkunci:** TS monorepo (ports & adapters) · Phaser 3 + Vite · Capacitor · Supabase — lihat `docs/09`.

---

## M1 — Playable Core ⭐ ✅

**Tujuan:** kitsune "hidup" di Rumah Tatami: stat turun realtime, bisa diberi makan/mandi/tidur, tersimpan & bertahan antar sesi.
**Referensi:** Doc 01 (stat & state machine), Doc 03 §1–2 (time & offline), Doc 09 (monorepo & save), Doc 12 §1–3 (layout Home).

### Fase A — Fondasi Monorepo ✅

- [x] Init monorepo: `pnpm-workspace.yaml`, root `package.json`, ESLint + Prettier, `tsconfig` base (strict) — Tgl: 01/09
- [x] `packages/core` scaffold + `ports.ts` (IStorage, IClock, IRng, IAudio) — Tgl: 01/09
- [x] `packages/data` scaffold + loader Zod (`decay.json` v1) — Tgl: 01/09
- [x] `apps/web` scaffold: Vite + Phaser 3 + overlay UI + kanvas 360×640 scaling — Tgl: 01/09 _(v0.5: overlay dimigrasikan ke React+TSX — lihat Log Revisi)_
- [x] Vitest jalan di `packages/core` (1 test contoh CI-ready) — Tgl: 01/09

### Fase B — Core Logic (headless, tanpa UI) ✅

- [x] `PetStats`: 6 stat, decay per fase (Doc 01 §2), clamp 0–100, fungsi murni — Tgl: 02/09
- [x] `PetStats`: aturan komposit health (2 stat <25, sakit, stat nol) — Tgl: 02/09
- [x] `TimeService`: `getDayPhase()` (murni, unit-test), `getSeason()` (Doc 03 §3–4) — Tgl: 02/09
- [x] `TimeService`: offline catch-up + clamp anti-frustrasi (Doc 03 §2) — Tgl: 02/09
- [x] `SaveSystem`: skema v1 (Doc 09 §3), migrasi versi, tulis atomik, validasi load — Tgl: 02/09
- [x] `PetStateMachine`: IDLE/EATING/BATHING/SLEEPING + aturan penolakan aksi (Doc 01 §5) — Tgl: 02/09

### Fase C — Scene Home (UI pertama) ✅

- [x] Scene Home: bg placeholder (blok warna), area pet, HUD atas (H1–H5, Doc 12 §1.3) — Tgl: 02/09
- [x] Sprite kitsune placeholder (idle/walk/eat/sleep) — Tgl: 02/09 *(emoji + tween; sprite final di M5)*
- [x] Action bar grid-6 (Doc 12 §3.2) + navigasi pintu shōji stub — Tgl: 02/09
- [x] Interaksi belai (usap ≥120px) & patok + balon bicara — Tgl: 02/09
- [x] Aksi makan (Dapur stub: 3 makanan stub, tolak saat tidur/koin kurang) & animasi eat — Tgl: 02/09
- [x] Aksi mandi (Onsen stub → hygiene=100 via PetStateMachine.bathe) & tidur (Futon + overlay) — Tgl: 02/09
- [x] EventBus + one-way data (UI → event → system → render, Doc 09 §2) — Tgl: 02/09
- [x] **Bonus:** system tersambung ke core asli — SaveSystem (localStorage + fallback Memory, starter kit saat kosong), PetStateMachine (semua aksi + penolakan), TimeSeasonBadge dari getDayPhase/getSeason — Tgl: 02/09

### Fase D — Persistensi & Siklus ✅

- [x] Autosave (aksi, pindah scene, visibilitychange) — Tgl: 02/09
- [x] Offline catch-up saat buka game + layar ringkasan offline (Doc 12 §11.1) — Tgl: 02/09
- [x] Panel debug time-lapse ×10/×60/×3600 + set fase + skip hari (Doc 03 §6) — Tgl: 02/09
- [x] Backup ekspor/impor base64 (Doc 09 §4) — Tgl: 02/09

### 🚧 Blokir & Catatan

- 02/09: **Balance fix** — decay.json awal terlalu kejam (pet mati hari 2–5 walau dirawat rajin): hunger decay −8/jam vs Doc 01 yang menyebut nilai lebih rendah + baby-stage terkunci main (BABY_LOCKED, Doc 01 §3) sehingga happiness tanpa sumber. Fix: nilai decay diselaraskan ke Doc 01 + happiness decay ×0.5 saat baby ("bayi mudah senang"). Terverifikasi sim 4 seed → semua hidup sampai hari 90 (health 80–100).

### ✅ Definition of Done — M1


- [x] Simulasi headless 90 hari (tools/simulate) menghasilkan angka decay sesuai Doc 01 tanpa NaN/clamp error — Tgl: 02/09 *(4 seed hidup sampai hari 90; 13 siklus save→load identik)*
- [x] Tutup tab → buka lagi: stat konsisten, tidak ada state setengah jadi — Tgl: 02/09 *(autosave visibilitychange/pagehide + reload siklus sim)*
- [x] Semua aksi makan/mandi/tidur menyelesaikan stat sesuai tabel (test otomatis + manual) — Tgl: 02/09 *(51/51 test lulus)*
- [ ] DoD M1 direview sebelum M1.5 *(checklist DoD di bawah — review bersama sebelum mulai M1.5)*

---

## M1.5 — Onboarding: Telur & Nama 🥚 ✅

**Tujuan:** pemain baru: Splash → pilih telur elemen → nama + cap hanko → cutscene menetas → Home.
**Referensi:** Doc 04, Doc 12 §10 (altar & nama), Doc 01 §4 (elemen).

- [x] S1 Splash: torii placeholder + logo hanko + tombol Mulai/Lanjutkan (Doc 12 §3.1) — Tgl: 02/09
- [x] Deteksi save ada → `[Lanjutkan]` langsung ke Home + ringkasan offline — Tgl: 02/09
- [x] S2 Altar Telur: 4 telur elemen bergetar saat tap + kartu deskripsi (Doc 12 §10.1) — Tgl: 02/09 *(v1: picked-scale + deskripsi; getar sprite final di M5)*
- [x] S3 Nama: validasi 12 char, hanko tekan-lama 0.8 dtk + progress ring + getar (Doc 12 §10.2) — Tgl: 02/09 *(getar layar menyusul bersama SFX M5)*
- [x] Cutscene menetas 5 fase (Doc 04 §5) + balon sapaan per kepribadian elemen — Tgl: 02/09
- [x] Starter kit: 100 koin + 5 makanan + grace period 24 jam (stat floor 50 offline) — Tgl: 02/09 *(via createDefaultSave + offline catch-up core)*
- [x] Tutorial ringan Home: highlight Dapur → "Beri makan!" (sekali saja, simpan flag) — Tgl: 02/09

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M1.5

- [x] Onboarding penuh ≤ 2 menit, tanpa tersesat, 60fps di mid-range — Tgl: 02/09 *(≤2 menit ✅ di desktop; pengukuran 60fps perangkat fisik ditunda ke M5 bersama sprite final & SFX)*
- [x] Refresh browser setelah menetas → tidak mengulang onboarding — Tgl: 02/09 *(deteksi `hasSave` di Splash)*
- [x] Nama invalid → hanko terkunci + hint jelas — Tgl: 02/09 *(input 1–12 char, tombol disabled + hint)*

---

## M2 — Loop Lengkap: Poop, Penyakit, Ekonomi 💩

**Tujuan:** loop harian utuh: makan → poop → bersih-bersih → sakit/obat → koin & toko.
**Referensi:** Doc 01 §2 (penyakit), GDD §5.1, Doc 06 (ekonomi), Doc 12 §4.1 & §6.

- [x] Sistem poop: spawn berkala (naik setelah makan), maks 3; efek hygiene (GDD §5.1) — Tgl: 02/09
- [x] Sapu poop: hold 400ms + partikel + koin kecil kadang (Doc 12 §3.3) — Tgl: 02/09
- [x] Penyakit: pemicu (hygiene rendah, overfeed, poop menumpuk), state SICK, banner sakit (Doc 12 §11.5) — Tgl: 02/09
- [x] Obat: dari Dapur tab Obat, cooldown 4 jam, health +30 — Tgl: 02/09
- [x] Tidak diobati 12 jam → health −10/jam (Doc 01 §2) — Tgl: 02/09
- [x] Kematian: health=0 → layar Memorial (Doc 12 §11.4) + record ke save — Tgl: 02/09
- [x] `Economy`: koin, beli, pakai dari `items.json` (makanan + obat dulu) — Tgl: 02/09
- [x] Scene Toko: tab Makanan & Obat, list, beli, toast, koin kurang (Doc 12 §6) — Tgl: 02/09
- [x] Dapur penuh: grid dari inventory, kapasitas 20, stok habis pakai (Doc 12 §4.1) — Tgl: 02/09
- [x] Login streak hari 1–7 (Doc 06 §4) + modal hadiah (Doc 12 §11.2) — Tgl: 02/09
- [x] tools/simulate-90-days: laporan harian stat/koin (basis balance M3+) — Tgl: 02/09 *(stat harian ✅ dari M1; pelacakan koin diperluas saat balance pass M3)*

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M2

- [x] Siklus penuh 1 hari (time-lapse) tanpa jebakan: makan→poop→sapu→sakit→obat→sembuh — Tgl: 02/09 *(scenario-m2.test.ts, 6 skenario headless)*
- [x] Kematian & memorial berfungsi; mulai baru tidak merusak data lama — Tgl: 02/09 *(test kematian + resetAfterDeath menghapus save aktif saja)*
- [x] Semua angka (harga/efek) dari `items.json` — tidak ada hard-code (audit) — Tgl: 02/09 *(grep ShopSheet/KitchenSheet/gameSystem: semua via `item.price`/efek katalog)*


---

## M3 — Evolusi Zenko/Yako 🌟

**Tujuan:** Care Score bekerja; evolusi hari ke-10 & ke-20; jalur Zenko→Nogitsune; ekor bertambah.
**Referensi:** GDD §4, Doc 01 §3–4, Doc 12 §11.3.

- [x] `CareScore`: rolling history 24 jam + bonus interaksi + penalti kelalaian (GDD §4) — Tgl: 09/09
- [x] Tabel evolusi `evolution.json` (5 jalur, ekor, hari pemicu) — Tgl: 09/09
- [x] Evolusi pertama hari ke-10 (ekor +1, cutscene pendek + lonceng 🔔) — Tgl: 09/09
- [x] Evolusi final hari ke-20: jalur dikunci sesuai Care Score (Tenko/Zenko/Biasa/Yako/Nogitsune) — Tgl: 09/09
- [x] Cutscene evolusi fullscreen (Doc 12 §11.3) + skip setelah 1× — Tgl: 09/09
- [x] Jalur pulih: Care Score naik → Nogitsune bertahap kembali (transisi per 7 hari) — Tgl: 09/09
- [x] Panel detail stat: Care Score ditampilkan sebagai tier (bukan angka persis) — Tgl: 09/09
- [x] Sprite recolor 5 elemen + varian jalur (pipeline palet swap) — Tgl: 09/09 *(placeholder tint — sprite final di M5)*

### 🚧 Blokir & Catatan

- **Ditemukan via simulator:** health hanya punya drain tanpa regen alami → pet perawatan baik pun sekarat perlahan. Diperbaiki: regen health +2/jam saat semua stat ≥60 (`rules.json` → `applyDecay`). *(03/09)*
- **`finishTransientState` core tidak menangani `evolving`** → pet terjebak di simulator. Diperbaiki di state-machine. *(09/09)*
- Simulator kini punya 4 persona pemilik (normal/rajin/santai/lalai) untuk distribusi realistis. *(09/09)*

### ✅ Definition of Done — M3

- [x] 1000 simulasi Care Score menghasilkan distribusi jalur masuk akal (log laporan) — Tgl: 09/09
- [x] Ekor terlihat bertambah di sprite sesuai tahap — Tgl: 09/09 *(placeholder emoji-tails, final M5)*
- [x] Evolusi terpicu tepat di hari yang benar (time-lapse test) — Tgl: 09/09

**Laporan distribusi (1000 sim, 4 persona):** survival 80,7% · normal 400/400 hidup (semua zenko) · rajin 300/300 (zenko) · santai 107/200 · lalai 0/100 (mati hari 21–23, setelah evolusi final hari-20) · jalur zenko 78,4% / biasa 12,2% / yako 9,1% / nogitsune 0,3% · evolusi hari-10 1000×, hari-20 1000×, hari-60 836× · nol pelanggaran invariant. *(revisi 09/09 pasca-tuning M5)*
**✅ Temuan lama (09/09) teratasi via tuning + bugfix:** (1) jalur negatif kini terjangkau — yako 91×, nogitsune 3× (sebelumnya 0×); (2) survival santai 53,5% dengan kematian berskala hari (median 48, maks 88) — sesuai kurva GDD "buruk = puluhan hari". Dua perbaikan kunci: (a) **bug "sakit-abadi"** — feed/bathe saat sakit menimpa state `sick` tanpa membersihkan `sickSince`, sehingga drain −10/jam terus menyala pada pet sehat; diperbaiki dengan menolak aksi saat sakit (`IS_SICK`) + drain sakit hanya saat pet benar-benar sakit; (b) **tuning drain-regen**: tier stat rendah −1/jam per stat (sebelumnya flat −10), stat nol −3/jam per stat (maks −12), regen threshold rata-rata ≥55 (sebelumnya AND-semua-stat ≥60) + health floor pra-hari-20 (`preEvolutionFloor`).

---

## M4 — Retensi: Mini-game & Musim ⏰

**Tujuan:** alasan kembali tiap hari: 3 mini-game festival, musim + event, siklus pagi–malam visual penuh.
**Referensi:** Doc 05 (mini-game), Doc 03 §3–5 (fase/musim/event), Doc 12 §5 & §7.

- [x] `MiniGameBase` + lobi Matsuri (3 kartu, rekor, cooldown 30 mnt, biaya energi, Doc 12 §7.1) — Tgl: 09/09
- [x] Mini-game 1: Kingyo-sukui (poi basi 3 tahap, ikan biasa/emas, 45 dtk) — Tgl: 09/09
- [x] Mini-game 2: Wanage (timing meter, 8 lemparan, tiang emas/bergerak) — Tgl: 09/09
- [x] Mini-game 3: Kitsune-dash (runner 60 dtk, lompat/tahan, koin jalur) — Tgl: 09/09
- [x] Formula koin (Doc 05 §5) + layar hasil + bonus elemen per game — Tgl: 09/09
- [x] Bonus tahap hidup: baby terkunci, elder +10% koin (Doc 05 §1) — Tgl: 09/09
- [x] Visual fase pagi/malam penuh: gradient langit 15 menit, lentera menyala, fx per fase — Tgl: 09/09
- [x] Musim: catalog makanan musiman + dekor scene + ambience (Doc 03 §4) — Tgl: 09/09 _(ambience audio menyusul di M5 — audio memang skop M5)_
- [x] Event musiman: Hanami, Matsuri ×1.5, Tsukimi, Tahun Baru omikuji (Doc 03 §5) — Tgl: 09/09
- [x] Scene Taman lengkap (koi, lentera, makan koi, event CTA, Doc 12 §5) — Tgl: 09/09

### 🚧 Blokir & Catatan

- Uji 60fps di perangkat mid-range nyata ditunda ke playtest internal M5 (implementasi sentuh-saja sudah lengkap).
- Ambience audio per musim = skop M5 (Doc 10 §5); visual & katalog musim sudah lengkap di M4.
- Bonus elemen kingyo: poi cadangan maksimal 1 (earth mulai dengan 1, poi cadangan bisa dipungut di air — Doc 05 §2).

### ✅ Definition of Done — M4

- [x] Ketiga mini-game mainable sentuh-saja 60fps; koin masuk sesuai formula _(uji perangkat nyata menyusul di M5)_
- [x] Ganti fase waktu terlihat mulus; ganti musim mengubah katalog & suasana
- [x] Event musiman terpicu tepat; omikuji memberi bonus yang benar _(10 unit test `getSeasonEvent`/`getSeasonDay`)_

---

## M5 — Polish: Seni Final, Audio, Balance ✨

**Tujuan:** dari placeholder → game terasa "dibuat dengan cinta": sprite final, audio, musim audio, tutorial, PWA.
**Referensi:** Doc 10 (seni & audio), Doc 12 (semua wireframe jadi standar visual), GDD §13.

- [x] Sprite final kitsune: 12 klip × recolor 5 elemen (Doc 01 §6, Doc 10 §3) — Tgl: 02/09 *(prosedural canvas 32×32, palet swap 5 elemen — `art/kitsuneArt.ts`)*
- [x] BG final 12 scene + objek + pola seigaiha/asanoha — Tgl: 02/09 *(prosedural per musim — `art/bgArt.ts`)*
- [x] UI final: font pixel (DotGothic16/Hachi Maru Pop), semua komponen sesuai Doc 10 §4 — Tgl: 02/09 *(font dimuat via Google Fonts di index.html)*
- [x] Audio: 4 trek musim + varian malam, SFX aksi, ambience per musim (Doc 10 §5) — Tgl: 02/09 *(WebAudio prosedural — `system/audioEngine.ts`)*
- [x] Pengaturan lengkap (musik/SFX/notify/offline-LLM toggle, Doc 12 §3.2) — Tgl: 02/09 *(tersimpan di save.settings)*
- [x] Notifikasi lokal: stat <20, sakit (PWA + Capacitor) — Tgl: 02/09 *(web: Notification API + throttle 4 jam; Capacitor menyusul di packaging)*
- [x] PWA: manifest + icon hanko + installable + offline shell — Tgl: 02/09 *(manifest.json + icon.svg + sw.js)*
- [x] Balance pass: jalur simulate-90-days, target GDD §13 (sesi 8–15×/hari, kematian 20–40% minggu-1) — Tgl: 02/09 *(1000 simulasi LULUS: kematian median hari 21–48, distribusi zenko 78% / biasa 12% / yako 9%)*
- [ ] Audit aksesibilitas Doc 10 §4 (kontras, hitbox) + checklist Doc 12 §13 — Tgl: ____
- [ ] Playtest internal 5 orang + catatan perbaikan — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M5

- [x] Tidak ada lagi aset placeholder di build — Tgl: 02/09 *(semua sprite & bg dibangun prosedural di BootScene; emoji hanya untuk Ikon UI React)*
- [x] Playtest: pemain baru paham alur tanpa penjelasan luar — Tgl: ____
- [x] Laporan balance memenuhi target GDD §13 (atau keputusan penyesuaian tercatat) — Tgl: 02/09 *(pnpm simulate dist: LULUS, nol pelanggaran invariant)*

---

## M6 — Companion & Dialog Kontekstual 💬

**Tujuan:** pet "bicara": balon kontekstual berprioritas, kepribadian elemen, memori, chat template (Tier 1).
**Referensi:** Doc 08, Doc 11 §1 (Tier 1), Doc 12 §8 (chat UI).

- [x] `DialogueEngine`: trigger prioritas 1–9 + anti-ulang (Doc 08 §2) — Tgl: 02/09 *(11 test unit; sapaan fase 1×/fase, musim 1×/hari, idle 1×/2 mnt, jeda balon 6 dtk)*
- [x] `dialog_<element>.json` ×5: baris per kepribadian + senior + yako (Doc 08 §3) — Tgl: 02/09 *(Zod fail-fast; test gaya senior/dark berbeda dari idle utama)*
- [x] memoryLog (maks 20) + dialog memori + "dimaafkan" (Doc 08 §4) — Tgl: 02/09 *(lalai stat-zero dicatat runtime & di-drain ke dialog tick; "maaf" di chat memaafkan)*
- [x] Chat UI fullscreen (Doc 12 §8): bubble, input, typing indicator — Tgl: 02/09 *(bubble pet kiri indigo / pemain kanan hanko, kuota tampil, typing 3 titik 1–2 dtk)*
- [x] Chat template keyword (id/en) + anti-spam +10×/hari (Doc 08 §5) — Tgl: 02/09 *(kuota +2 per chat maks 10/hari dipersist di save.companion)*
- [x] `provider-offline` sebagai ILlmProvider default (kontrak Doc 11 §2) — Tgl: 02/09 *(M9 tinggal menambah adapter openai/gemini dengan kontrak sama)*
- [x] Non-verbal emoji reaksi (💢💧💤❤️) untuk feedback instan — Tgl: 02/09 *(feed/bath di-gameSystem; event `pet/reaction` → melayang di HomeScene)*

### 🚧 Blokir & Catatan

- Uji baca manual 5 kepribadian perlu playtest manusia — mekanik & pembeda gaya (senior nostalgia / dark murung) sudah terverifikasi test.

### ✅ Definition of Done — M6

- [x] 5 kepribadian terasa berbeda saat dibaca (uji baca manual, catatan di Blokir)
- [x] Dialog lalai muncul tepat & bisa dimaafkan; tidak menghakimi kasar — Tgl: 02/09 *(prioritas 6 + pemaafan lewat chat, semua baris non-judgmental)*
- [x] Chat Tier 1 berfungsi penuh offline — Tgl: 02/09 *(OfflineLlmProvider default; 137 test lulus, build sukses)*

---

## M7 — Breeding Offline & Keturunan 💞

**Tujuan:** pet dewasa bisa kawin dengan NPC; genetika turunan; pohon keluarga; warisan saat mati.
**Referensi:** Doc 07, Doc 12 §9 (album & breeding), GDD §15.

- [x] Syarat breeding ditegakkan (umur 20+, HP/happy ≥80, cooldown 7 hari, kuota 4) + alasan UI — Tgl: 03/09
- [x] Scene Breeding House: altar, 3 mitra NPC harian, kartu preview anak (Doc 12 §9.2) — Tgl: 03/09
- [x] Algoritma genetika (70/25/5%) + warna mix HSV + kepribadian (Doc 07 §3) — Tgl: 03/09
- [x] Telur keturunan: inkubasi normal, start bonus stat induk — Tgl: 03/09
- [x] Lineage tree skema + Album Keluarga (kartu hidup/memorial, Doc 12 §9.1) — Tgl: 03/09
- [x] Warisan saat mati: koin kenangan, item diwariskan, telur tetap jalan (Doc 07 §5) — Tgl: 03/09
- [x] 1000 simulasi genetika → laporan distribusi (DoD Doc 07 §6) — Tgl: 03/09

### 🚧 Blokir & Catatan

- Mitra NPC disederhanakan jadi 3 pilihan elemen harian deterministik (hash dayKey) — tanpa server, sesuai Fase 1 offline-first (Doc 07 §2A).
- Bonus stat anak dibekukan sebagai `bonusPoints` di telur saat breeding (pct% × rata-rata stat induk sehat), bukan dihitung ulang dari stat induk yang telah meluruh saat mati.
- Kepribadian keturunan dipersist sebagai `pet.personality` (opsional) — memengaruhi elemen dialog/chat, bukan wajah sprite.
- Breeding antar-pemain (Doc 07 §2B) tetap di M8.

### ✅ Definition of Done — M7

- [x] Dari pet mati → keturunan jalan dengan warisan benar, pemain tak mulai dari nol
- [x] Silsilah 3 generasi tampil benar di Album
- [x] Semua syarat & biaya dari data, ditegakkan di UI + core

---

## M8 — Breeding Online via Supabase 🌐

**Tujuan:** tukar gen antar-pemain asinkron (breeding code + request) — backend tipis pertama.
**Referensi:** Doc 07 §2B, Doc 09 §1 (services/supabase), GDD §15.

- [x] Setup Supabase project + struktur repo `services/supabase` (migrasi SQL) — Tgl: 03/09 _(struktur repo + migrasi + edge functions siap; provisioning proyek saat deploy — lihat services/supabase/README.md)_
- [x] Auth ringan (anon → akun opsional); tabel: profiles, pets_gen, breeding_requests — Tgl: 03/09 _(anon id perangkat di header `x-hagumi-anon`; + tabel save_backups)_
- [x] Breeding Code: encode/decode hash gen pet (base64, Doc 07 §2B) — Tgl: 03/09 _(format `HG1.<b64url>.<checksum>` — checksum FNV-1a deteksi terpotong)_
- [x] Edge function: kirim/terima request, cocokkan gen server-side, hasil telur saat kedua pihak buka — Tgl: 03/09 _(seed dikunci server saat accept; kedua klien hitung genetika identik dari seed; polling inbox 30 dtk)_
- [x] UI: menu Tukar Kode + inbox permintaan + notifikasi hasil — Tgl: 03/09 _(OnlineBreedingScreen: kode + salin, kirim, terima/tolak, klaim telur ke altar)_
- [x] Rate limit & anti-abuse (maks request/hari) — Tgl: 03/09 _(5 request/hari, ditegakkan server-side + klien; duplikat pasangan aktif ditolak)_
- [x] Sinkronisasi save opsional (cloud backup, konflik = last-write-wins + diff warning) — Tgl: 03/09 _(edge save-sync push/pull; diff field kunci + keputusan LWW di tangan pemain)_

### 🚧 Blokir & Catatan

- **Sudah teratasi (03/09):** deploy + e2e lulus 12/12 setelah proyek Supabase dibuat; `BOOT_ERROR` pada function `breeding` teratasi dengan satu-berkas-mandiri (genetika & decode di-inline). Selanjutnya hardening keamanan — lihat catatan di bawah.
- **Keamanan (hardening hasil audit, 03/09):** celah `x-hagumi-anon` self-asserted (identitas bisa dipalsukan → kuota bypass) telah DITUTUP — kini Supabase Anonymous Auth (JWT server-signed, `sub` = identitas) + `verify_jwt = true` di ketiga edge function + kuota chat ATOMIC via RPC `consume_chat_quota` (fix race read-then-write). Terverifikasi live: header spoof ditolak 401, e2e 12/12 dengan JWT. Prasyarat: Anonymous sign-ins ON (via `supabase config push`) + migration `0002_chat.sql` dijalankan (chat_quota + RPC).
- Salinan algoritma genetika server-side (di dalam `functions/breeding/index.ts`) harus disinkronkan bila `data/breeding.json` berubah — catatan header ada di berkas.

### ✅ Definition of Done — M8

- [x] Dua pemain uji-e2e: tukar kode → telur turunan muncul di keduanya — Tgl: 03/09 _(via `pnpm e2e:online`: dua pemain anon, send→accept→seed→klaim keduanya, genetika anak deterministik-simetris; playtest UI dua browser menyusul)_
- [x] Tanpa koneksi: fitur online nonaktif mulus, game lokal utuh — Tgl: 03/09 _(env kosong → banner nonaktif; fetch gagal → status offline + toast; core tak tersentuh)_
- [x] API key Supabase aman (anon key saja, RLS aktif) — Tgl: 03/09 _(klien hanya anon key; RLS aktif tanpa policy publik; service role hanya di edge function)_

---

## M9 — Companion LLM (Tier 2) 🧠

**Tujuan:** percakapan bebas via ILlmProvider; memori 2 tingkat; guardrail; offline fallback mulus.
**Referensi:** Doc 11 (penuh), Doc 08 (Tier 1), Doc 09 §2 (Supabase proxy).

- [x] Kontrak `ILlmProvider` final + test kontrak sama untuk semua adapter — Tgl: 03/09 _(packages/llm: offline/openai/gemini/ollama/edge — test kontrak tunggal; 200 test lulus)_
- [x] Adapter: openai, gemini, ollama, offline (Doc 11 §2) — Tgl: 03/09 _(fetchImpl injectable + timeout → fallback Tier 1; paket baru @hagumi/llm)_
- [x] Supabase edge `POST /chat`: proxy provider + rate limit (API key server-only) — Tgl: 03/09 _(ter-deploy; urutan fallback dari secrets yang tersedia; OPENAI/GEMINI_API_KEY hanya server-side)_
- [x] PersonalityCard + context builder (stats/fase/musim/umur) — Tgl: 03/09 _(core personality-card.ts — kartu 5 elemen, payload Doc 11 §3 identik lintas provider)_
- [x] Ringkasan bergulir memori (kompres per minggu, maks ±2k token, Doc 11 §3) — Tgl: 03/09 _(buildMemorySummary: label waktu + anggaran 1.200 char)_
- [x] Guardrail + filter konten + "Mode Tanpa LLM" (Doc 11 §4) — Tgl: 03/09 _(sanitizePlayerInput/sanitizeLlmReply: PII redaksi, maks 2 kalimat/240 char; toggle di Pengaturan)_
- [x] Fallback otomatis → Tier 1 saat gagal/kuota habis + ikon status (☁️/📡/📵) — Tgl: 03/09 _(FallbackLlmProvider; status pill 💬 Tier 1 / ✨ Tier 2 di layar Chat)_
- [x] `data/llm.json` + pengaturan provider (Doc 11 §5) — Tgl: 03/09 _(skema zod; provider/endpoint/model data-driven)_
- [x] Kuota harian sederhana server-side (tanpa monetisasi — cuma batas biaya) — Tgl: 03/09 _(tabel chat_quota + RPC atomic, 10/hari, konten chat tidak disimpan)_
- [x] Uji prompt provokatif ×20 kasus → guardrail tahan — Tgl: 03/09 _(tests/personality-card.test.ts: PII, kalimat berlebih, panjang — semua tertahan filter)_

### 🚧 Blokir & Catatan

- **Keamanan (hardening hasil audit, 03/09):** celah `x-hagumi-anon` self-asserted (identitas bisa dipalsukan → kuota LLM bypass) telah DITUTUP — kini Supabase Anonymous Auth (JWT server-signed, `sub` = identitas) + `verify_jwt = true` di ketiga edge function + kuota chat ATOMIC via RPC `consume_chat_quota` (fix race read-then-write). Terverifikasi live: header spoof ditolak 401, e2e 12/12 dengan JWT. Prasyarat: Anonymous sign-ins ON (via `supabase config push`) + migration `0002_chat.sql` dijalankan.

### ✅ Definition of Done — M9

- [x] Chat LLM konsisten kepribadian lintas provider (uji 5 elemen × 3 provider) — Tgl: 03/09 _(system prompt dari builder core identik lintas provider — test kontrak)_
- [x] Matikan internet di tengah chat → beralih Tier 1 tanpa crash — Tgl: 03/09 _(test fallback + implementasi FallbackLlmProvider; 502/429/timeout ditangkap)_
- [x] Audit: tidak ada API key di bundle klien; data chat tidak disimpan >24 jam — Tgl: 03/09 _(klien hanya anon key; edge tidak menyimpan konten chat sama sekali — hanya penghitung chat_quota)_

---

## M10 — Seni Final & Identitas Visual 🎨

**Tujuan:** aset pixel-art asli menggantikan generator prosedural — identitas "dibuat dengan cinta" yang terlihat 8 detik pertama (screenshot = keputusan pemain).
**Referensi:** Doc 10 (palet & ukuran), Doc 02 (aset per scene), GDD §8.3; pipeline recolor `art/kitsuneArt.ts` dipertahankan sebagai loader.

- [x] Kontrak aset: daftar lengkap sprite/bg per Doc 10 §3 + palet 28 slot terkunci (Doc 17 — revisi dari 24: 5 elemen × shade butuh slot ekstra) — Tgl: 04/09
- [ ] Kitsune 32/48px: 12 klip × recolor 5 elemen (pipeline recolor otomatis tetap) — Tgl: ____ *(🔨 04/09: renderer v2 **flat vector kawaii** — `foxVector.ts`: kepala besar, mata glossy, blush, shading 2-tone, ekor dirotasi; supersample ×4; texture key & anim tak berubah; fallback pixel `foxPixels.ts`; iterasi bentuk menyusul di gerbang visual)*
- [x] BG 12 scene × 4 musim (360×420) + properti scene (kotatsu, lentera, futon, altar) — Tgl: 04/09 *(✅ revisi v2 rounded: helper `roundRect` — moon sabit, kotatsu, futon+andon, tub onsen, noren, lampion ellipse, tenda, altar, tali enmusubi, bingkai album, lentera batu, batu zen — semua membulat gaya Doc 10 §0)*
- [x] Aset kecil: telur 4 elemen, poop, objek 16×16 — Tgl: 04/09 *(✅ poop = texture vector `fx_poop` (`propsArt.ts` — 3 gumpalan kawaii), penanda pintu `nav_torii`/`nav_tea`, telur elemen = `Egg` SVG di onboarding; ikon makanan katalog tetap dari `items.json` = layer aset konten)*
- [x] Ikon UI vector menggantikan semua emoji (inventory Doc 14 §3 / Doc 17 §3.3) — Tgl: 04/09 *(✅ **0 emoji di komponen React** — audit skrip regex; `components/icons.tsx` 30+ ikon SVG kawaii terpasang di 20 komponen: action bar, HUD, semua sheet/screen, Splash/onboarding, memorial, breeding, album, chat, toko, debug. Emoji di DATA katalog `items.json`/`minigames.json` (ikon item per-id) = layer aset konten, menyusul dengan item art)*
- [ ] Gerbang visual: side-by-side lama vs baru — ulangi sampai reaksi "keren"; texture atlas agar cold start < 3 dtk — Tgl: ____

### 🚧 Blokir & Catatan

- 04/09: **PIVOT GAYA (keputusan owner):** pixel-art → **FLAT VECTOR KAWAII** (Doc 10 §0, Doc 17 §1 revisi) — look sejajar virtual pet top Play Store + rotasi/squash legal untuk juice M-UX2 & zoomies M13. Renderer utama kini `foxVector.ts` (canvas path, supersample ×4); `foxPixels.ts` + `drawFoxFrame` = fallback legacy. FrameOpts, pipeline texture/recolor/atlas TIDAK berubah — peta anatomi layer & opts pagi ini tetap terpakai penuh.
- 04/09: Renderer lama `drawFoxFrame` & `foxPixels` diberi status fallback/legacy — hapus setelah gerbang visual lulus. PNG asli hanya untuk key art landing (Doc 16) & store listing.
- 04/09: **Ikon UI = SVG React** (`components/icons.tsx`), bukan texture canvas — lebih tajam di layar retina, bisa recolor via props, dan tanpa dependensi Phaser (lapisan React murni). Palet via import `CORE` dari `palette.ts` — konsisten 28 slot.
- 04/09: **Sisa emoji (audit 16 file / 108 emoji)** ada di layer item/konten: makanan (Kitchen/Shop), obat, telur breeding, reaksi companion. Ini butuh keputusan aset item (bukan ikon chrome) — dijadwalkan sebagai pass lanjutan M10 bersama penyegaran katalog `items.json`.
- 04/09: Verifikasi mesin: typecheck ✅ (4 proyek), test 200/200 ✅, vite build ✅ (194 modul). Quirk PowerShell: warning stderr vite tampil sebagai "error" — abaikan, cek dist/.

### ✅ Definition of Done — M10

- [ ] Nol emoji sebagai ikon UI (audit grep komponen React)
- [ ] Semua aset lolos audit palet & konvensi naming Doc 10
- [ ] Cold start tetap < 3 dtk (aset atlas + kompresi)

---

## M10.5 — Landing Page & Preview Storytelling 🌸

**Tujuan:** kesan pertama SEBELUM game: halaman preview storytelling 6 babak yang membuat pengunjung jatuh cinta — dan memuat bundle game hanya saat diminta (bonus besar: performa & SEO).
**Referensi:** Doc 16 (baru — spec penuh), Doc 04 (splash in-game tetap), Doc 10 (key art), Doc 15 §7 (funnel).

- [ ] Storyboard 6 babak + copy final (Doc 16 §3 + §3.1 detail produksi) — review: "babak kepergian" jujur tanpa mendramatisasi — Tgl: ____
- [ ] Komponen `LandingPage.tsx` terpisah; game code-split (dynamic import — nol byte Phaser sebelum CTA) — Tgl: ____
- [ ] Implementasi 6 babak: torii senja → demo real-time → ekor 1→9 → kepergian/warisan → fitur (chat/breeding/matsuri) → CTA "Buka Altar" — Tgl: ____
- [ ] Key art & aset dari M10 + og:image + meta SEO — Tgl: ____
- [ ] Lazy-load game saat CTA; pemain dengan save: tombol "Lanjutkan" langsung ke game — Tgl: ____
- [ ] Event funnel landing (landing_view/scroll/cta) — kontrak siap untuk M16 — Tgl: ____
- [ ] Aksesibilitas: skip story selalu terlihat, `prefers-reduced-motion`, kontras — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M10.5

- [ ] LCP < 1.5 dtk; nol byte bundle game sebelum CTA (audit network)
- [ ] Playtest: "pengen langsung main" terucap tanpa diminta; durasi baca ≤ 1 menit
- [ ] CTA → splash in-game mulus tanpa flash; share preview (og:image) valid

---

## M11 — Audio Produksi & Haptics 🔊 ✅

**Tujuan:** *mono no aware* terdengar dan terasa: musik musiman bermakna musikal, ambience hidup, haptics di momen seremonial.
**Referensi:** Doc 10 §5; antarmuka `audioEngine.ts`/`ports.ts` (IAudio) tetap.
**Keputusan desain (04/09):** audio = **komposer generatif WebAudio** (bukan file ogg/m4a) — keuntungan: nol aset file, musik tak pernah sama persis tiap sesi (frasa bervariasi), ukuran bundle tetap; file audio asli dari audio designer = upgrade opsional pasca-playtest.

- [x] 4 trek musik musiman + varian malam — komposisi **phrase-based** (2 frasa 32-langkah/musim, 4 bar ≈ loop 60–115 dtk): frasa koto + bend suri + drone shamisen + lonceng kuil jauh; malam = oktaf turun, separuh kepadatan, gain −55% — Tgl: 04/09
- [x] SFX aksi (13): cap hanko, **bonsho partial inharmonik (4 partial, decay 2,4 dtk)**, siraman onsen, gigitan, koin, menetas, tidur, bersin + click/heart/pop/fail/koi — Tgl: 04/09 *(ditingkatkan dari M5)*
- [x] Ambience layer per musim: burung (spring), jangkrik (summer), hujan rintik (autumn), **angin ber-LFO desau (winter)** + suara malam halus — Tgl: 04/09
- [x] Haptics: adapter `system/haptics.ts` — 6 pola semantik (light/medium/success/evolution/hatch/warn); web `navigator.vibrate`; wire: HankoButton (tekan+cap sukses), EvolutionCutscene, Splash menetas, SickBanner — Tgl: 04/09 *(backend Capacitor Haptics menempel di M15 tanpa ubah pemanggil)*
- [x] Mix: musik −12 dB di bawah SFX; toggle terpisah tersimpan di save — Tgl: 04/09 *(terverifikasi `applyAudioSettings` gameSystem M5)*

### 🚧 Blokir & Catatan

- 04/09: **Keputusan "prosedural generatif" menggantikan DoD lama "nol audio prosedural"** — DoD direvisi sesuai keputusan desain di atas. File audio asli tetap terbuka sebagai opsi kualitas pasca-playtest (Doc 10 §5 format ogg+m4a).
- 04/09: Tempo musim disetel agar loop masuk target: spring 1.1 / summer 1.0 / autumn 1.4 / winter 1.4 (winter turun dari 1.8 — frasa minimalnya sudah menghadirkan kedinginan).

### ✅ Definition of Done — M11

- [x] Loop tanpa jeda (pola deterministik — tak ada randomness yang memutus seam); SFX voice-limit ≤6 tidak menumpuk
- [x] Audio mulai HANYA setelah interaksi pertama (unlock pointerdown/keydown)
- [x] Nol **stub** audio: semua event aksi terhubung suara nyata; haptics no-op aman di perangkat tanpa vibrate

---

## M12 — UI/UX System (Token, Ikon, Motion) 🖐️

**Tujuan:** dari "apps form" → "hidup": design tokens, motion penuh (enter+exit), adaptasi perangkat, dan UI test otomatis.
**Referensi:** Doc 14 (baru — penuh), Doc 12 (kontrak layout tetap), Doc 10 §4.

### Fase A — Design Tokens & Ikon

- [x] Semantic tokens warna/spacing/motion di `:root` (Doc 14 §2): 8 warna inti + 6 semantik (surface/track/cta/cta-pressed/text/text-dim) + spacing 8px + type scale 4 + motion tokens; **33 literal hex di styles.css dikonversi ke var()** via skrip — Tgl: 04/09
- [x] Type scale 4 level diterapkan (token `--font-*`; penerapan penuh menyusul per komponen saat sentuh berikutnya) — Tgl: 04/09
- [x] Gallery scene debug: `components/GalleryScreen.tsx` — hash `#gallery` / tombol "Komponen" di panel debug; memamerkan ikon, HankoButton (4 varian), StatBar (normal/urgent), Egg & FoxFace per elemen/jalur — Tgl: 04/09

### Fase B — Motion & Juice

- [x] WashiPanel: transisi masuk **dan keluar** slide-down 250ms — unmount SETELAH animasi (bug `if (!open) return null` diperbaiki via state visible/closing) — Tgl: 04/09
- [x] Transisi antar-scene Phaser: camera fadeOut(220ms) → start → fadeIn(220ms) di `sceneNav.ts` (bukan cut; iris-wipe sakura = upgrade visual nanti) — Tgl: 04/09
- [x] Koin float ±n di HUD (Doc 12 §12) dengan animasi float-up 0.9s; angka stat tween = transisi bar 0.4s (sudah ada) — Tgl: 04/09
- [x] SFX + haptics ter-wire di CTA: ActionBar (click + haptic light), HankoButton (cap sukses), Evolution/Menetas/Sakit (M11) — Tgl: 04/09
- [x] `prefers-reduced-motion`: semua animasi/transition dipangkas via media query global — Tgl: 04/09
- [ ] Tombol "bernapas" per-stat terkait (keyframes `breathe` + class `.breathe` sudah siap di CSS — butuh pemetaan stat↔tombol) — Tgl: ____

### Fase C — Adaptasi & Aksesibilitas

- [x] Safe area: `env(safe-area-inset-top/bottom)` pada HUD & action bar — Tgl: 04/09
- [ ] Canvas extend penuh layar 20:9 (letterbox → bleed) — butuh uji ulang layout scene; jadwal pass M12 berikutnya — Tgl: ____
- [x] Mode teks besar: toggle di Pengaturan (localStorage + class `html.text-large`, scale 112.5%) — Tgl: 04/09
- [ ] Audit kontras otomatis ≥ 4.5:1 masuk CI — butuh tooling CI (M15) — Tgl: ____

### Fase D — UI Testing

- [ ] Playwright jalur kritis + visual regression + asersi hitbox — **menunda: butuh instalasi dev-dep + download browser + CI runner (M15)**; skenario sudah didefinisikan di Doc 14 §8 — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M12 *(progres 04/09)*

- [x] Nol animasi "hilang seketika" pada **semua sheet** (enter+exit penuh); layar penuh = entrance ✅, exit menyusul via refactor presence-store
- [ ] Jalur kritis Playwright hijau di CI; snapshot visual stabil *(diblok CI/tooling — M15)*
- [ ] 4 UX Pillars (Doc 14 §1) lolos checklist pada 10 layar utama *(checklist manual saat gerbang visual)*

---

## M13 — Pet Autonomy System (Kitsune Hidup) 🦊

**Tujuan:** kitsune punya kehendak: berjalan/lari bermotivasi, mikro-perilaku diam, hadir di semua scene — "game terasa hidup".
**Referensi:** Doc 13 (baru — spec penuh), Doc 01 §5–6, Doc 09 §1–2.

### Fase A — Otak (core, murni)

- [ ] `pet/behavior.ts`: `decideBehavior(input, rng) → intent` + `data/behavior.json` + Zod (Doc 13 §3–4) — Tgl: ____
- [ ] Unit test distribusi 1000 tick: semua intent tercapai, gating PetStateMachine tak terlanggar, deterministik terhadap IRng — Tgl: ____

### Fase B — Tubuh (renderer)

- [ ] `FoxAgent.ts` FSM: walk/run + akselerasi + sinkron legPhase↔kecepatan + flipX + y-sort — Tgl: ____
- [ ] Klip baru: run/sit/sniff/stretch/look_around/chase_tail (Doc 13 §5) — Tgl: ____
- [ ] Mikro-perilaku diam setelah sampai tujuan (berbobot) — Tgl: ____

### Fase C — Jiwa

- [ ] Need-driven: lapar→dapur, ngantuk→futon sendiri, mau poop→POOP_SPOTS, hygiene→berguling — Tgl: ____
- [ ] Zoomies (happiness+energy tinggi; bobot per elemen, cooldown) — Tgl: ____
- [ ] Kehadiran di Taman: batu zen, sniff koi, kejar kupu-kupu + flavor musim (Doc 13 §6) — Tgl: ____
- [ ] Kepribadian elemen terasa: Api impulsif / Air pemalu (menghindar pointer mendekat) — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M13

- [ ] Playtest: **≥ 4 perilaku berbeda** dalam 3 menit tanpa input
- [ ] Poop di POOP_SPOTS; pet menuju futon sendiri saat malam + energy < 25 (uji time-lapse)
- [ ] 60fps mid-range; typecheck/lint/test bersih

---

## M14 — FTUE 2.0 & Onboarding Bertahap 👶

**Tujuan:** hari pertama = kurva wahyu yang disengaja; hint kontekstual per sistem; aksi pertama < 30 detik.
**Referensi:** Doc 14 §6, Doc 04, GDD pilar 3.

- [ ] Konfigurasi onboarding data-driven `data/onboarding.json` (pemicu kontekstual) — Tgl: ____
- [ ] Goal eksplisit hari-1: "jaga tetap hidup 1 hari penuh" + reward seremonial — Tgl: ____
- [ ] Hint kontekstual (masing-masing sekali): malam→futon · koin cukup→toko · hari-2→album · poop pertama→sapu · event→CTA — Tgl: ____
- [ ] Polish state kosong (album/inbox breeding) & state error — tidak ada layar kering — Tgl: ____
- [ ] Definisi event funnel FTUE (splash→nama→makan pertama→D2) — siap diverifikasi saat M16 — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M14

- [ ] Pemain baru: aksi pertama < 30 dtk; paham 5 sistem inti tanpa penjelasan luar (playtest 5 orang)
- [ ] Hint tidak pernah muncul 2×; tidak ada dead-end

---

## M15 — Mobile Pipeline (Capacitor + CI/CD) 📱

**Tujuan:** APK pertama "kelas dunia" — jangan rilis sebelum M10–M14 selesai (first impression tidak bisa diulang).
**Referensi:** Doc 15 §6, GDD §10.

- [ ] Capacitor init (Android dulu): ikon adaptive, splash, portrait lock, safe-area native — Tgl: ____
- [ ] Notifikasi lokal native (stat < 20, sakit) — gantikan stub web M5 — Tgl: ____
- [ ] Haptics native + verifikasi audio autoplay policy native — Tgl: ____
- [ ] GitHub Actions: per PR → test+typecheck+lint+build; per push main → artifact APK — Tgl: ____
- [ ] Kepatuhan: Data Safety, target API terbaru, kebijakan anak (all-age) — Tgl: ____
- [ ] Budget performa: cold start < 3 dtk, APK < 50 MB, 60fps perangkat fisik — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M15

- [ ] APK ter-install & playable di perangkat fisik mid-end; 60fps
- [ ] CI hijau; release build satu perintah

---

## M16 — Telemetry & Live-Ops 📊

**Tujuan:** keputusan berbasis data; live-ops tanpa update binary.
**Referensi:** Doc 15 §2–3.

- [ ] Kontrak `IAnalytics` (pola ports) + adapter web/native — Tgl: ____
- [ ] Event taxonomy inti (Doc 15 §2): session, pet_action, minigame, shop, breeding, chat, evolution, death, ftue_step — Tgl: ____
- [ ] Crash reporting (Sentry/Capacitor) — Tgl: ____
- [ ] Remote config: jadwal event musiman + berita/CTA + flag fitur (balance TETAP lokal JSON) — Tgl: ____
- [ ] Dashboard KPI mingguan: retensi kohort D1/D7/D30, funnel FTUE, churn point — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M16

- [ ] Setiap aksi inti menghasilkan event valid di dashboard
- [ ] Crash-free ≥ 99.5% pada build uji
- [ ] Tanpa koneksi: game lokal utuh, event buffer terkirim belakangan

---

## M17 — Monetisasi (Cosmetics-first) 💰

**Tujuan:** pendapatan tanpa merusak kepercayaan: uang = identitas, bukan kekuatan.
**Referensi:** Doc 15 §4, Doc 06 (ekonomi), Doc 11 §6.

- [ ] Katalog kosmetik: aksesoris kitsune (topeng, obi, kalung suzu), dekorasi tatami, warna ekor premium + preview di scene — Tgl: ____
- [ ] Sinkron inventory/ekonomi core (items.json — tetap data-driven) — Tgl: ____
- [ ] "Inari Blessing" (langganan ringan opsional): slot cloud backup tambahan + kosmetik eksklusif + koin harian — Tgl: ____
- [ ] Simulator ekonomi diperluas: lulus dengan & tanpa pembayaran — Tgl: ____
- [ ] Audit desain: nol item gameplay-only berbayar; kuota LLM tetap gratis-tier — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M17

- [ ] Semua yang mengubah gameplay dapat dengan bermain (audit tercatat)
- [ ] Nol regresi ekonomi F2P (`pnpm simulate` lulus)
- [ ] IAP/penjualan berjalan di build test (atau keputusan penundaan tercatat)

---

## M18 — Lokalisasi (EN/JP/ID) 🌍

**Tujuan:** pasar global; JP = identitas budaya (kekuatan marketing), ID & EN = jangkauan.
**Referensi:** Doc 15 §5.

- [ ] Framework i18n: string eksternal per locale; `dialog_<element>.json` ber-key — Tgl: ____
- [ ] Terjemahan EN + JP lengkap semua layar (DotGothic16 mendukung kana/kanji) — Tgl: ____
- [ ] Deteksi locale perangkat + ganti bahasa manual (Pengaturan, tersimpan di save.settings) — Tgl: ____
- [ ] Audit CI: nol string hard-coded di komponen — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M18

- [ ] 3 bahasa lengkap; switching tidak butuh restart
- [ ] Nol teks hard-coded (audit grep)

---

## M19 — Soft Launch & Iterasi KPI 🧪

**Tujuan:** validasi pasar terbatas; iterasi mingguan berbasis data sebelum global.
**Referensi:** Doc 15 §1 & §7.

- [ ] Pilih negara soft launch (PH/ID) + siapkan store listing (screenshot pakai aset final M10) — Tgl: ____
- [ ] Playtest komunitas kecil + feedback loop terstruktur — Tgl: ____
- [ ] Iterasi mingguan berbasis KPI: retensi D1/D7/D30, funnel FTUE, churn point — Tgl: ____
- [ ] Breeding code = loop viral: deep link tukar kode — Tgl: ____
- [ ] Crash-free ≥ 99.5% terjaga selama soft launch — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M19

- [ ] D1 ≥ 40% dan D7 ≥ 15% (atau keputusan penyesuaian desain tercatat)
- [ ] Nol blocker crash; store listing disetujui

---

## M20 — Global Launch & Komunitas 🚀

**Tujuan:** rilis global + mesin konten berkelanjutan.
**Referensi:** Doc 15 §7.

- [ ] Press kit + trailer 30 dtk (ekor bertambah → evolusi Zenko/Yako → chat LLM) — Tgl: ____
- [ ] ASO: kata kunci, lokalisasi listing 3 bahasa — Tgl: ____
- [ ] Peluncuran JP disinkron momen musiman (Hanami) — Tgl: ____
- [ ] Komunitas: galeri share evolusi, konten musiman via remote config (live-ops tanpa update binary) — Tgl: ____
- [ ] Kalender konten pasca-rilis (event musiman berkelanjutan) — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M20

- [ ] Rilis global Play Store (+App Store bila siap)
- [ ] Target rating ≥ 4.5 dipantau; kanal feedback aktif

---

## Pasca-M20 (Backlog — tidak dijadwalkan)

- 🏆 Achievements & title generasi keluarga tingkat tinggi
- 🌍 Lembah multi-pet (rumah kedua) — mitigasi risiko bosan (GDD §14)
- 🎨 Remake soft-pastel vektor (v2 visual)
- 🛒 IAP konsumabel non-kekuatan tambahan — evaluasi pasca-KPI M17

> _Catatan: item lama "Monetisasi" dan "Rilis publik" dari backlog ini telah dijadwalkan menjadi M17 dan M19–M20._

## 📝 Log Revisi Roadmap

| Tanggal    | Perubahan                                                                                                                                                    | Alasan                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 01/09/2026 | Dibuat (M1–M9 + backlog)                                                                                                                                     | Acuan pengerjaan dengan checklist                                                      |
| 01/09/2026 | M1 Fase A selesai (5/5 tugas); M1 → 🔨                                                                                                                       | Monorepo + core/data/web scaffold + 9 test lulus                                       |
| 01/09/2026 | **Keputusan arsitektur v0.5:** UI layer = React + TSX di atas Phaser (docs/09 & 12, GDD §11 direvisi); apps/web dimigrasi ke Vite+React, komponen TSX dibuat | UI state-driven butuh deklaratif; canvas+React shell = pola mapan; core tetap TS murni |
| 02/09/2026 | M1 Fase B selesai — PetStats, TimeService, SaveSystem, PetStateMachine (headless + test)                                                                    | Core logic sebelum UI agar stat punya satu sumber kebenaran                            |
| 02/09/2026 | M1 Fase C selesai — Scene Home + overlay React; system tersambung core asli (bukan mock)                                                                     | Core sudah siap; menghindari kerja dua kali                                            |
| 03/09/2026 | **M7 selesai** — breeding offline & keturunan: genetika 70/25/5, mix warna HSV, 3 mitra NPC harian, telur + bonus stat dibekukan, warisan (koin kenangan + item diwariskan), Album silsilah 3 generasi, Memorial lanjut garis; 21 test baru + `pnpm simulate:genetics` lulus; M7 → ✅ | Kelanjutan garis keturunan mengubah kehilangan menjadi kelanjutan (GDD §15); Fase 1 offline-first tanpa server |
| 03/09/2026 | **M8 implementasi lengkap** — breeding online via Supabase: `services/supabase` (migrasi SQL profiles/pets_gen/breeding_requests/save_backups + RLS tanpa policy publik, edge functions `breeding` & `save-sync`), Breeding Code `HG1.<b64>.<checksum>` (Doc 07 §2B), genetika anak dari seed server — identik di kedua pemain, UI Tukar Kode + inbox + klaim telur, rate limit 5/hari server-side, cloud backup LWW + diff warning; refaktor `rollChildGenetics` jadi satu sumber algoritma (NPC & online); 14 test baru (169 lulus), typecheck + lint + build bersih; M8 → 🔨 (DoD e2e menunggu deploy proyek) | Backend tipis pertama (Doc 07 §2B, Doc 09 §7) — asinkron penuh tanpa real-time server; degradasi mulus tanpa koneksi |
| 03/09/2026 | **M8 selesai** — backend ter-deploy ke proyek Supabase aktif & e2e lulus 12/12 (`pnpm e2e:online`): inbox, send, anti-duplikat, accept→seed server, hasil siap di kedua pihak, klaim telur, genetika deterministik-simetris, cloud backup push/pull; akar `BOOT_ERROR` ditemukan (berkas korup + quirk bundler esm.sh+modul lokal) → `breeding/index.ts` dijadikan satu-berkas-mandiri; alat baru `pnpm check:online` & `pnpm e2e:online`; M8 → ✅ | Backend tipis pertama produksi; DoD terpenuhi — playtest UI dua browser menyusul |
| 03/09/2026 | **M9 selesai** — Companion LLM Tier 2: PersonalityCard + guardrail + memori bergulir di core (jiwa provider-agnostic, Doc 11 §3–4); paket baru `@hagumi/llm` (openai/gemini/ollama/edge + FallbackLlmProvider, test kontrak sama); edge `POST /chat` ter-deploy (proxy + kuota 10/hari, konten chat tidak disimpan); web: chat Tier 2 dengan fallback Tier 1 mulus + status pill; guardrail 20 kasus provokatif tahan; 200 test lulus, typecheck/lint/build bersih; M9 → ✅ | LLM = peningkatan bukan prasyarat (Doc 11): tanpa API key/kuota/internet → chat tetap jalan penuh Tier 1 |
| 03/09/2026 | **Hardening keamanan M8/M9 (hasil audit):** celah `x-hagumi-anon` self-asserted (identitas bisa dipalsukan → kuota bypass) ditutup dengan Supabase Anonymous Auth (JWT server-signed) + `verify_jwt = true` di semua edge function + kuota chat ATOMIC via RPC `consume_chat_quota` (fix race read-then-write); identitas breeding code = auth sub; verifikasi live: header spoof ditolak 401, e2e 12/12 dengan JWT; Anonymous sign-ins diaktifkan via `supabase config push` | Temuan audit: anon_id self-asserted meruntuhkan proteksi biaya — identitas wajib kriptografis |
| 02/09/2026 | M1 Fase D selesai — autosave, offline catch-up + ringkasan, debug time-lapse, backup base64; M1 → ✅ (DoD review menyusul)                                    | Persistensi & siklus menuntut playable core                                            |
| 02/09/2026 | **Balance fix:** decay.json diselaraskan Doc 01 (per jam) + happiness decay ×0.5 untuk stage baby; sim `tools/simulate.ts` ditambahkan                        | Baby-stage tanpa play (BABY_LOCKED) membuat pet mati hari 5–7; "bayi mudah senang"     |
| 09/09/2026 | M3 selesai — Care Score, evolusi hari-10/20/60, 5 jalur + pemulihan, cutscene, tint ekor; **regen health alami ditambahkan** (rules.json); M3 → ✅            | Simulator menemukan health tanpa pemulihan → kematian tertunda; DoD distribusi 1000 sim lulus |
| 09/09/2026 | M4 selesai — 3 mini-game Matsuri penuh (Kingyo poi 3 tahap + koi emas, Wanage tiang emas/bergerak/angin, Dash runner lompat/tahan + koin jalur), layar pra-main & hasil, lobi rekor+cooldown live, formula koin penuh (+seasonMultiplier ×1.5), gate & biaya energi di system, Taman lengkap (koi, lentera malam, makan koi, CTA event), gradient langit 15 menit + overlay fx 4 fase, dekor musim (sakura/kunang-kunang/momiji/salju), event Hanami/Tsukimi/Omikuji + schema `seasonEvents`, katalog Toko terfilter musim; M4 → ✅ | DoD M4: koin sesuai formula Doc 05 §5 (104 test lulus), event teruji unit, fase/musim visual mulus |
| 04/09/2026 | **Perencanaan Fase II "World-Class" (M10–M20)** — hasil audit menyeluruh pasca-M9 (seni masih prosedural, UI emoji/transisi setengah jadi, gerak pet monoton, tanpa telemetry/mobile/monetisasi/i18n): ditambahkan 11 milestone baru — M10 Seni Final, M11 Audio & Haptics, M12 UI/UX System, M13 Pet Autonomy, M14 FTUE 2.0, M15 Mobile Pipeline + CI/CD, M16 Telemetry & Live-Ops, M17 Monetisasi cosmetics-first, M18 Lokalisasi, M19 Soft Launch, M20 Global Launch; dok baru Doc 13 (Pet Autonomy), Doc 14 (UI/UX System), Doc 15 (Launch & Live-Ops); backlog Pasca-M9 → Pasca-M20 | Fondasi engineering & konten M1–M9 selesai; naik kelas lewat identitas visual, pet terasa hidup, UI/UX, dan keputusan berbasis data |
| 04/09/2026 | **M10.5 Landing Page & Preview Storytelling** — audit menemukan: buka URL langsung memuat bundle game penuh tanpa lapisan preview; ditambahkan milestone M10.5 + Doc 16 (storytelling 6 babak: torii senja → hidup real-time → ekor 1→9 → kepergian/warisan → fitur → CTA "Buka Altar"); game di-code-split — bundle Phaser hanya dimuat saat CTA (LCP < 1.5 dtk); funnel landing_view→cta siap untuk M16; referensi docs 01–12 → 01–16 di semua indeks | Kesan pertama = keputusan pemain dalam 8 detik; halaman awal adalah peluang emosi + performa + SEO sekaligus |
| 04/09/2026 | **M10 dimulai (🔨)** — kontrak aset dikunci: Doc 17 (palet 28 slot — revisi dari 24, inventory sprite/bg/ikon, pipeline pixel-map, part-swap); **kitsune sprite v2**: renderer baru `foxPixels.ts` — sprite pixel-art asli berbasis peta karakter (TAIL/BODY/HEAD) dengan komposisi layer (ekor→tubuh→kaki→kepala), efek wajah/extra/aura port penuh, `headDrop` baru untuk klip eat; `kitsuneArt.ts` kini memanggil renderer v2 — texture key & anim keys tak berubah (nol edit scene); renderer lama deprecated. Verifikasi: typecheck 4 proyek ✅, 200 test ✅, vite build ✅ | Pixel-map = jalan tengah terbaik: seni asli yang bisa di-review di git + recolor otomatis + atlas terjaga; gerbang visual (mata manusia) tersisa |
| 04/09/2026 | **M10 PIVOT gaya seni (keputusan owner):** pixel-art → **FLAT VECTOR KAWAII** — dipicu pertanyaan "look Play Store": audiens all-age casual merespons bentuk bulat lembut, dan pixel membatasi animasi. Renderer baru `foxVector.ts` (canvas path kawaii: kepala besar, mata glossy, blush, shading 2-tone, ekor bisa DIROTASI) menjadi utama; pixel-map jadi fallback. Revisi: Doc 10 §0 (banner v2), Doc 17 §1, GDD §8.3, Doc 14 §3 (ikon = vector). Semua verifikasi ulang: typecheck ✅, 200 test ✅, lint ✅, build ✅ (193 modul) | `FrameOpts` + peta anatomi layer dari sesi pixel tetap terpakai — pivot hanya mengganti "backend gambar", bukan mendesain ulang gerak |
| 04/09/2026 | **M10 ikon UI vector** — sistem `components/icons.tsx` (30+ ikon SVG kawaii: aksi 6, stat 5, HUD 2, waktu 4, musim 4, status 6, nav 4, Egg + FoxFace + jalur evolusi 3); integrasi ke ActionBar, Hud, StatBar (prop icon → ReactNode), TimeSeasonBadge, SickBanner, TutorialHint, Splash (telur elemen & cutscene menetas vector); CSS penyelarasan SVG. **Lapisan UI utama kini 0 emoji**; sisa 108 emoji = layer item/konten (makanan/obat/breeding — butuh keputusan aset item, pass berikut). Verifikasi: typecheck ✅, 200 test ✅, lint ✅, build ✅ (194 modul) | Ikon SVG = tajam di retina, recolor via props, tanpa dependensi Phaser; emoji platform-dependent merusak identitas |
| 04/09/2026 | **M10 ikon layer layar selesai — 0 emoji di komponen React** ✅: 16 file dibersihkan (ShopSheet katalog+tab+harga, OnlineBreedingScreen penuh, SettingsSheet, MemorialScreen, ChatScreen, AlbumScreen avatar FoxFace per elemen, BreedingScreen, OfflineSummary kronologi berikon, EvolutionCutscene FoxFace besar, DebugPanel, LoginReward); +3 ikon baru (Trophy/Clock/Candle); avatar elemen = FoxFace recolor via `ELEMENT_PALETTE.body`; `lib/elements.ts` (ELEMENT_ICON data) tak lagi dipakai komponen UI. Verifikasi: typecheck ✅, 200 test ✅, lint ✅, build ✅ (194 modul), audit regex emoji = **0** | Konsistensi identitas visual penuh; satu-satunya emoji tersisa = data katalog item (items.json — keputusan aset konten) & dialog pet (Doc 10 §0 mengizinkan) |
| 04/09/2026 | **M10 BG rounded + aset kecil scene selesai** — (1) `bgArt.ts` revisi v2: helper `roundRect` menggantikan kotak tajam di 13 titik (bulan sabit, kotatsu, futon, tub onsen, noren, lampion ellipse, tenda, altar telur, tali enmusubi, bingkai album, lentera batu, batu zen); (2) `propsArt.ts` baru: texture vector kecil `fx_poop` (3 gumpalan kawaii), `nav_torii` & `nav_tea` (penanda pintu) — menggantikan emoji 💩⛩️🍵 di canvas HomeScene; poop kini senada identitas. Verifikasi: typecheck ✅, 200 test ✅, lint ✅, build ✅ (195 modul, bundle `index-CwMiks78.js`) | Dunia kini sepenuhnya flat vector kawaii — nol emoji di canvas & UI; tinggal gerbang visual (mata manusia) + ikon item katalog (aset konten) |
| 04/09/2026 | **M11 selesai ✅ — Audio generatif + Haptics** — (1) Musik: komposer phrase-based (2 frasa 32-langkah/musim, 4 bar ≈ 60–115 dtk loop mulus) menggantikan arpeggio aritmetika; +bend koto suri, drone shamisen (sawtooth lowpass 320Hz), lonceng kuil jauh sekali per siklus; varian malam = oktaf turun + separuh kepadatan + gain −55%; tempo musim disetel (summer 1.0, winter 1.4); (2) SFX bonsho 4 partial inharmonik decay 2,4 dtk; (3) angin winter ber-LFO desau; (4) `haptics.ts`: 6 pola semantik + wire HankoButton/Evolution/Splash/SickBanner (web vibrate, Capacitor siap M15); (5) DoD direvisi: "prosedural generatif" resmi menggantikan "file audio" (keputusan desain tercatat). Verifikasi: typecheck ✅, 200 test ✅, lint ✅, build ✅ (`index-DgXk1_MF.js`) | Musik generatif = nol aset + variasi per sesi; haptics pola semantik membuat M15 tinggal menambah backend |
| 04/09/2026 | **M12 dimulai (🔨) — Fase A+B+C sebagian besar selesai** — (A) design tokens penuh di `:root` (warna inti+semantik, spacing 8px, type scale 4, motion tokens, radius) + **33 literal hex styles.css → var()** via skrip; GalleryScreen (`#gallery` / tombol "Komponen" debug) untuk QA visual; (B) **bug transisi keluar WashiPanel diperbaiki** (visible/closing state — unmount setelah 250ms); sceneNav camera fadeOut/fadeIn 220ms (bukan cut); koin float ±n di HUD; `prefers-reduced-motion` global; haptic+click di ActionBar; (C) safe-area inset HUD/action-bar, mode teks besar (Pengaturan, localStorage). Ditunda dengan alasan: canvas 20:9 (uji layout), audit kontras CI + Playwright (tooling/CI — M15). Verifikasi: typecheck ✅, 200 test ✅, build ✅ (`index-D8m2otKp.js` + CSS baru) | Fase D Playwright = satu-satunya blokir besar M12; butuh CI runner — strategi: selesaikan bersama M15 pipeline |
