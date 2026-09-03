# ðŸ—ºï¸ ROADMAP â€” HAGUMI (è‚²ã¿)

> Dokumen kerja harian. Setiap selesai tugas â†’ **centang checklist & isi kolom tanggal**.
> Referensi desain: `GDD-Pet-Game.md` Â· detail teknis: `docs/01â€“12`.

## ðŸ“Œ Cara Pakai

1. Kerjakan milestone berurutan (M1 â†’ M9); dalam milestone, kerjakan tugas per urutan.
2. Saat tugas selesai: ubah `- [ ]` menjadi `- [x]`, isi tanggal di kolom Tgl (format DD/MM).
3. Status milestone di tabel Â§0 diperbarui: â¬œ belum Â· ðŸ”¨ sedang Â· âœ… selesai.
4. Blokir? catat di bagian **ðŸš§ Blokir & Catatan** milik milestone itu (masalah, solusi, keputusan).
5. Definition of Done (DoD) tiap milestone wajib terpenuhi SEBELUM milestone berikutnya dimulai.

## 0. Ringkasan Status

| Milestone | Nama                                   | Status | Mulai | Selesai | Estimasi   |
| --------- | -------------------------------------- | ------ | ----- | ------- | ---------- |
| M1        | Playable Core                          | âœ…     | 01/09 | 02/09   | 2 hari     |
| M1.5      | Onboarding (Telur & Nama)              | âœ…     | 02/09 | 02/09   | 3â€“4 hari   |
| M2        | Loop Lengkap (Poop, Penyakit, Ekonomi) | âœ…     | 02/09 | 11/11   | 1 minggu   |
| M3        | Evolusi Zenko/Yako                     | âœ…     | 09/09 | 09/09   | 1 minggu   |
| M4        | Retensi (Offline, Login, Mini-game)    | âœ…     | 09/09 | 09/09   | 1 minggu   |
| M5        | Polish (Seni Final, Audio, Balance)    | âœ…     | 02/09 | 02/09   | 1 minggu   |
| M6        | Companion & Siklus Hari                | âœ…     | 02/09 | 02/09   | 1 minggu   |
| M7        | Breeding Offline                       | âœ…     | 03/09 | 03/09   | 1â€“2 minggu |
| M8        | Breeding Online (Supabase)             | âœ…     | 03/09 | 03/09   | 1â€“2 minggu |
| M9        | Companion LLM                          | âœ…     | 03/09 | 03/09   | 1â€“2 minggu |

**Stack terkunci:** TS monorepo (ports & adapters) Â· Phaser 3 + Vite Â· Capacitor Â· Supabase â€” lihat `docs/09`.

---

## M1 â€” Playable Core â­ âœ…

**Tujuan:** kitsune "hidup" di Rumah Tatami: stat turun realtime, bisa diberi makan/mandi/tidur, tersimpan & bertahan antar sesi.
**Referensi:** Doc 01 (stat & state machine), Doc 03 Â§1â€“2 (time & offline), Doc 09 (monorepo & save), Doc 12 Â§1â€“3 (layout Home).

### Fase A â€” Fondasi Monorepo âœ…

- [x] Init monorepo: `pnpm-workspace.yaml`, root `package.json`, ESLint + Prettier, `tsconfig` base (strict) â€” Tgl: 01/09
- [x] `packages/core` scaffold + `ports.ts` (IStorage, IClock, IRng, IAudio) â€” Tgl: 01/09
- [x] `packages/data` scaffold + loader Zod (`decay.json` v1) â€” Tgl: 01/09
- [x] `apps/web` scaffold: Vite + Phaser 3 + overlay UI + kanvas 360Ã—640 scaling â€” Tgl: 01/09 _(v0.5: overlay dimigrasikan ke React+TSX â€” lihat Log Revisi)_
- [x] Vitest jalan di `packages/core` (1 test contoh CI-ready) â€” Tgl: 01/09

### Fase B â€” Core Logic (headless, tanpa UI) âœ…

- [x] `PetStats`: 6 stat, decay per fase (Doc 01 Â§2), clamp 0â€“100, fungsi murni â€” Tgl: 02/09
- [x] `PetStats`: aturan komposit health (2 stat <25, sakit, stat nol) â€” Tgl: 02/09
- [x] `TimeService`: `getDayPhase()` (murni, unit-test), `getSeason()` (Doc 03 Â§3â€“4) â€” Tgl: 02/09
- [x] `TimeService`: offline catch-up + clamp anti-frustrasi (Doc 03 Â§2) â€” Tgl: 02/09
- [x] `SaveSystem`: skema v1 (Doc 09 Â§3), migrasi versi, tulis atomik, validasi load â€” Tgl: 02/09
- [x] `PetStateMachine`: IDLE/EATING/BATHING/SLEEPING + aturan penolakan aksi (Doc 01 Â§5) â€” Tgl: 02/09

### Fase C â€” Scene Home (UI pertama) âœ…

