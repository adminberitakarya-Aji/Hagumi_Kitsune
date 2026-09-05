# DOC 16 — Landing Page & Preview Storytelling 🌸

> Sumber: diskusi desain 04/09/2026 — "saat pertama kali user akses game, harus ada halaman
> awal/preview dengan storytelling yang bagus supaya tertarik". Melengkapi Doc 04 (splash &
> onboarding **di dalam** game). Implementasi milestone M10.5.

## 1. Masalah & Tujuan

**Kondisi saat ini:** buka URL → `index.html` langsung memuat bundle game penuh (Phaser + React +
Supabase) → Splash Torii di dalam game. Konsekuensi: (a) tidak ada lapisan emosi sebelum game,
(b) LCP lambat karena ~1MB+ bundle dimuat untuk menampilkan satu layar, (c) peluang funnel & SEO
terbuang.

**Tujuan:** halaman landing storytelling — pengunjung jatuh cinta pada *kisaran* sebelum
menekan tombol; game dimuat HANYA saat diminta.

## 2. Prinsip

1. **"Cerita dulu, tombol kemudian"** — CTA utama baru meminta perhatian setelah momen emosional pertama; tombol "Langsung ke game" selalu tersedia untuk yang terburu-buru.
2. **"Jujur itu pembeda"** — 90 hari, evolusi, kematian, dan warisan diceritakan terbuka. Keberanian menjelaskan kematian = identitas brand *mono no aware*.
3. **"Ringan"** — landing tanpa bundle game; LCP < 1.5 dtk di 4G mid-end; Phaser di-*code-split*.
4. **"Bisa diukur"** — funnel landing_view → scroll_depth → cta_click → ftue_step (kontrak event siap untuk M16).

## 3. Struktur Storytelling — 6 Babak (scroll-driven)

| Babak | Visual | Narasi inti |
| ----- | ------ | ----------- |
| 1 — Torii & Senja | Key art kitsune siluet di gerbang torii, sakura jatuh pelan | _"Malam ini, seekor rubah kecil sedang lahir."_ |
| 2 — Ia Hidup | Jam real-time berdetak; kit kecil makan/tidur mengikuti jam sungguhan | _"Ia hidup walau kamu pergi. Makan saat kamu sarapan. Tidur saat kamu tidur."_ |
| 3 — 90 Hari | Ekor bertambah 1 → 9 seiring scroll; siluet Zenko vs Yako | _"Rajin atau lalai — ia menjadi Zenko... atau Yako. Kau yang menentukan."_ |
| 4 — Kepergian | Senja, batu nisan kecil, bunga; telur keturunan menetas | _"Suatu hari ia akan pergi. Tapi cintanya tinggal — dalam keturunannya." ← babak keberanian brand_ |
| 5 — Bukan Sekadar Stat | Cuplikan: chat (LLM), breeding code, matsuri | _"Ia mengingatmu. Ia bicara padamu. Ia punya keluarga."_ |
| 6 — CTA: Buka Altar | Tombol hanko besar + install PWA | _"Buka Altar"_ → memuat game (lazy) → splash Torii in-game (Doc 04 §1) |

### 3.1 Storyboard Detail — Siap Produksi (panel per babak)

> Format: Komposisi · Gerak · Copy · Interaksi · Aset · Transisi. Waktu baca total ≤ 1 menit.
> Semua copy disimpan siap-i18n (M18); copy final direview sesuai checklist M10.5 ("jujur tanpa mendramatisasi").

**Babak 1 — Torii & Senja** (0–10 dtk)
- Komposisi: full-bleed langit senja (gradient washi→indigo `#3D4A6B`), siluet torii hanko `#C1443C` di tengah, kitsune kecil bersiluet duduk di bawahnya, 8–12 butir sakura jatuh pelan; logo HAGUMI 育み (pixel font) di atas torii.
- Gerak: matahari turun perlahan; sakura makin deras saat scroll dimulai; kuping kitsune bergerak tiap ±4 dtk (sinyal hidup).
- Copy: headline **"Malam ini, seekor rubah kecil sedang lahir."** · sub: "HAGUMI (育み) — merawat dengan penuh perhatian."
- Interaksi: indikator scroll (chevron denyut halus); **tombol "Langsung ke game" tersedia sejak babak 1** (pojok kanan-atas — prinsip skip, Doc 16 §2.1).
- Aset: `bg_landing_dusk`, torii, siluet kitsune, partikel sakura.
- Transisi: wipe vertikal lembut `--ease-washi`.

**Babak 2 — Ia Hidup** (10–25 dtk)
- Komposisi: split — kiri rumah tatami miniatur (slice scene Home), kanan jam digital besar menampilkan **jam sungguhan perangkat pengunjung** (HH:MM real-time).
- Gerak: kit berjalan bolak-balik dalam frame miniatur; membaca jam user: pagi → ia makan, malam → ia rebah. (Ini keajaiban babak: page-nya menjalankan prinsip game secara sungguhan.)
- Copy: **"Ia hidup walau kamu pergi."** · "Ia makan saat kamu sarapan. Tidur saat kamu tidur. Waktu ini bukan hiasan — ini nyata."
- Interaksi: tap jam → tooltip "waktu di perangkatmu".
- Aset: sprite kitsune mini (reuse 12 klip M10), frame tatami.
- Transisi: kamera zoom-in ke ekor kit → babak 3.

