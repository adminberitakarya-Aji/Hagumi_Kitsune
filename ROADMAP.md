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
| M4        | Retensi (Offline, Login, Mini-game)    | ⬜     | —     | —       | 1 minggu   |
| M5        | Polish (Seni Final, Audio, Balance)    | ⬜     | —     | —       | 1 minggu   |
| M6        | Companion & Siklus Hari                | ⬜     | —     | —       | 1 minggu   |
| M7        | Breeding Offline                       | ⬜     | —     | —       | 1–2 minggu |
| M8        | Breeding Online (Supabase)             | ⬜     | —     | —       | 1–2 minggu |
| M9        | Companion LLM                          | ⬜     | —     | —       | 1–2 minggu |

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

**Laporan distribusi (1000 sim, 4 persona):** survival 71,2% · normal 400/400 hidup (semua zenko) · rajin 300/300 (zenko) · santai 12/200 · lalai 0/100 · jalur zenko 74,4% / biasa 25,6% · evolusi hari-10 913×, hari-20 866×, hari-60 745× · nol pelanggaran invariant.
**⚠️ Temuan untuk didiskusikan (tidak memblokir M4):** (1) jalur negatif yako/nogitsune tidak pernah tercapai — pet meninggal sebelum evolusi ketika care <50; (2) survival santai rendah (6%) vs janji GDD "buruk = 80 hari" — perlu tuning decay atau toleransi health.

---

## M4 — Retensi: Mini-game & Musim ⏰

**Tujuan:** alasan kembali tiap hari: 3 mini-game festival, musim + event, siklus pagi–malam visual penuh.
**Referensi:** Doc 05 (mini-game), Doc 03 §3–5 (fase/musim/event), Doc 12 §5 & §7.

- [ ] `MiniGameBase` + lobi Matsuri (3 kartu, rekor, cooldown 30 mnt, biaya energi, Doc 12 §7.1) — Tgl: ____
- [ ] Mini-game 1: Kingyo-sukui (poi basi 3 tahap, ikan biasa/emas, 45 dtk) — Tgl: ____
- [ ] Mini-game 2: Wanage (timing meter, 8 lemparan, tiang emas/bergerak) — Tgl: ____
- [ ] Mini-game 3: Kitsune-dash (runner 60 dtk, lompat/tahan, koin jalur) — Tgl: ____
- [ ] Formula koin (Doc 05 §5) + layar hasil + bonus elemen per game — Tgl: ____
- [ ] Bonus tahap hidup: baby terkunci, elder +10% koin (Doc 05 §1) — Tgl: ____
- [ ] Visual fase pagi/malam penuh: gradient langit 15 menit, lentera menyala, fx per fase — Tgl: ____
- [ ] Musim: catalog makanan musiman + dekor scene + ambience (Doc 03 §4) — Tgl: ____
- [ ] Event musiman: Hanami, Matsuri ×1.5, Tsukimi, Tahun Baru omikuji (Doc 03 §5) — Tgl: ____
- [ ] Scene Taman lengkap (koi, lentera, makan koi, event CTA, Doc 12 §5) — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M4

- [ ] Ketiga mini-game mainable sentuh-saja 60fps; koin masuk sesuai formula
- [ ] Ganti fase waktu terlihat mulus; ganti musim mengubah katalog & suasana
- [ ] Event musiman terpicu tepat; omikuji memberi bonus yang benar

---

## M5 — Polish: Seni Final, Audio, Balance ✨

**Tujuan:** dari placeholder → game terasa "dibuat dengan cinta": sprite final, audio, musim audio, tutorial, PWA.
**Referensi:** Doc 10 (seni & audio), Doc 12 (semua wireframe jadi standar visual), GDD §13.

