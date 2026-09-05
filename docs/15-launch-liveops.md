# DOC 15 — Launch & Live-Ops 🚀

> Sumber: diskusi desain 04/09/2026 — strategi "game kelas dunia" pasca-M9: target terukur,
> keputusan berbasis data, monetisasi yang tidak merusak kepercayaan, dan rilis global.
> Implementasi: M15–M20. Status: **desain disetujui**.

## 1. Definisi "World-Class" (Target Terukur — genre virtual pet)

| Metrik                        | Target                    |
| ----------------------------- | ------------------------- |
| Retensi D1 / D7 / D30         | ≥ 40% / ≥ 15% / ≥ 6%      |
| Crash-free session            | ≥ 99.5%                   |
| Cold start (mid-end Android)  | < 3 detik                 |
| FTUE → aksi pertama           | < 30 detik dari buka      |
| Sesi harian                   | 6–12 × 1–5 menit (GDD pilar 3) |
| Store rating                  | ≥ 4.5 dengan ≥ 10rb review |
| Prinsip LTV                   | Kosmetik + langganan ringan, **nol pay-to-win** |

## 2. Telemetry (M16)

- **Abstraksi adapter** (pola ports Doc 09): `IAnalytics` di core-side kontrak, adapter web/native.
- Taxonomy event minimum: `session_start/end`, `pet_action` (makan/mandi/tidur/belai), `minigame_play/result`, `purchase_shop`, `breeding_send/accept/claim`, `chat_send/tier`, `evolution`, `death`, `ftue_step` (funnel: splash→nama→makan_pertama→D2).
- KPI mingguan: retensi kohort, funnel FTUE, churn point (aksi terakhir sebelum drop), sumber koin vs pemborosan.

## 3. Crash Reporting & Remote Config (M16)

- Crash reporting (Sentry/Capacitor) — crash-free ≥ 99.5% jadi gerbang rilis.
- Remote config HANYA untuk: jadwal event musiman, berita/CTA, flag fitur. **Balance (decay.json dll.) tetap lokal** — prinsip "save = nyawa" tidak boleh tergantung jaringan.

## 4. Monetisasi — Cosmetics-first (M17)

- **Katalog kosmetik**: aksesoris kitsune (topeng kitsune, obi, kalung suzu), dekorasi tatami, warna ekor premium + preview 3D-2D di scene.
- **"Inari Blessing"** (langganan ringan, opsional): slot cloud backup tambahan, kosmetik eksklusif, koin harian bonus.
- Prinsip audit: **semua yang mengubah gameplay dapat dengan bermain; uang = identitas saja.** Nol konsumabel kekuatan; kuota LLM tetap gratis-tier (Doc 11 §6).
- Simulasi ekonomi harus lulus dengan & tanpa pembayaran (`tools/simulate` diperluas).

## 5. Lokalisasi — EN / JP / ID (M18)

- Framework i18n: string eksternal per locale; `dialog_<element>.json` ber-key (bukan kalimat mentah).
- JP = prioritas identitas budaya (DotGothic16 sudah mendukung kana/kanji).
- Deteksi locale perangkat + ganti bahasa manual di Pengaturan; tersimpan di `save.settings`.
- Audit rilis: nol string hard-coded di komponen (grep CI).

## 6. Mobile Pipeline — Capacitor + CI/CD (M15)

- Capacitor: Android dulu, iOS menyusul; ikon adaptive, splash, portrait lock, safe-area native.
- Notifikasi lokal native (stat <20, sakit) — gantikan stub web M5.
- **GitHub Actions**: per PR → test + typecheck + lint + build; per push main → artifact APK (release build satu perintah).
- Kepatuhan: Data Safety form, target API Android terbaru, kebijakan anak (audiens all-age — COPPA/play family).
- Budget performa: cold start < 3 dtk, APK < 50 MB, 60fps mid-end.

## 7. Soft Launch → Global (M19–M20)

- Soft launch 1 negara (PH/ID): store listing, komunitas kecil, iterasi mingguan berbasis KPI §1.
- Loop viral alami: **breeding code = share moment** (deep link tukar kode).
- Global: press kit + trailer 30 dtk (ekor bertambah → evolusi Zenko/Yako → chat LLM), ASO, peluncuran JP disinkron momen musiman (Hanami).
- Pasca-rilis: kalender konten musiman via remote config (live-ops tanpa update binary).

## 8. Acceptance Criteria

- [ ] Dashboard KPI mingguan hidup; setiap aksi inti menghasilkan event valid
- [ ] Crash-free ≥ 99.5% pada build uji sebelum rilis publik
- [ ] Audit monetisasi: nol item gameplay-only berbayar; sim ekonomi lulus
- [ ] 3 bahasa lengkap di semua layar (audit grep string literal)
- [ ] APK rilis ter-install & playable di perangkat fisik; CI hijau
