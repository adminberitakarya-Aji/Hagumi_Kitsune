# DOC 13 — Pet Autonomy System 🦊 (Kitsune Hidup)

> Sumber: diskusi desain 04/09/2026 — "pet jangan monoton geraknya hanya di tengah; harus bisa
> berjalan/berlari sehingga game terasa hidup". Melengkapi Doc 01 (stat & state machine) dan
> tunduk pada aturan arsitektur Doc 09. Status: **desain disetujui** — implementasi milestone M13.

## 1. Tujuan & Prinsip

> Kitsune harus tampak punya **kehendak sendiri** — perilaku lahir dari kebutuhannya (stat),
> waktunya (fase hari), dan kepribadiannya (elemen), bukan dari klik pemain.

1. **Kehendak, bukan animasi** — setiap gerak punya motivasi; player bisa "menebak apa yang dia inginkan".
2. **Otak di core, tubuh di renderer** — keputusan perilaku murni & testable; Phaser hanya eksekutor.
3. **Tunduk pada PetStateMachine** (Doc 01 §5) — SLEEPING/EATING/BATHING/SICK tidak bisa diinterupsi.
4. **Data-driven** — semua angka (kecepatan, ambang, bobot kepribadian) di `behavior.json`, bukan hard-code.

## 2. Arsitektur

```
packages/core/src/pet/behavior.ts   ← OTAK (murni, IRng-injected, unit-test)
packages/data/data/behavior.json    ← ANGKA (bobot, ambang, kecepatan)
apps/web/src/game/FoxAgent.ts       ← TUBUH (FSM eksekusi intent di Phaser)
```

Alur: `FoxAgent` idle → minta intent via `decideBehavior(input, rng)` → eksekusi (klip + gerak)
→ kembali idle → minta intent berikutnya. Renderer **tidak pernah memutuskan**.

`input = { stats, dayPhase, season, element, personality, posisi poop, IRng }`
`output = { intent, target?, durationMs? }`

## 3. Daftar Intent

| Intent         | Pemicu                                                        | Klip           | Catatan                                    |
| -------------- | ------------------------------------------------------------- | -------------- | ------------------------------------------ |
| `wander`       | default                                                       | `walk`         | titik acak dalam waypoint map scene        |
| `zoomies`      | happiness ≥ 75 && energy ≥ 60, cooldown, bobot per elemen      | `run`          | 2–4 sprint bolak-balik lalu `sit`          |
| `go_to`        | hunger<30 → dapur · energy<25 → futon · mau poop → POOP_SPOTS | `walk`         | sinyal alami ke pemain (bukan toast)       |
| `roll_discomf` | hygiene < 30                                                  | `stretch`+fx   | berguling tidak nyaman                     |
| `sit`          | mikro setelah sampai                                          | `sit`          | ekor melingkar                             |
| `sniff`        | mikro                                                         | `sniff`        | kepala turun ke tanah                      |
| `stretch`      | mikro (sering saat pagi)                                      | `stretch`      |                                            |
| `look_around`  | mikro                                                         | `look_around`  | 1 dtk menghadap kamera — "dia melihatku!"  |
| `chase_tail`   | mikro (bobot per elemen)                                      | `chase_tail`   |                                            |
| `nap_spot`     | malam && energy sedang                                        | `sleep`        | tidur di tempat (bukan futon)              |

Mikro-perilaku dipilih acak berbobot setiap kali sampai tujuan; minimal 1 dari 5 berbeda per 3 menit.

## 4. Skema `behavior.json` (validasi Zod fail-fast, pola `packages/data`)

```json
{
  "version": 1,
  "tick": { "minMs": 1200, "maxMs": 3500 },
  "speed": { "walk": 40, "run": 95, "accelMs": 250 },
  "needs": { "hungerGoTo": 30, "energyGoTo": 25, "hygieneRoll": 30 },
  "zoomies": { "happiness": 75, "energy": 60, "cooldownMin": 20, "sprints": [2, 4] },
  "micro": { "chanceAfterArrive": 0.65, "minMs": 2000, "maxMs": 5000 },
  "weights": {
    "fire":   { "zoomies": 1.6, "wander": 1.0, "chaseTail": 1.2, "lookAround": 0.8 },
    "water":  { "zoomies": 0.5, "wander": 0.8, "chaseTail": 0.4, "lookAround": 1.0 },
    "wind":   { "zoomies": 1.3, "wander": 1.2, "chaseTail": 0.8, "lookAround": 1.0 },
    "earth":  { "zoomies": 0.6, "wander": 0.9, "chaseTail": 0.5, "lookAround": 1.1 },
    "mystic": { "zoomies": 0.9, "wander": 0.7, "chaseTail": 0.3, "lookAround": 1.4 }
  },
  "seasonFlavor": { "winter": { "walkSpeedMul": 0.8, "lingerLantern": true },
                    "summer": { "fireflyPlay": true } }
}
```

## 5. Klip Animasi Baru (generator `art/kitsuneArt.ts` — tambah `FrameOpts`)

| Klip          | Frame | Loop  | Keterangan                            |
| ------------- | ----- | ----- | ------------------------------------- |
| `run`         | 8     | ya    | fps 12; legPhase cepat, badan condong |
| `sit`         | 4     | ya    | duduk, ekor melingkar                 |
| `sniff`       | 4     | ya    | kepala turun-angkat                   |
| `stretch`     | 4     | tidak | peregangan (front-down, tail-up)      |
| `look_around` | 4     | ya    | kuping & kepala bergerak              |
| `chase_tail`  | 6     | ya    | berputar mengejar ekor                |

## 6. Waypoint, Scene & Gating

- Waypoint map per scene (Home: area tatami; Garden: rumput/kolam/batu zen). **Garden wajib menampilkan kitsune** (duduk batu zen, sniff koi, kejar kupu-kupu musiman) — saat ini GardenScene tidak menggambar pet.
- Kehadiran lintas scene: FoxAgent per scene; **posisi ephemeral — TIDAK masuk skema save** (Doc 09 §3 tetap).
- Gating: intent ditolak bila PetStateMachine dalam EATING/BATHING/SLEEPING/SICK → renderer menunda timer, bukan membatalkan kebutuhan.
- Kecepatan klip tersinkron kecepatan gerak (legPhase ↔ px/s); flipX mengikuti arah; y-sort depth di area berumput.

## 7. Acceptance Criteria

- [ ] Sesi 3 menit tanpa input → **≥ 4 perilaku berbeda** terlihat (playtest manual)
- [ ] Poop selalu muncul di POOP_SPOTS setelah animasi `go_to` + putar badan
- [ ] Malam + energy < 25 → pet berjalan sendiri ke futon (bukan hanya ditidurkan)
- [ ] Unit test `decideBehavior`: distribusi 1000 tick — semua intent tercapai, gating tak terlanggar, deterministik terhadap IRng
- [ ] 60fps mid-range; `pnpm typecheck` / `pnpm lint` bersih

