# DOC 01 — Pet: Kitsune 🦊

> Sumber desain: GDD §3 (stat & tahap), §4 (evolusi). Dokumen ini = spesifikasi teknis pet.

## 1. Identitas

| Properti    | Nilai                                                               |
| ----------- | ------------------------------------------------------------------- |
| Spesies     | Kitsune (rubah)                                                     |
| Nama        | Ditentukan pemain (maks 12 karakter, tanpa emoji)                   |
| Elemen      | `fire` / `water` / `wind` / `earth` / `mystic` (tetap seumur hidup) |
| Kepribadian | Turun dari elemen (tabel §5) — memengaruhi dialog & animasi idle    |
| Umur maks   | `80 + CareScore×0.2` hari                                           |

## 2. Stat (0–100, clamp wajib)

| Key       | Label   | Decay/jam (siang)      | Decay/jam (malam, sadar) | Decay/jam (tidur) |
| --------- | ------- | ---------------------- | ------------------------ | ----------------- |
| hunger    | Kenyang | −5                     | −4                       | −2                |
| happiness | Senang  | −3                     | −2                       | −1                |
| energy    | Energi  | −5                     | −8 (mengantuk)           | +30 (pulih)       |
| hygiene   | Bersih  | −3                     | −2                       | −1                |
| health    | Sehat   | komposit (lihat bawah) | komposit                 | komposit          |

> **Catatan rebalance (Log Revisi ROADMAP, 03/09):** angka awal (−8/−6/−5/−4) membuat
> pemilik normal tidak mampu mempertahankan stat (butuh 4–5× makan & ~7× main/hari) —
> simulasi 90 hari selalu berakhir kematian hari 2–3. Angka di atas adalah target
> "pemilik normal": 3× makan, 2× main, 1× mandi, tidur 8 jam → pet hidup sehat
> tanpa terus-menerus kritis. Diverifikasi oleh `pnpm simulate` + test balance
> `packages/data/tests/decay.test.ts`.

**Health** tidak punya decay sendiri; aturan komposit:

- Jika ≥2 stat di bawah 25 → `health −10/jam`.
- Sakit tidak diobati 12 jam → `health −10/jam` tambahan.
- Stat lain = 0 → stat tersebut mulai menggerus health −5/jam (maks −15/jam gabungan).

**Aturan penolakan aksi:**

- Makan ditolak jika `hunger > 90` (kecuali item "camilan" Happiness).
- Main ditolak jika `energy < 15` → pet otomatis menguap & duduk.
- Overfeed: >3 makan dalam 6 jam → `health −5` + animasi mual.

## 3. Tahap Hidup & Ekor

| Tahap  | Key     | Hari  | Ekor | Perilaku Khusus                                      |
| ------ | ------- | ----- | ---- | ---------------------------------------------------- |
| Telur  | `egg`   | 0–1   | 0    | Wajib diketuk 20× (progress inkubasi)                |
| Bayi   | `baby`  | 1–7   | 1    | Decay hunger ×1.5, tombol main terkunci              |
| Remaja | `teen`  | 7–20  | 2    | Mini-game terbuka; evolusi 1 di hari ke-10           |
| Dewasa | `adult` | 20–60 | 3–5  | Breeding terbuka; evolusi final hari ke-20           |
| Senior | `elder` | 60–90 | 6–7  | Gerak ×0.7, butuh tidur lebih lama, dialog nostalgia |
| Mati   | `dead`  | ±90   | —    | Layar memorial                                       |

Ekor Dewasa mengikuti jalur evolusi: Tenko 9 (di Senior), Zenko 5–7, Biasa 3–4, Yako 1–2, Nogitsune 1.

## 4. Varian Elemen (visual + stat bonus pasif)

| Elemen      | Warna bulu    | Aura/efek                  | Stat bonus pasif            | Kepribadian                                  |
| ----------- | ------------- | -------------------------- | --------------------------- | -------------------------------------------- |
| `fire` 🔥   | Oranye-merah  | percikan bara saat senang  | energy regen +10%           | Energik, temperamental, bicara singkat-pegas |
| `water` 💧  | Biru pucat    | tetesan cahaya             | hygiene decay −25%          | Pemalu, lembut, banyak "..."                 |
| `wind` 🌬️   | Putih-krem    | garis angin, bulu melayang | energy decay −15%           | Cerewet ceria, suka bertanya                 |
| `earth` ⛰️  | Cokelat-hijau | daun kecil di ekor         | hunger decay −15%           | Tenang, penuh perhatian, suka makan          |
| `mystic` ✨ | Ungu berkilau | bintang kecil              | decay semua −10%, koin +10% | Misterius, kadang "meramal"                  |

## 5. State Machine (ringkas; detail arsitektur di Doc 09)

`EGG → IDLE ↔ {EATING, BATHING, SLEEPING, PLAYING, PETTED}` → `SICK` → `EVOLVING` → `DEAD`

- Transisi ke `SICK` otomatis (pemicu §1–§2); pemain obati → kembali `IDLE`.
- `EVOLVING` = cutscene terkunci ±8 detik (lonceng kuil + kilatan).

## 6. Daftar Animasi (klip sprite yang harus tersedia per elemen)

| Klip       | Frame (32×32 px) | Loop  | Pemicu                           |
| ---------- | ---------------- | ----- | -------------------------------- |
| idle       | 4                | ya    | default                          |
| idle_happy | 4                | ya    | happiness > 80 (random 10%)      |
| idle_sad   | 4                | ya    | happiness < 30                   |
| walk       | 6                | ya    | berpindah titik di scene         |
| eat        | 6                | tidak | aksi makan                       |
| sleep      | 4                | ya    | state SLEEPING (Z zzz)           |
| sick       | 4                | ya    | state SICK                       |
| petted     | 5                | tidak | usap pet (hati muncul)           |
| bathe      | 6                | tidak | di Onsen                         |
| evolve     | 10               | tidak | cutscene                         |
| dead       | 1                | —     | layar memorial                   |
| tail_wag   | 2                | ya    | overlay ekor, dipakai semua klip |

Total: 12 klip × 5 elemen (warna via recolor palet, bukan gambar ulang — gunakan palet swap otomatis).

## 7. Acceptance Criteria — Doc 01 selesai jika

- [ ] Semua stat decay/naik sesuai tabel §2, clamp 0–100, diuji dengan time-lapse.
- [ ] Transisi state sesuai §5 tanpa state mati (dead-end selain DEAD).
- [ ] Recolor 5 elemen menghasilkan visual berbeda dari 1 set sprite.
- [ ] Semua 12 klip animasi terpasang dan terpicu konteks yang benar.
