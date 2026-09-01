# DOC 04 — Onboarding: Splash → Telur → Nama → Menetas 🥚

> Sumber desain: GDD §8.1, Doc 02 S1–S3. Alur paling emosional di game — dikerjakan dengan detail.

## 1. Alur Lengkap

```
[S1 Splash] --tombol Mulai--> [S2 Altar Telur] --pilih telur--> [S3 Nama] --cap hanko--> [S4 Menetas] --> [S12→ S4 Home]
```

Kunjungan kedua (save ada): Splash → langsung `[Lanjutkan]` → Home + layar ringkasan offline.

## 2. S1 — Splash Torii

- Durasi minimal 1.2 s; logo "HAGUMI 育み" muncul dengan efek **stempel hanko** (menekup + getar kecil + bunyi cap).
- Sakura partikel 15–20 butir jatuh; ketuk layar menambah 40 butir.
- `[Mulai]` (game baru) / `[Lanjutkan]` (save ada) — tombol muncul setelah logo tampil.

## 3. S2 — Altar Telur (Pilih Elemen)

- 4 telur di atas altar: 🔥 (merah), 💧 (biru), 🌬️ (krem), ⛰️ (hijau-cokelat). Telur `mystic` TIDAK tampil (hanya via breeding — Doc 07).
- Interaksi: ketuk telur → goyang + kilau + kartu deskripsi muncul ("Ember Egg — berapi-api dan penuh energi").
- Tombol `[Pilih Telur Ini]` → konfirmasi ("Telur ini akan menetas menjadi temanmu selamanya. Lanjutkan?") → ke S3.
- Telur lain tetap bisa dijelajahi sebelum memilih (tidak ada tekanan waktu).

## 4. S3 — Layar Nama + Hanko

- Input teks (maks 12 char; blok karakter kosong/emoji; simpan sebagai string trim).
- Tombol hanko merah di bawah: **tekan lama 0.8 s** → progress ring mengisi → "CAP!" + getar layar + bunyi stempel. (Tekan lama = kesengajaan, tidak bisa salah tap.)
- Validasi gagal → hanko tidak bisa ditekan; petunjuk muncul.

## 5. S4 — Cutscene Menetas (±6 detik, terkunci, bisa skip setelah 1×)

1. Telur di altar bergetar makin kencang (3 tahap).
2. Retakan cahaya warna elemen.
3. Ledakan kelopak/serpihan → **kitsune bayi** muncul, kucing-kucingan menoleh, ekor kecil bergoyang.
4. Balon bicara pertama: sapaan sesuai kepribadian elemen (contoh fire: "Otta! Kamu master-ku? Menarik!").
5. Fade ke Rumah Tatami; tutorial ringan dimulai (Doc 02 S4): highlight tombol Dapur → "Kogitsune lapar, beri ia makan!"

## 6. Data & Implementasi

- Hasil onboarding disimpan sebagai save pertama: `{pet:{name, element, birthAt: now, stage:'baby'}, coins:100, inventory:{starterFood:5}, ...}` (skema lengkap Doc 09).
- Pemain baru mendapat: **100 koin + 5 makanan starter + grace period 24 jam** (stat tidak di bawah 50 saat offline — Doc 03 §2).
- Semua langkah skip-able pada kunjungan ke-2+ dari panel debug.

## 7. Acceptance Criteria

- [ ] Alur 1× selesai tanpa tersesat; total onboarding ≤ 2 menit.
- [ ] Nama tervalidasi; hanko hanya "cap" dengan tekan lama penuh.
- [ ] Cutscene menetas berjalan mulus 60fps di perangkat mid-range.
- [ ] Save pertama dibuat tepat setelah menetas; tutup browser & buka kembali → lanjut dari Home, bukan onboarding ulang.