**Babak 3 — 90 Hari** (25–40 dtk)
- Komposisi: latar washi bersih; timeline horizontal hari-1 → hari-90; ekor tergambar bertambah 1→9 mengikuti posisi scroll (SVG/kanvas garis).
- Gerak: scroll = waktu; tiap ~10 hari ekor +1; di hari-60 timeline bercabang: atas siluet **Zenko** putih berkilau, bawah siluet **Yako** gelap.
- Copy: **"Rajin atau lalai — ia menjadi Zenko (善狐)… atau Yako (野狐)."** · "Tidak ada undo. Itulah yang membuat setiap hari berarti."
- Interaksi: slider hari (drag 1–90) untuk melihat ekor bertambah.
- Aset: siluet evolusi ×2, garis timeline, ikon ekor 9 tahap.
- Transisi: cabang Yako menggelap → fade ke babak 4.

**Babak 4 — Kepergian** (40–55 dtk)
- Komposisi: senja dalam; batu nisan kecil (96×112, sesuai Memorial Doc 12 §11.4) di padang rumput, satu tangkai sakura; setelah 3 dtk → telur kecil menetas hangat di sisi lain frame.
- Gerak: kelopak jatuh satu per satu, sangat lambat; nisan cross-fade ke cahaya hangat telur.
- Copy: **"Suatu hari, ia akan pergi."** · "Tapi cintanya tidak. Ia tinggal — dalam keturunan yang kau rawat selanjutnya." · catatan kecil: "HAGUMI jujur padamu: di sini, kehilangan adalah bagian dari sayang."
- Interaksi: **tanpa tombol 3 detik pertama** (momen hening — disiplin yang sama dengan layar Memorial; jangan mendramatisasi berlebihan).
- Aset: nisan, telur, bunga.
- Transisi: cahaya hangat naik → babak 5.

**Babak 5 — Bukan Sekadar Stat** (55–70 dtk)
- Komposisi: grid 3 kartu washi miring 2°: 💬 chat (bubble "Kamu lupa memberiku makan kemarin…"), 🦊 breeding code `HG1.…`, 🎇 matsuri (kingyo-sukui).
- Gerak: kartu masuk bergantian saat scroll; bubble chat mengetik sendiri (efek typewriter).
- Copy: **"Ia mengingatmu. Ia bicara. Ia punya keluarga."** · sub: "Dan keluargamu bisa bertemu keluarga pemain lain."
- Interaksi: tap kartu → micro-preview fitur.
- Aset: mockup UI (screenshot final dari build — update saat M10 selesai).
- Transisi: kartu menumpuk menjadi satu → CTA.

**Babak 6 — Buka Altar** (70 dtk+)
- Komposisi: altar telur 4 elemen (dari Doc 04 §2) mengambang di langit malam berbintang; CTA hanko besar di bawahnya.
- Gerak: telur bergetar pelan; CTA "bernapas" (scale 1.00↔1.03); klik → layar senja terang → memuat game dengan progress **"menyalakan lentera…"** (bukan spinner generik).
- Copy: CTA **"Buka Altar"** · kecil: "Gratis · Jalan di browser · Pet-mu hidup 90 hari sungguhan."
- Interaksi: CTA → lazy-load game → splash Torii (Doc 04 §1); pemain dengan save → tombol otomatis berubah "Lanjutkan Perjalanan".
- Aset: altar, 4 telur, bintang.
- Transisi: masuk game — tanpa flash (DoD).

**Catatan produksi storyboard:**
- Responsif: mobile 360px = vertikal penuh (desain utama); desktop = babak 2–5 boleh split-panel lebar.
- Babak 2 & 3 memakai sprite/siluet dari game (satu sumber aset, M10) — landing dan game terasa dunia yang sama.
- Semua animasi hilang anggun di `prefers-reduced-motion` (versi statis penuh, DoD).

## 4. Spesifikasi Teknis

- **Komponen `LandingPage.tsx` terpisah** — TIDAK mengimpor PhaserHost/game module; game di-*code-split* (`React.lazy` / dynamic import) dan hanya dimuat saat CTA diklik.
- Routing ringan: path default = landing; `#/play` / klik CTA → game (pemain dengan save: tombol "Lanjutkan" di landing langsung ke game).
- Aset: key art + 3–4 ilustrasi dari M10 (belum ada → placeholder bergaya Doc 10 diizinkan, diganti saat M10 selesai).
- Animasi: CSS scroll-driven / IntersectionObserver; **`prefers-reduced-motion` → statis**.
- SEO & share: meta description, `og:image` (screenshot scene final), `og:title` — prasyarat share organik.
- Audio: opsional, HANYA setelah interaksi (kebijakan autoplay — Doc 10 §5); off by default.
- Event (kontrak untuk M16): `landing_view`, `landing_scroll_{25,50,100}`, `landing_cta_click`, `landing_install_prompt`.

## 5. Acceptance Criteria

- [ ] LCP < 1.5 dtk (4G, mid-end); **nol byte bundle game dimuat sebelum CTA** (audit network)
- [ ] CTA → splash in-game mulus tanpa flash/blank; pemain dengan save bisa langsung "Lanjutkan"
- [ ] 6 babak terasa sebagai SATU cerita (uji baca manual); durasi baca ≤ 1 menit
- [ ] Skip selalu tersedia; `prefers-reduced-motion` menghasilkan versi statis penuh
- [ ] Event funnel terkirim (verifikasi penuh saat M16 hidup)
- [ ] og:image & meta valid (uji share preview WhatsApp/X)