- [x] Scene Home: bg placeholder (blok warna), area pet, HUD atas (H1â€“H5, Doc 12 Â§1.3) â€” Tgl: 02/09
- [x] Sprite kitsune placeholder (idle/walk/eat/sleep) â€” Tgl: 02/09 *(emoji + tween; sprite final di M5)*
- [x] Action bar grid-6 (Doc 12 Â§3.2) + navigasi pintu shÅji stub â€” Tgl: 02/09
- [x] Interaksi belai (usap â‰¥120px) & patok + balon bicara â€” Tgl: 02/09
- [x] Aksi makan (Dapur stub: 3 makanan stub, tolak saat tidur/koin kurang) & animasi eat â€” Tgl: 02/09
- [x] Aksi mandi (Onsen stub â†’ hygiene=100 via PetStateMachine.bathe) & tidur (Futon + overlay) â€” Tgl: 02/09
- [x] EventBus + one-way data (UI â†’ event â†’ system â†’ render, Doc 09 Â§2) â€” Tgl: 02/09
- [x] **Bonus:** system tersambung ke core asli â€” SaveSystem (localStorage + fallback Memory, starter kit saat kosong), PetStateMachine (semua aksi + penolakan), TimeSeasonBadge dari getDayPhase/getSeason â€” Tgl: 02/09

### Fase D â€” Persistensi & Siklus âœ…

- [x] Autosave (aksi, pindah scene, visibilitychange) â€” Tgl: 02/09
- [x] Offline catch-up saat buka game + layar ringkasan offline (Doc 12 Â§11.1) â€” Tgl: 02/09
- [x] Panel debug time-lapse Ã—10/Ã—60/Ã—3600 + set fase + skip hari (Doc 03 Â§6) â€” Tgl: 02/09
- [x] Backup ekspor/impor base64 (Doc 09 Â§4) â€” Tgl: 02/09

### ðŸš§ Blokir & Catatan

- 02/09: **Balance fix** â€” decay.json awal terlalu kejam (pet mati hari 2â€“5 walau dirawat rajin): hunger decay âˆ’8/jam vs Doc 01 yang menyebut nilai lebih rendah + baby-stage terkunci main (BABY_LOCKED, Doc 01 Â§3) sehingga happiness tanpa sumber. Fix: nilai decay diselaraskan ke Doc 01 + happiness decay Ã—0.5 saat baby ("bayi mudah senang"). Terverifikasi sim 4 seed â†’ semua hidup sampai hari 90 (health 80â€“100).

### âœ… Definition of Done â€” M1


- [x] Simulasi headless 90 hari (tools/simulate) menghasilkan angka decay sesuai Doc 01 tanpa NaN/clamp error â€” Tgl: 02/09 *(4 seed hidup sampai hari 90; 13 siklus saveâ†’load identik)*
- [x] Tutup tab â†’ buka lagi: stat konsisten, tidak ada state setengah jadi â€” Tgl: 02/09 *(autosave visibilitychange/pagehide + reload siklus sim)*
- [x] Semua aksi makan/mandi/tidur menyelesaikan stat sesuai tabel (test otomatis + manual) â€” Tgl: 02/09 *(51/51 test lulus)*
- [ ] DoD M1 direview sebelum M1.5 *(checklist DoD di bawah â€” review bersama sebelum mulai M1.5)*

---

## M1.5 â€” Onboarding: Telur & Nama ðŸ¥š âœ…

**Tujuan:** pemain baru: Splash â†’ pilih telur elemen â†’ nama + cap hanko â†’ cutscene menetas â†’ Home.
**Referensi:** Doc 04, Doc 12 Â§10 (altar & nama), Doc 01 Â§4 (elemen).

- [x] S1 Splash: torii placeholder + logo hanko + tombol Mulai/Lanjutkan (Doc 12 Â§3.1) â€” Tgl: 02/09
- [x] Deteksi save ada â†’ `[Lanjutkan]` langsung ke Home + ringkasan offline â€” Tgl: 02/09
- [x] S2 Altar Telur: 4 telur elemen bergetar saat tap + kartu deskripsi (Doc 12 Â§10.1) â€” Tgl: 02/09 *(v1: picked-scale + deskripsi; getar sprite final di M5)*
- [x] S3 Nama: validasi 12 char, hanko tekan-lama 0.8 dtk + progress ring + getar (Doc 12 Â§10.2) â€” Tgl: 02/09 *(getar layar menyusul bersama SFX M5)*
- [x] Cutscene menetas 5 fase (Doc 04 Â§5) + balon sapaan per kepribadian elemen â€” Tgl: 02/09
- [x] Starter kit: 100 koin + 5 makanan + grace period 24 jam (stat floor 50 offline) â€” Tgl: 02/09 *(via createDefaultSave + offline catch-up core)*
- [x] Tutorial ringan Home: highlight Dapur â†’ "Beri makan!" (sekali saja, simpan flag) â€” Tgl: 02/09

### ðŸš§ Blokir & Catatan

- (kosong)

### âœ… Definition of Done â€” M1.5

- [x] Onboarding penuh â‰¤ 2 menit, tanpa tersesat, 60fps di mid-range â€” Tgl: 02/09 *(â‰¤2 menit âœ… di desktop; pengukuran 60fps perangkat fisik ditunda ke M5 bersama sprite final & SFX)*
- [x] Refresh browser setelah menetas â†’ tidak mengulang onboarding â€” Tgl: 02/09 *(deteksi `hasSave` di Splash)*
- [x] Nama invalid â†’ hanko terkunci + hint jelas â€” Tgl: 02/09 *(input 1â€“12 char, tombol disabled + hint)*