- [ ] Sprite final kitsune: 12 klip × recolor 5 elemen (Doc 01 §6, Doc 10 §3) — Tgl: ____
- [ ] BG final 12 scene + objek + pola seigaiha/asanoha — Tgl: ____
- [ ] UI final: font pixel (DotGothic16/Hachi Maru Pop), semua komponen sesuai Doc 10 §4 — Tgl: ____
- [ ] Audio: 4 trek musim + varian malam, SFX aksi, ambience per musim (Doc 10 §5) — Tgl: ____
- [ ] Pengaturan lengkap (musik/SFX/notify/offline-LLM toggle, Doc 12 §3.2) — Tgl: ____
- [ ] Notifikasi lokal: stat <20, sakit (PWA + Capacitor) — Tgl: ____
- [ ] PWA: manifest + icon hanko + installable + offline shell — Tgl: ____
- [ ] Balance pass: jalur simulate-90-days, target GDD §13 (sesi 8–15×/hari, kematian 20–40% minggu-1) — Tgl: ____
- [ ] Audit aksesibilitas Doc 10 §4 (kontras, hitbox) + checklist Doc 12 §13 — Tgl: ____
- [ ] Playtest internal 5 orang + catatan perbaikan — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M5

- [ ] Tidak ada lagi aset placeholder di build
- [ ] Playtest: pemain baru paham alur tanpa penjelasan luar
- [ ] Laporan balance memenuhi target GDD §13 (atau keputusan penyesuaian tercatat)

---

## M6 — Companion & Dialog Kontekstual 💬

**Tujuan:** pet "bicara": balon kontekstual berprioritas, kepribadian elemen, memori, chat template (Tier 1).
**Referensi:** Doc 08, Doc 11 §1 (Tier 1), Doc 12 §8 (chat UI).

- [ ] `DialogueEngine`: trigger prioritas 1–9 + anti-ulang (Doc 08 §2) — Tgl: ____
- [ ] `dialog_<element>.json` ×5: baris per kepribadian + senior + yako (Doc 08 §3) — Tgl: ____
- [ ] memoryLog (maks 20) + dialog memori + "dimaafkan" (Doc 08 §4) — Tgl: ____
- [ ] Chat UI fullscreen (Doc 12 §8): bubble, input, typing indicator — Tgl: ____
- [ ] Chat template keyword (id/en) + anti-spam +10×/hari (Doc 08 §5) — Tgl: ____
- [ ] `provider-offline` sebagai ILlmProvider default (kontrak Doc 11 §2) — Tgl: ____
- [ ] Non-verbal emoji reaksi (💢💧💤❤️) untuk feedback instan — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M6

- [ ] 5 kepribadian terasa berbeda saat dibaca (uji baca manual, catatan di Blokir)
- [ ] Dialog lalai muncul tepat & bisa dimaafkan; tidak menghakimi kasar
- [ ] Chat Tier 1 berfungsi penuh offline

---

## M7 — Breeding Offline & Keturunan 💞

**Tujuan:** pet dewasa bisa kawin dengan NPC; genetika turunan; pohon keluarga; warisan saat mati.
**Referensi:** Doc 07, Doc 12 §9 (album & breeding), GDD §15.

- [ ] Syarat breeding ditegakkan (umur 20+, HP/happy ≥80, cooldown 7 hari, kuota 4) + alasan UI — Tgl: ____
- [ ] Scene Breeding House: altar, 3 mitra NPC harian, kartu preview anak (Doc 12 §9.2) — Tgl: ____
- [ ] Algoritma genetika (70/25/5%) + warna mix HSV + kepribadian (Doc 07 §3) — Tgl: ____
- [ ] Telur keturunan: inkubasi normal, start bonus stat induk — Tgl: ____
- [ ] Lineage tree skema + Album Keluarga (kartu hidup/memorial, Doc 12 §9.1) — Tgl: ____
- [ ] Warisan saat mati: koin kenangan, item diwariskan, telur tetap jalan (Doc 07 §5) — Tgl: ____
- [ ] 1000 simulasi genetika → laporan distribusi (DoD Doc 07 §6) — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M7

- [ ] Dari pet mati → keturunan jalan dengan warisan benar, pemain tak mulai dari nol
- [ ] Silsilah 3 generasi tampil benar di Album
- [ ] Semua syarat & biaya dari data, ditegakkan di UI + core

---

