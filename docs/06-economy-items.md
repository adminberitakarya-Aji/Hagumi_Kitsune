# DOC 06 — Ekonomi, Item & Inventory 🪙

> Sumber desain: GDD §7. Semua angka = data JSON (Doc 09 §5), bukan hard-coded.

## 1. Mata Uang

Satu-satunya: **koin 🪙**. Sumber: mini-game, hadiah login, event musiman, warisan. Sink: toko, breeding, koi feeding.

## 2. Katalog Item (file: `data/items.json`)

### Makanan (maks 12 SKU; 4 musiman berputar)

| id | Nama | Harga | hunger | happiness | Catatan |
|---|---|---|---|---|---|
| `rice_ball` | Onigiri | 5 | +20 | 0 | starter |
| `bread` | Roti Dagashi | 8 | +25 | +2 | |
| `grilled_fish` | Ikan Bakar | 15 | +35 | +3 | |
| `steak` | Steak Premium | 40 | +55 | +8 | risiko overfeed |
| `sakura_mochi` | 🌸 Sakura Mochi | 12 | +20 | +8 | spring |
| `kakigori` | ☀️ Kakigori | 10 | +10 | +12 | summer |
| `roasted_potato` | 🍁 Ubi Panggang | 12 | +30 | +5 | autumn |
| `oden` | ❄️ Oden | 18 | +40 | +6 | winter |

### Obat & Lainnya

| id | Nama | Harga | Efek | Cooldown |
|---|---|---|---|---|
| `syrup` | Sirup Obat | 30 | health +30 | 4 jam |
| `vitamin` | Vitamin | 20 | health +15, energy +10 | 4 jam |
| `soap` | Sabun Onsen | 15 | hygiene +40 (bisa dipakai di Home tanpa ke Onsen) | — |
| `toy_ball` | Bola Daruma | 80 | happiness decay −25% pasif | sekali beli |
| `toy_doll` | Boneka Kitsune | 150 | happiness decay −50% pasif | sekali beli |
| `decor_*` | 6 dekorasi | 100–300 | kosmetik (slot rumah) + happiness pasif +2 | sekali beli |
| `egg_npc` | Breeding NPC | 500 | alur Doc 07 | — |

## 3. Inventory (skema ringkas)

```json
"inventory": {
  "food":     { "rice_ball": 3, "sakura_mochi": 1 },
  "medicine": { "syrup": 1 },
  "owned":    ["toy_ball", "decor_lantern"],
  "placedDecor": ["decor_lantern"]
}
```
- Makanan = stok habis pakai; mainan/dekorasi = owned sekali.
- Kapasitas makanan: 20 slot (dorong pemain ke toko rutin).
- Mainan dipasang (maks 1) memengaruhi decay happiness di rumah.

## 4. Hadiah Login Harian (streak)

| Hari ke- | Koin | Hari ke- | Koin |
|---|---|---|---|
| 1 | 20 | 5 | 80 |
| 2 | 30 | 6 | 120 |
| 3 | 40 | 7 | 200 + item musiman |
| 4 | 60 | 8+ | reset ke 1 |

- "Hari" = kalender lokal; streak putus bila tidak buka 1 hari penuh.
- Muncul otomatis saat buka game hari baru (modal washi + bunyi lonceng kecil).

## 5. Keseimbangan (target per hari pemain aktif)

- Pendapatan ±100–150 koin (mini-game 3× + hadiah).
- Pengeluaran wajib ±60 (makan 5×) + opsional (obat/dekorasi) → surplus kecil untuk menabung breeding 500.
- Kalibrasi via time-lapse (Doc 03 §6); harga hanya di `items.json`.

## 6. Acceptance Criteria

- [ ] Beli/pakai item memengaruhi stat sesuai tabel + autosave.
- [ ] Streak login benar lintas tengah malam & putus sesuai aturan.
- [ ] Item musiman hanya muncul di musimnya; switch musim otomatis mengganti katalog.
- [ ] Tidak ada angka harga/efek di kode — semua dari `items.json`.