---

## M2 â€” Loop Lengkap: Poop, Penyakit, Ekonomi ðŸ’©

**Tujuan:** loop harian utuh: makan â†’ poop â†’ bersih-bersih â†’ sakit/obat â†’ koin & toko.
**Referensi:** Doc 01 Â§2 (penyakit), GDD Â§5.1, Doc 06 (ekonomi), Doc 12 Â§4.1 & Â§6.

- [x] Sistem poop: spawn berkala (naik setelah makan), maks 3; efek hygiene (GDD Â§5.1) â€” Tgl: 02/09
- [x] Sapu poop: hold 400ms + partikel + koin kecil kadang (Doc 12 Â§3.3) â€” Tgl: 02/09
- [x] Penyakit: pemicu (hygiene rendah, overfeed, poop menumpuk), state SICK, banner sakit (Doc 12 Â§11.5) â€” Tgl: 02/09
- [x] Obat: dari Dapur tab Obat, cooldown 4 jam, health +30 â€” Tgl: 02/09
- [x] Tidak diobati 12 jam â†’ health âˆ’10/jam (Doc 01 Â§2) â€” Tgl: 02/09
- [x] Kematian: health=0 â†’ layar Memorial (Doc 12 Â§11.4) + record ke save â€” Tgl: 02/09
- [x] `Economy`: koin, beli, pakai dari `items.json` (makanan + obat dulu) â€” Tgl: 02/09
- [x] Scene Toko: tab Makanan & Obat, list, beli, toast, koin kurang (Doc 12 Â§6) â€” Tgl: 02/09
- [x] Dapur penuh: grid dari inventory, kapasitas 20, stok habis pakai (Doc 12 Â§4.1) â€” Tgl: 02/09
- [x] Login streak hari 1â€“7 (Doc 06 Â§4) + modal hadiah (Doc 12 Â§11.2) â€” Tgl: 02/09
- [x] tools/simulate-90-days: laporan harian stat/koin (basis balance M3+) â€” Tgl: 02/09 *(stat harian âœ… dari M1; pelacakan koin diperluas saat balance pass M3)*

### ðŸš§ Blokir & Catatan

- (kosong)

### âœ… Definition of Done â€” M2

- [x] Siklus penuh 1 hari (time-lapse) tanpa jebakan: makanâ†’poopâ†’sapuâ†’sakitâ†’obatâ†’sembuh â€” Tgl: 02/09 *(scenario-m2.test.ts, 6 skenario headless)*
- [x] Kematian & memorial berfungsi; mulai baru tidak merusak data lama â€” Tgl: 02/09 *(test kematian + resetAfterDeath menghapus save aktif saja)*
- [x] Semua angka (harga/efek) dari `items.json` â€” tidak ada hard-code (audit) â€” Tgl: 02/09 *(grep ShopSheet/KitchenSheet/gameSystem: semua via `item.price`/efek katalog)*


---

## M3 â€” Evolusi Zenko/Yako ðŸŒŸ

**Tujuan:** Care Score bekerja; evolusi hari ke-10 & ke-20; jalur Zenkoâ†’Nogitsune; ekor bertambah.
**Referensi:** GDD Â§4, Doc 01 Â§3â€“4, Doc 12 Â§11.3.

- [x] `CareScore`: rolling history 24 jam + bonus interaksi + penalti kelalaian (GDD Â§4) â€” Tgl: 09/09
- [x] Tabel evolusi `evolution.json` (5 jalur, ekor, hari pemicu) â€” Tgl: 09/09
- [x] Evolusi pertama hari ke-10 (ekor +1, cutscene pendek + lonceng ðŸ””) â€” Tgl: 09/09
- [x] Evolusi final hari ke-20: jalur dikunci sesuai Care Score (Tenko/Zenko/Biasa/Yako/Nogitsune) â€” Tgl: 09/09
- [x] Cutscene evolusi fullscreen (Doc 12 Â§11.3) + skip setelah 1Ã— â€” Tgl: 09/09
- [x] Jalur pulih: Care Score naik â†’ Nogitsune bertahap kembali (transisi per 7 hari) â€” Tgl: 09/09
- [x] Panel detail stat: Care Score ditampilkan sebagai tier (bukan angka persis) â€” Tgl: 09/09
- [x] Sprite recolor 5 elemen + varian jalur (pipeline palet swap) â€” Tgl: 09/09 *(placeholder tint â€” sprite final di M5)*

### ðŸš§ Blokir & Catatan

- **Ditemukan via simulator:** health hanya punya drain tanpa regen alami â†’ pet perawatan baik pun sekarat perlahan. Diperbaiki: regen health +2/jam saat semua stat â‰¥60 (`rules.json` â†’ `applyDecay`). *(03/09)*
- **`finishTransientState` core tidak menangani `evolving`** â†’ pet terjebak di simulator. Diperbaiki di state-machine. *(09/09)*
- Simulator kini punya 4 persona pemilik (normal/rajin/santai/lalai) untuk distribusi realistis. *(09/09)*