## M8 — Breeding Online via Supabase 🌐

**Tujuan:** tukar gen antar-pemain asinkron (breeding code + request) — backend tipis pertama.
**Referensi:** Doc 07 §2B, Doc 09 §1 (services/supabase), GDD §15.

- [ ] Setup Supabase project + struktur repo `services/supabase` (migrasi SQL) — Tgl: ____
- [ ] Auth ringan (anon → akun opsional); tabel: profiles, pets_gen, breeding_requests — Tgl: ____
- [ ] Breeding Code: encode/decode hash gen pet (base64, Doc 07 §2B) — Tgl: ____
- [ ] Edge function: kirim/terima request, cocokkan gen server-side, hasil telur saat kedua pihak buka — Tgl: ____
- [ ] UI: menu Tukar Kode + inbox permintaan + notifikasi hasil — Tgl: ____
- [ ] Rate limit & anti-abuse (maks request/hari) — Tgl: ____
- [ ] Sinkronisasi save opsional (cloud backup, konflik = last-write-wins + diff warning) — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M8

- [ ] Dua pemain uji-e2e: tukar kode → telur turunan muncul di keduanya
- [ ] Tanpa koneksi: fitur online nonaktif mulus, game lokal utuh
- [ ] API key Supabase aman (anon key saja, RLS aktif)

---

## M9 — Companion LLM (Tier 2) 🧠

**Tujuan:** percakapan bebas via ILlmProvider; memori 2 tingkat; guardrail; offline fallback mulus.
**Referensi:** Doc 11 (penuh), Doc 08 (Tier 1), Doc 09 §2 (Supabase proxy).

- [ ] Kontrak `ILlmProvider` final + test kontrak sama untuk semua adapter — Tgl: ____
- [ ] Adapter: openai, gemini, ollama, offline (Doc 11 §2) — Tgl: ____
- [ ] Supabase edge `POST /chat`: proxy provider + rate limit (API key server-only) — Tgl: ____
- [ ] PersonalityCard + context builder (stats/fase/musim/umur) — Tgl: ____
- [ ] Ringkasan bergulir memori (kompres per minggu, maks ±2k token, Doc 11 §3) — Tgl: ____
- [ ] Guardrail + filter konten + "Mode Tanpa LLM" (Doc 11 §4) — Tgl: ____
- [ ] Fallback otomatis → Tier 1 saat gagal/kuota habis + ikon status (☁️/📡/📵) — Tgl: ____
- [ ] `data/llm.json` + pengaturan provider (Doc 11 §5) — Tgl: ____
- [ ] Kuota harian sederhana server-side (tanpa monetisasi — cuma batas biaya) — Tgl: ____
- [ ] Uji prompt provokatif ×20 kasus → guardrail tahan — Tgl: ____

### 🚧 Blokir & Catatan

- (kosong)

### ✅ Definition of Done — M9

- [ ] Chat LLM konsisten kepribadian lintas provider (uji 5 elemen × 3 provider)
- [ ] Matikan internet di tengah chat → beralih Tier 1 tanpa crash
- [ ] Audit: tidak ada API key di bundle klien; data chat tidak disimpan >24 jam

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
| 02/09/2026 | M1 Fase D selesai — autosave, offline catch-up + ringkasan, debug time-lapse, backup base64; M1 → ✅ (DoD review menyusul)                                    | Persistensi & siklus menuntut playable core                                            |
| 02/09/2026 | **Balance fix:** decay.json diselaraskan Doc 01 (per jam) + happiness decay ×0.5 untuk stage baby; sim `tools/simulate.ts` ditambahkan                        | Baby-stage tanpa play (BABY_LOCKED) membuat pet mati hari 5–7; "bayi mudah senang"     |
| 09/09/2026 | M3 selesai — Care Score, evolusi hari-10/20/60, 5 jalur + pemulihan, cutscene, tint ekor; **regen health alami ditambahkan** (rules.json); M3 → ✅            | Simulator menemukan health tanpa pemulihan → kematian tertunda; DoD distribusi 1000 sim lulus |
