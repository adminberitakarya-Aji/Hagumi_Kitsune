/**
 * Funnel FTUE 2.0 (M14 — Doc 14 §6): splash → nama → makan pertama → D2.
 * Didefinisikan sekarang, diverifikasi penuh di M16 (adapter IAnalytics — Doc 15 §2).
 * Disimpan lokal per-install (idempotent — satu langkah hanya tercatat sekali),
 * sehingga metrik "aksi pertama < 30 dtk" bisa dihitung bahkan saat offline.
 */

export type FtueStep = "splash_seen" | "name_created" | "first_feed" | "day2_reached";

export interface FtueEntry {
  step: FtueStep;
  /** ms epoch saat langkah tercapai. */
  t: number;
}

const FUNNEL_KEY = "hagumi_ftue_funnel";
/** Target DoD M14: aksi pertama < 30 dtk sejak nama dicap (Doc 14 §6). */
export const FIRST_ACTION_TARGET_MS = 30_000;

/** Baca seluruh entri funnel (urut waktu tercapai). */
export function ftueFunnelEntries(): FtueEntry[] {
  try {
    const raw = localStorage.getItem(FUNNEL_KEY);
    const list: FtueEntry[] = raw ? (JSON.parse(raw) as FtueEntry[]) : [];
    return list.filter((e) => typeof e?.t === "number" && typeof e?.step === "string");
  } catch {
    return [];
  }
}

/** True bila langkah sudah pernah tercatat (funnel tidak pernah 2×). */
export function hasFtueStep(step: FtueStep): boolean {
  return ftueFunnelEntries().some((e) => e.step === step);
}

/**
 * Catat satu langkah funnel (idempotent). M16: titik ini digantungkan ke
 * adapter IAnalytics (`ftue_step` — Doc 15 §2); sementara log konsol + buffer lokal.
 */
export function trackFtueStep(step: FtueStep): void {
  try {
    if (hasFtueStep(step)) return;
    const list = ftueFunnelEntries();
    list.push({ step, t: Date.now() });
    localStorage.setItem(FUNNEL_KEY, JSON.stringify(list));
    console.info(`[ftue] ${step}`);
    if (step === "first_feed") logFirstActionLatency();
  } catch {
    /* storage gagal — funnel best-effort, game tetap jalan */
  }
}

/** Latensi aksi pertama: name_created → first_feed (DoD M14: < 30 dtk). */
export function firstActionLatencyMs(): number | null {
  const entries = ftueFunnelEntries();
  const name = entries.find((e) => e.step === "name_created");
  const feed = entries.find((e) => e.step === "first_feed");
  if (!name || !feed) return null;
  return feed.t - name.t;
}

function logFirstActionLatency(): void {
  const latency = firstActionLatencyMs();
  if (latency === null) return;
  const ok = latency <= FIRST_ACTION_TARGET_MS;
  console.info(
    `[ftue] aksi pertama ${Math.round(latency / 1000)} dtk (${ok ? "✓" : "✗"} target 30 dtk)`,
  );
}