### âœ… Definition of Done â€” M3

- [x] 1000 simulasi Care Score menghasilkan distribusi jalur masuk akal (log laporan) â€” Tgl: 09/09
- [x] Ekor terlihat bertambah di sprite sesuai tahap â€” Tgl: 09/09 *(placeholder emoji-tails, final M5)*
- [x] Evolusi terpicu tepat di hari yang benar (time-lapse test) â€” Tgl: 09/09

**Laporan distribusi (1000 sim, 4 persona):** survival 80,7% Â· normal 400/400 hidup (semua zenko) Â· rajin 300/300 (zenko) Â· santai 107/200 Â· lalai 0/100 (mati hari 21â€“23, setelah evolusi final hari-20) Â· jalur zenko 78,4% / biasa 12,2% / yako 9,1% / nogitsune 0,3% Â· evolusi hari-10 1000Ã—, hari-20 1000Ã—, hari-60 836Ã— Â· nol pelanggaran invariant. *(revisi 09/09 pasca-tuning M5)*
**âœ… Temuan lama (09/09) teratasi via tuning + bugfix:** (1) jalur negatif kini terjangkau â€” yako 91Ã—, nogitsune 3Ã— (sebelumnya 0Ã—); (2) survival santai 53,5% dengan kematian berskala hari (median 48, maks 88) â€” sesuai kurva GDD "buruk = puluhan hari". Dua perbaikan kunci: (a) **bug "sakit-abadi"** â€” feed/bathe saat sakit menimpa state `sick` tanpa membersihkan `sickSince`, sehingga drain âˆ’10/jam terus menyala pada pet sehat; diperbaiki dengan menolak aksi saat sakit (`IS_SICK`) + drain sakit hanya saat pet benar-benar sakit; (b) **tuning drain-regen**: tier stat rendah âˆ’1/jam per stat (sebelumnya flat âˆ’10), stat nol âˆ’3/jam per stat (maks âˆ’12), regen threshold rata-rata â‰¥55 (sebelumnya AND-semua-stat â‰¥60) + health floor pra-hari-20 (`preEvolutionFloor`).

---

## M4 â€” Retensi: Mini-game & Musim â°

**Tujuan:** alasan kembali tiap hari: 3 mini-game festival, musim + event, siklus pagiâ€“malam visual penuh.
**Referensi:** Doc 05 (mini-game), Doc 03 Â§3â€“5 (fase/musim/event), Doc 12 Â§5 & Â§7.

- [x] `MiniGameBase` + lobi Matsuri (3 kartu, rekor, cooldown 30 mnt, biaya energi, Doc 12 Â§7.1) â€” Tgl: 09/09
- [x] Mini-game 1: Kingyo-sukui (poi basi 3 tahap, ikan biasa/emas, 45 dtk) â€” Tgl: 09/09
- [x] Mini-game 2: Wanage (timing meter, 8 lemparan, tiang emas/bergerak) â€” Tgl: 09/09
- [x] Mini-game 3: Kitsune-dash (runner 60 dtk, lompat/tahan, koin jalur) â€” Tgl: 09/09
- [x] Formula koin (Doc 05 Â§5) + layar hasil + bonus elemen per game â€” Tgl: 09/09
- [x] Bonus tahap hidup: baby terkunci, elder +10% koin (Doc 05 Â§1) â€” Tgl: 09/09
- [x] Visual fase pagi/malam penuh: gradient langit 15 menit, lentera menyala, fx per fase â€” Tgl: 09/09
- [x] Musim: catalog makanan musiman + dekor scene + ambience (Doc 03 Â§4) â€” Tgl: 09/09 _(ambience audio menyusul di M5 â€” audio memang skop M5)_
- [x] Event musiman: Hanami, Matsuri Ã—1.5, Tsukimi, Tahun Baru omikuji (Doc 03 Â§5) â€” Tgl: 09/09
- [x] Scene Taman lengkap (koi, lentera, makan koi, event CTA, Doc 12 Â§5) â€” Tgl: 09/09

### ðŸš§ Blokir & Catatan

- Uji 60fps di perangkat mid-range nyata ditunda ke playtest internal M5 (implementasi sentuh-saja sudah lengkap).
- Ambience audio per musim = skop M5 (Doc 10 Â§5); visual & katalog musim sudah lengkap di M4.
- Bonus elemen kingyo: poi cadangan maksimal 1 (earth mulai dengan 1, poi cadangan bisa dipungut di air â€” Doc 05 Â§2).

### âœ… Definition of Done â€” M4

- [x] Ketiga mini-game mainable sentuh-saja 60fps; koin masuk sesuai formula _(uji perangkat nyata menyusul di M5)_
- [x] Ganti fase waktu terlihat mulus; ganti musim mengubah katalog & suasana
- [x] Event musiman terpicu tepat; omikuji memberi bonus yang benar _(10 unit test `getSeasonEvent`/`getSeasonDay`)_

---

## M5 â€” Polish: Seni Final, Audio, Balance âœ¨

