# DOC 08 — Companion: Dialog & Memori Pet 💬

> Sumber desain: GDD §16. Pet harus terasa punya perasaan — dialog = 50% dari itu.

## 1. Tiga Saluran Dialog

| Saluran               | Bentuk                                            | Kapan                 |
| --------------------- | ------------------------------------------------- | --------------------- |
| **Balon Bicara**      | gelembung di atas pet, auto-hilang 4 dtk          | otomatis saat trigger |
| **Obrolan (chat)**    | layar chat washi; pemain ketik → jawaban template | pemain buka menu 💬   |
| **Reaksi non-verbal** | emoji ikon kecil (💢💧💤❤️)                       | feedback instan aksi  |

## 2. Mesin Dialog (arsitektur)

- Semua baris dialog ada di `data/dialog_<element>.json` (5 file, per kepribadian).
- `DialogueEngine.pick(triggerKey, context)` → pilih baris via **prioritas + anti-ulang** (baris terakhir tidak keluar lagi sampai 3 baris lain tampil).
- **Prioritas trigger** (tinggi→rendah):

| Prio | Trigger                         | Contoh baris                            |
| ---- | ------------------------------- | --------------------------------------- |
| 1    | `health < 25` / `state = SICK`  | "Badanku panas... (bersin)"             |
| 2    | `hunger < 25`                   | "Perutku koroong..."                    |
| 3    | `hygiene < 25`                  | "Bau? Aku? Tidak mungkin... atau iya?"  |
| 4    | `energy < 20` / `night & awake` | "Mataku berat..."                       |
| 5    | `happiness < 25`                | "Kamu sibuk ya hari ini..."             |
| 6    | `memories` (event baru, §4)     | "Kamu lupa memberiku makan kemarin..."  |
| 7    | `phase` (pagi/sore)             | "Selamat pagi! Langitnya merah cantik." |
| 8    | `season`                        | "Salju! Aku mau bikin yukigitsune!"     |
| 9    | `idle` (random 1×/2 menit)      | baris kepribadian                       |

## 3. Kepribadian (per elemen — gaya bahasa)

| Elemen      | Gaya                             | Contoh idle                                              |
| ----------- | -------------------------------- | -------------------------------------------------------- |
| `fire` 🔥   | Energik, singkat, kadang ngambek | "Lambat banget! Main yuk, SEKARANG!"                     |
| `water` 💧  | Pemalu, lembut, banyak elipsis   | "Ehm... kalau... kalau kamu tidak sibuk..."              |
| `wind` 🌬️   | Cerewet ceria, banyak tanya      | "Hari ini kita ke mana? Ke mana? Ke mana?"               |
| `earth` ⛰️  | Tenang, hangat, perawat          | "Istirahat juga penting, kamu tahu."                     |
| `mystic` ✨ | Misterius, meramal               | "Bintang tadi bilang... kamu akan lupa memberiku makan." |

- **Senior** memakai varian "nostalgia" (_"Dulu, waktu aku masih bayi..."_). Nogitsune/Yako pakai baris pendek murung (subset + varian gelap).

## 4. Memori (Sistem Pengingat)

`memoryLog` (maks 20 entri terbaru, persist di save):

```json
"memoryLog": [
  { "t": 1735700000000, "key": "starved_6h",  "detail": "hunger=0 selama 6 jam" },
  { "t": 1735750000000, "key": "evolved",     "detail": "menjadi Zenko" }
]
```

- Event yang diingat: stat mencapai 0, sakit/sembuh, evolusi, mandi pertama, event musiman, breeding, ditinggal >12 jam, hari jadi (ulang tahun mingguan!).
- Dialog memori dipicu saat relevan ("Kamu lupa memberiku makan kemarin...") — tapi **tidak menghakimi kasar** (aturan GDD §16).

## 5. Chat Template (MVP, offline)

- Input pemain di-tokenisasi; cocokkan kata kunci (multibahasa: id/en):
  - `makan|laper|food` → respons sesuai stat hunger & kepribadian
  - `sayang|cinta|love` → hati + happiness +2
  - `maaf|sorry` → jika ada memori kelalaian: respons memaafkan (memori ditandai "dimaafkan")
  - `siapa|nama|kamu` → perkenalan diri + nama
  - fallback → jawaban kepribadian generik + emoji reaksi
- Batas: chat bukan sumber stat (anti-spam: +2 happiness maks 10×/hari).

## 6. Acceptance Criteria

- [ ] Balon bicara muncul sesuai prioritas §2 dan tidak mengulang baris berurutan.
- [ ] 5 kepribadian elemen terasa berbeda saat dibaca (uji baca manual).
- [ ] Memori lalai muncul tepat dan bisa "dimaafkan".
- [ ] Chat keyword berfungsi offline; anti-spam ditegakkan.
