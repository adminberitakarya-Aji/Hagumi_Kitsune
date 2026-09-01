# DOC 11 — Companion LLM & Memory (Dua Tingkat) 🧠

> Sumber desain: GDD §16 + Doc 08. LLM = **peningkatan, bukan prasyarat** — game tetap utuh offline.

## 1. Dua Tingkat Memory/Dialog

| Tingkat | Isi | Internet | Biaya | Kapan Dipakai |
|---|---|---|---|---|
| **Tier 1 — Structured Memory** (Doc 08) | fakta terstruktur: lalai makan, evolusi, ulang tahun mingguan, stat, musim, fase | ❌ | gratis | default; fallback saat LLM tak tersedia/kuota habis |
| **Tier 2 — LLM** | percakapan bebas, kepribadian hidup, menghubungkan kenangan jadi kalimat alami | ✅ | per token | saat online + kuota tersedia |

## 2. Arsitektur Provider (Ports & Adapters)

```
packages/core/companion/ports.ts
  interface ILlmProvider { chat(req: ChatRequest): Promise<ChatReply> }

packages/llm/ (adapters — satu kontrak, banyak provider)
  ├─ provider-openai.ts    # OpenAI & semua API compatible
  ├─ provider-gemini.ts
  ├─ provider-ollama.ts    # lokal/gratis — untuk dev & mode anti-cloud
  └─ provider-offline.ts   # ⭐ default: template Tier 1 dari Doc 08

services/supabase/
  └─ functions/chat/       # edge function: proxy ke provider
                           # (API key TIDAK PERNAH ada di aplikasi)
```

**Alur:** App → (jika online & kuota ada) Supabase edge `POST /chat` → provider aktif → balasan → tampil.
**Fallback otomatis:** gagal/timeout/kuota habis → `provider-offline` (Tier 1) + status ikon kecil (☁️/📡).

## 3. Context Engineering — "Jiwa" Pet Tidak Tergantung Provider

Ganti provider tidak boleh mengubah kepribadian. Semua "jiwa" ada di payload yang kita rakit:

```json
{
  "personality": { "element": "fire", "traits": "energik, singkat, cepat kesal tapi cepat baik", "style": "panggil pemain 'Master', kalimat pendek" },
  "memorySummary": "Gen-1 rubah api. Pemain pernah lupa makan 6 jam (3 hari lalu). Baru berevolusi ke Zenko minggu lalu. Hobi main kingyo-sukui.",
  "context": { "stats": {"hunger": 30, "happiness": 60}, "phase": "evening", "season": "autumn", "ageDays": 23, "sinceLastGreeting": "5 jam" },
  "guardrails": ["tak menghakimi", "maks 2 kalimat", "selalu optimis lembut", "bahasa sesuai pemain (id/en)"]
}
```

- **Ringkasan bergulir:** memori lama dikompres per minggu hidup pet (maks ±2.000 token) → hemat biaya, tetap ingat.
- `memoryLog` Tier 1 TETAP jadi sumber fakta kebenaran — LLM hanya "berbicara", tidak menulis memori sendiri (anti halusinasi lalai).

## 4. Guardrail & Privasi (WAJIB)

- System prompt guardrail: tak menghakimi, tak menakuti, maks 2 kalimat, tidak mengakui sebagai manusia.
- Filter konten sebelum kirim & sebelum tampil (audiens semua umur).
- Chat tidak mengirim PII; tombol "Mode Tanpa LLM" (off penuh) di Pengaturan; data chat tidak disimpan server >24 jam.
- Kuota habis → otomatis Tier 1 + upsell lembut (1× per hari, bisa dimatikan).

## 5. Konfigurasi (`data/llm.json`)

```json
{
  "activeProvider": "offline",
  "providers": {
    "openai":  { "endpoint": "/api/chat", "model": "gpt-4o-mini" },
    "gemini":  { "endpoint": "/api/chat", "model": "gemini-flash" },
    "ollama":  { "endpoint": "http://localhost:11434", "model": "llama3.2" },
    "offline": { "builtin": true }
  },
  "maxTokens": 120, "dailyQuota": 10
}
```

## 6. Monetisasi (⛔ DITUNDA — Catatan Roadmap)

Rencana (JANGAN diimplementasi sekarang, hanya arahan): Gratis = 10 pesan/hari · Item koin "Obrolan Chi" = +10 pesan · Subscribe = tak terbatas. Kuota/entitlement **harus dicek di Supabase**, bukan klien. Fitur perawatan TIDAK PERNAH dipaywall (pilar desain GDD §1). Butuh: skema akun, tabel `entitlements`, toko pembelian. Diprioritaskan setelah M1–M7.

## 7. Acceptance Criteria

- [ ] `ILlmProvider` di core; 4 adapter mengimplementasi kontrak yang sama (test kontrak sama).
- [ ] Matikan internet → chat beralih mulus ke Tier 1 tanpa crash.
- [ ] PersonalityCard + memorySummary menghasilkan gaya bahasa konsisten lintas provider (uji 5 elemen).
- [ ] API key tidak pernah ada di bundle klien (audit).
- [ ] Guardrail tahan terhadap prompt provokatif (daftar kasus uji).