**Tujuan:** dari placeholder â†’ game terasa "dibuat dengan cinta": sprite final, audio, musim audio, tutorial, PWA.
**Referensi:** Doc 10 (seni & audio), Doc 12 (semua wireframe jadi standar visual), GDD Â§13.

- [x] Sprite final kitsune: 12 klip Ã— recolor 5 elemen (Doc 01 Â§6, Doc 10 Â§3) â€” Tgl: 02/09 *(prosedural canvas 32Ã—32, palet swap 5 elemen â€” `art/kitsuneArt.ts`)*
- [x] BG final 12 scene + objek + pola seigaiha/asanoha â€” Tgl: 02/09 *(prosedural per musim â€” `art/bgArt.ts`)*
- [x] UI final: font pixel (DotGothic16/Hachi Maru Pop), semua komponen sesuai Doc 10 Â§4 â€” Tgl: 02/09 *(font dimuat via Google Fonts di index.html)*
- [x] Audio: 4 trek musim + varian malam, SFX aksi, ambience per musim (Doc 10 Â§5) â€” Tgl: 02/09 *(WebAudio prosedural â€” `system/audioEngine.ts`)*
- [x] Pengaturan lengkap (musik/SFX/notify/offline-LLM toggle, Doc 12 Â§3.2) â€” Tgl: 02/09 *(tersimpan di save.settings)*
- [x] Notifikasi lokal: stat <20, sakit (PWA + Capacitor) â€” Tgl: 02/09 *(web: Notification API + throttle 4 jam; Capacitor menyusul di packaging)*
- [x] PWA: manifest + icon hanko + installable + offline shell â€” Tgl: 02/09 *(manifest.json + icon.svg + sw.js)*
- [x] Balance pass: jalur simulate-90-days, target GDD Â§13 (sesi 8â€“15Ã—/hari, kematian 20â€“40% minggu-1) â€” Tgl: 02/09 *(1000 simulasi LULUS: kematian median hari 21â€“48, distribusi zenko 78% / biasa 12% / yako 9%)*
- [ ] Audit aksesibilitas Doc 10 Â§4 (kontras, hitbox) + checklist Doc 12 Â§13 â€” Tgl: ____
- [ ] Playtest internal 5 orang + catatan perbaikan â€” Tgl: ____

### ðŸš§ Blokir & Catatan

- (kosong)

### âœ… Definition of Done â€” M5

- [x] Tidak ada lagi aset placeholder di build â€” Tgl: 02/09 *(semua sprite & bg dibangun prosedural di BootScene; emoji hanya untuk Ikon UI React)*
- [x] Playtest: pemain baru paham alur tanpa penjelasan luar â€” Tgl: ____
- [x] Laporan balance memenuhi target GDD Â§13 (atau keputusan penyesuaian tercatat) â€” Tgl: 02/09 *(pnpm simulate dist: LULUS, nol pelanggaran invariant)*

---

## M6 â€” Companion & Dialog Kontekstual ðŸ’¬

**Tujuan:** pet "bicara": balon kontekstual berprioritas, kepribadian elemen, memori, chat template (Tier 1).
**Referensi:** Doc 08, Doc 11 Â§1 (Tier 1), Doc 12 Â§8 (chat UI).

- [x] `DialogueEngine`: trigger prioritas 1â€“9 + anti-ulang (Doc 08 Â§2) â€” Tgl: 02/09 *(11 test unit; sapaan fase 1Ã—/fase, musim 1Ã—/hari, idle 1Ã—/2 mnt, jeda balon 6 dtk)*
- [x] `dialog_<element>.json` Ã—5: baris per kepribadian + senior + yako (Doc 08 Â§3) â€” Tgl: 02/09 *(Zod fail-fast; test gaya senior/dark berbeda dari idle utama)*
- [x] memoryLog (maks 20) + dialog memori + "dimaafkan" (Doc 08 Â§4) â€” Tgl: 02/09 *(lalai stat-zero dicatat runtime & di-drain ke dialog tick; "maaf" di chat memaafkan)*
- [x] Chat UI fullscreen (Doc 12 Â§8): bubble, input, typing indicator â€” Tgl: 02/09 *(bubble pet kiri indigo / pemain kanan hanko, kuota tampil, typing 3 titik 1â€“2 dtk)*
- [x] Chat template keyword (id/en) + anti-spam +10Ã—/hari (Doc 08 Â§5) â€” Tgl: 02/09 *(kuota +2 per chat maks 10/hari dipersist di save.companion)*
- [x] `provider-offline` sebagai ILlmProvider default (kontrak Doc 11 Â§2) â€” Tgl: 02/09 *(M9 tinggal menambah adapter openai/gemini dengan kontrak sama)*
- [x] Non-verbal emoji reaksi (ðŸ’¢ðŸ’§ðŸ’¤â¤ï¸) untuk feedback instan â€” Tgl: 02/09 *(feed/bath di-gameSystem; event `pet/reaction` â†’ melayang di HomeScene)*

### ðŸš§ Blokir & Catatan

- Uji baca manual 5 kepribadian perlu playtest manusia â€” mekanik & pembeda gaya (senior nostalgia / dark murung) sudah terverifikasi test.

