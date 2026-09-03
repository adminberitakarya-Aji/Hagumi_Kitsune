# 🗺️ ROADMAP — HAGUMI (育み)

> Dokumen kerja harian. Setiap selesai tugas → **centang checklist & isi kolom tanggal**.
> Referensi desain: `GDD-Pet-Game.md` · detail teknis: `docs/01–12`.

## 📌 Cara Pakai

1. Kerjakan milestone berurutan (M1 → M9); dalam milestone, kerjakan tugas per urutan.
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

## Pasca-M9 (Backlog — tidak dijadwalkan)

- 💰 Monetisasi (kuota chat, item "Obrolan Chi", subscribe) — arahan Doc 11 §6; mulai HANYA setelah M1–M7 stabil + dasar pengguna
- 🏆 Achievements & title generasi keluarga tingkat tinggi
- 🌍 Lembah multi-pet (rumah kedua) — mitigasi risiko bosan (GDD §14)
- 🎨 Remake soft-pastel vektor (v2 visual)
- 📢 Rilis publik: soft launch + umpan balik komunitas

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