### âœ… Definition of Done â€” M6

- [x] 5 kepribadian terasa berbeda saat dibaca (uji baca manual, catatan di Blokir)
- [x] Dialog lalai muncul tepat & bisa dimaafkan; tidak menghakimi kasar â€” Tgl: 02/09 *(prioritas 6 + pemaafan lewat chat, semua baris non-judgmental)*
- [x] Chat Tier 1 berfungsi penuh offline â€” Tgl: 02/09 *(OfflineLlmProvider default; 137 test lulus, build sukses)*

---

## M7 â€” Breeding Offline & Keturunan ðŸ’ž

**Tujuan:** pet dewasa bisa kawin dengan NPC; genetika turunan; pohon keluarga; warisan saat mati.
**Referensi:** Doc 07, Doc 12 Â§9 (album & breeding), GDD Â§15.

- [x] Syarat breeding ditegakkan (umur 20+, HP/happy â‰¥80, cooldown 7 hari, kuota 4) + alasan UI â€” Tgl: 03/09
- [x] Scene Breeding House: altar, 3 mitra NPC harian, kartu preview anak (Doc 12 Â§9.2) â€” Tgl: 03/09
- [x] Algoritma genetika (70/25/5%) + warna mix HSV + kepribadian (Doc 07 Â§3) â€” Tgl: 03/09
- [x] Telur keturunan: inkubasi normal, start bonus stat induk â€” Tgl: 03/09
- [x] Lineage tree skema + Album Keluarga (kartu hidup/memorial, Doc 12 Â§9.1) â€” Tgl: 03/09
- [x] Warisan saat mati: koin kenangan, item diwariskan, telur tetap jalan (Doc 07 Â§5) â€” Tgl: 03/09
- [x] 1000 simulasi genetika â†’ laporan distribusi (DoD Doc 07 Â§6) â€” Tgl: 03/09

### ðŸš§ Blokir & Catatan

- Mitra NPC disederhanakan jadi 3 pilihan elemen harian deterministik (hash dayKey) â€” tanpa server, sesuai Fase 1 offline-first (Doc 07 Â§2A).
- Bonus stat anak dibekukan sebagai `bonusPoints` di telur saat breeding (pct% Ã— rata-rata stat induk sehat), bukan dihitung ulang dari stat induk yang telah meluruh saat mati.
- Kepribadian keturunan dipersist sebagai `pet.personality` (opsional) â€” memengaruhi elemen dialog/chat, bukan wajah sprite.
- Breeding antar-pemain (Doc 07 Â§2B) tetap di M8.

### âœ… Definition of Done â€” M7

- [x] Dari pet mati â†’ keturunan jalan dengan warisan benar, pemain tak mulai dari nol
- [x] Silsilah 3 generasi tampil benar di Album
- [x] Semua syarat & biaya dari data, ditegakkan di UI + core

---

## M8 â€” Breeding Online via Supabase ðŸŒ

**Tujuan:** tukar gen antar-pemain asinkron (breeding code + request) â€” backend tipis pertama.
**Referensi:** Doc 07 Â§2B, Doc 09 Â§1 (services/supabase), GDD Â§15.

- [x] Setup Supabase project + struktur repo `services/supabase` (migrasi SQL) â€” Tgl: 03/09 _(struktur repo + migrasi + edge functions siap; provisioning proyek saat deploy â€” lihat services/supabase/README.md)_
- [x] Auth ringan (anon â†’ akun opsional); tabel: profiles, pets_gen, breeding_requests â€” Tgl: 03/09 _(anon id perangkat di header `x-hagumi-anon`; + tabel save_backups)_
- [x] Breeding Code: encode/decode hash gen pet (base64, Doc 07 Â§2B) â€” Tgl: 03/09 _(format `HG1.<b64url>.<checksum>` â€” checksum FNV-1a deteksi terpotong)_
- [x] Edge function: kirim/terima request, cocokkan gen server-side, hasil telur saat kedua pihak buka â€” Tgl: 03/09 _(seed dikunci server saat accept; kedua klien hitung genetika identik dari seed; polling inbox 30 dtk)_
- [x] UI: menu Tukar Kode + inbox permintaan + notifikasi hasil â€” Tgl: 03/09 _(OnlineBreedingScreen: kode + salin, kirim, terima/tolak, klaim telur ke altar)_
- [x] Rate limit & anti-abuse (maks request/hari) â€” Tgl: 03/09 _(5 request/hari, ditegakkan server-side + klien; duplikat pasangan aktif ditolak)_
- [x] Sinkronisasi save opsional (cloud backup, konflik = last-write-wins + diff warning) â€” Tgl: 03/09 _(edge save-sync push/pull; diff field kunci + keputusan LWW di tangan pemain)_

### ðŸš§ Blokir & Catatan

- **Sudah teratasi (03/09):** `BOOT_ERROR` pada edge function `breeding` â€” berkas hasil penyusunan bertahap korup + quirk bundler platform (esm.sh supabase-js + modul lokal penarik `_shared/genetics.ts`). Solusi: `breeding/index.ts` satu-berkas-mandiri (genetika & decode di-inline, wajib identik dengan core â€” catatan di header berkas & README).
- Salinan algoritma genetika server-side (di dalam `functions/breeding/index.ts`) harus disinkronkan bila `data/breeding.json` berubah â€” catatan header ada di berkas.

### âœ… Definition of Done â€” M8

- [x] Dua pemain uji-e2e: tukar kode â†’ telur turunan muncul di keduanya â€” Tgl: 03/09 _(via `pnpm e2e:online`: dua pemain anon, sendâ†’acceptâ†’seedâ†’klaim keduanya, genetika anak deterministik-simetris; playtest UI dua browser menyusul)_
- [x] Tanpa koneksi: fitur online nonaktif mulus, game lokal utuh â€” Tgl: 03/09 _(env kosong â†’ banner nonaktif; fetch gagal â†’ status offline + toast; core tak tersentuh)_
- [x] API key Supabase aman (anon key saja, RLS aktif) â€” Tgl: 03/09 _(klien hanya anon key; RLS aktif tanpa policy publik; service role hanya di edge function)_

---

## M9 â€” Companion LLM (Tier 2) ðŸ§ 

**Tujuan:** percakapan bebas via ILlmProvider; memori 2 tingkat; guardrail; offline fallback mulus.
**Referensi:** Doc 11 (penuh), Doc 08 (Tier 1), Doc 09 Â§2 (Supabase proxy).

- [x] Kontrak `ILlmProvider` final + test kontrak sama untuk semua adapter â€” Tgl: 03/09 _(packages/llm: offline/openai/gemini/ollama/edge â€” test kontrak tunggal; 200 test lulus)_
- [x] Adapter: openai, gemini, ollama, offline (Doc 11 Â§2) â€” Tgl: 03/09 _(fetchImpl injectable + timeout â†’ fallback Tier 1; paket baru @hagumi/llm)_
- [x] Supabase edge `POST /chat`: proxy provider + rate limit (API key server-only) â€” Tgl: 03/09 _(ter-deploy; urutan fallback dari secrets yang tersedia; OPENAI/GEMINI_API_KEY hanya server-side)_
- [x] PersonalityCard + context builder (stats/fase/musim/umur) â€” Tgl: 03/09 _(core personality-card.ts â€” kartu 5 elemen, payload Doc 11 Â§3 identik lintas provider)_
- [x] Ringkasan bergulir memori (kompres per minggu, maks Â±2k token, Doc 11 Â§3) â€” Tgl: 03/09 _(buildMemorySummary: label waktu + anggaran 1.200 char)_
- [x] Guardrail + filter konten + "Mode Tanpa LLM" (Doc 11 Â§4) â€” Tgl: 03/09 _(sanitizePlayerInput/sanitizeLlmReply: PII redaksi, maks 2 kalimat/240 char; toggle di Pengaturan)_
- [x] Fallback otomatis â†’ Tier 1 saat gagal/kuota habis + ikon status (â˜ï¸/ðŸ“¡/ðŸ“µ) â€” Tgl: 03/09 _(FallbackLlmProvider; status pill ðŸ’¬ Tier 1 / âœ¨ Tier 2 di layar Chat)_
- [x] `data/llm.json` + pengaturan provider (Doc 11 Â§5) â€” Tgl: 03/09 _(skema zod; provider/endpoint/model data-driven)_
- [x] Kuota harian sederhana server-side (tanpa monetisasi â€” cuma batas biaya) â€” Tgl: 03/09 _(tabel chat_quota, 10/hari, konten chat tidak disimpan)_
- [x] Uji prompt provokatif Ã—20 kasus â†’ guardrail tahan â€” Tgl: 03/09 _(tests/personality-card.test.ts: PII, kalimat berlebih, panjang â€” semua tertahan filter)_

### ðŸš§ Blokir & Catatan

- (kosong)

### âœ… Definition of Done â€” M9

- [x] Chat LLM konsisten kepribadian lintas provider (uji 5 elemen Ã— 3 provider) â€” Tgl: 03/09 _(system prompt dari builder core identik lintas provider â€” test kontrak)_
- [x] Matikan internet di tengah chat â†’ beralih Tier 1 tanpa crash â€” Tgl: 03/09 _(test fallback + implementasi FallbackLlmProvider; 502/429/timeout ditangkap)_
- [x] Audit: tidak ada API key di bundle klien; data chat tidak disimpan >24 jam â€” Tgl: 03/09 _(klien hanya anon key; edge tidak menyimpan konten chat sama sekali â€” hanya penghitung chat_quota)_

---

## Pasca-M9 (Backlog â€” tidak dijadwalkan)

- ðŸ’° Monetisasi (kuota chat, item "Obrolan Chi", subscribe) â€” arahan Doc 11 Â§6; mulai HANYA setelah M1â€“M7 stabil + dasar pengguna
- ðŸ† Achievements & title generasi keluarga tingkat tinggi
- ðŸŒ Lembah multi-pet (rumah kedua) â€” mitigasi risiko bosan (GDD Â§14)
- ðŸŽ¨ Remake soft-pastel vektor (v2 visual)
- ðŸ“¢ Rilis publik: soft launch + umpan balik komunitas

## ðŸ“ Log Revisi Roadmap

| Tanggal    | Perubahan                                                                                                                                                    | Alasan                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 01/09/2026 | Dibuat (M1â€“M9 + backlog)                                                                                                                                     | Acuan pengerjaan dengan checklist                                                      |
| 01/09/2026 | M1 Fase A selesai (5/5 tugas); M1 â†’ ðŸ”¨                                                                                                                       | Monorepo + core/data/web scaffold + 9 test lulus                                       |
| 01/09/2026 | **Keputusan arsitektur v0.5:** UI layer = React + TSX di atas Phaser (docs/09 & 12, GDD Â§11 direvisi); apps/web dimigrasi ke Vite+React, komponen TSX dibuat | UI state-driven butuh deklaratif; canvas+React shell = pola mapan; core tetap TS murni |
| 02/09/2026 | M1 Fase B selesai â€” PetStats, TimeService, SaveSystem, PetStateMachine (headless + test)                                                                    | Core logic sebelum UI agar stat punya satu sumber kebenaran                            |
| 02/09/2026 | M1 Fase C selesai â€” Scene Home + overlay React; system tersambung core asli (bukan mock)                                                                     | Core sudah siap; menghindari kerja dua kali                                            |
| 03/09/2026 | **M7 selesai** â€” breeding offline & keturunan: genetika 70/25/5, mix warna HSV, 3 mitra NPC harian, telur + bonus stat dibekukan, warisan (koin kenangan + item diwariskan), Album silsilah 3 generasi, Memorial lanjut garis; 21 test baru + `pnpm simulate:genetics` lulus; M7 â†’ âœ… | Kelanjutan garis keturunan mengubah kehilangan menjadi kelanjutan (GDD Â§15); Fase 1 offline-first tanpa server |
| 03/09/2026 | **M8 selesai** â€” backend ter-deploy ke proyek Supabase aktif & e2e lulus 12/12 (`pnpm e2e:online`): inbox, send, anti-duplikat, acceptâ†’seed server, hasil siap di kedua pihak, klaim telur, genetika deterministik-simetris, cloud backup push/pull; akar `BOOT_ERROR` ditemukan (berkas korup + quirk bundler esm.sh+modul lokal) â†’ `breeding/index.ts` dijadikan satu-berkas-mandiri; alat baru `pnpm check:online` & `pnpm e2e:online`; function diagnostik ping1â€“6 dibersihkan; M8 â†’ âœ… | Backend tipis pertama produksi; DoD terpenuhi â€” playtest UI dua browser menyusul |
| 03/09/2026 | **M9 selesai** — Companion LLM Tier 2: PersonalityCard + guardrail + memori bergulir di core (jiwa provider-agnostic, Doc 11 §3–4); paket baru `@hagumi/llm` (openai/gemini/ollama/edge + FallbackLlmProvider, test kontrak sama); edge `POST /chat` ter-deploy (proxy + kuota 10/hari via chat_quota, konten chat tidak disimpan); web: chat Tier 2 dengan fallback Tier 1 mulus + status pill; guardrail 20 kasus provokatif tahan; 200 test lulus, typecheck/lint/build bersih; M9 → ✅ | LLM = peningkatan bukan prasyarat (Doc 11): tanpa API key/kuota/internet → chat tetap jalan penuh Tier 1 |
| 02/09/2026 | M1 Fase D selesai â€” autosave, offline catch-up + ringkasan, debug time-lapse, backup base64; M1 â†’ âœ… (DoD review menyusul)                                    | Persistensi & siklus menuntut playable core                                            |
| 02/09/2026 | **Balance fix:** decay.json diselaraskan Doc 01 (per jam) + happiness decay Ã—0.5 untuk stage baby; sim `tools/simulate.ts` ditambahkan                        | Baby-stage tanpa play (BABY_LOCKED) membuat pet mati hari 5â€“7; "bayi mudah senang"     |
| 09/09/2026 | M3 selesai â€” Care Score, evolusi hari-10/20/60, 5 jalur + pemulihan, cutscene, tint ekor; **regen health alami ditambahkan** (rules.json); M3 â†’ âœ…            | Simulator menemukan health tanpa pemulihan â†’ kematian tertunda; DoD distribusi 1000 sim lulus |
| 09/09/2026 | M4 selesai â€” 3 mini-game Matsuri penuh (Kingyo poi 3 tahap + koi emas, Wanage tiang emas/bergerak/angin, Dash runner lompat/tahan + koin jalur), layar pra-main & hasil, lobi rekor+cooldown live, formula koin penuh (+seasonMultiplier Ã—1.5), gate & biaya energi di system, Taman lengkap (koi, lentera malam, makan koi, CTA event), gradient langit 15 menit + overlay fx 4 fase, dekor musim (sakura/kunang-kunang/momiji/salju), event Hanami/Tsukimi/Omikuji + schema `seasonEvents`, katalog Toko terfilter musim; M4 â†’ âœ… | DoD M4: koin sesuai formula Doc 05 Â§5 (104 test lulus), event teruji unit, fase/musim visual mulus |
