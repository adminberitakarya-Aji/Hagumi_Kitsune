/**
 * DialogueEngine (M6 — Doc 08 §2): pilih baris via PRIORITAS + ANTI-ULANG.
 * - Baris terakhir dari suatu pool tidak keluar lagi sampai 3 baris lain tampil.
 * - Prioritas trigger 1–9 (health → … → idle).
 * - Sapaan fase (prio 7) 1× per fase; musim (prio 8) 1× per hari; idle (prio 9)
 *   maks 1× per 2 menit.
 * Murni (tanpa I/O) — baris di-inject dari `@hagumi/data`, waktu dari pemanggil.
 */
import type { IRng } from "../ports";
import type { DayPhase, Season } from "../time/types";
import type { MemoryLogEntry, PetStage, PetState, PetStats } from "../pet/types";
import type { DialogueContext, DialoguePick, DialogueTriggerKey } from "./types";
import { isNeglectMemoryKey } from "./types";

/** Struktur pool baris yang dipakai engine (subset dari DialogueConfig). */
export interface DialoguePools {
  lines: Record<DialogueTriggerKey, string[]>;
  seniorIdle?: string[];
  darkIdle?: string[];
  darkNeglect?: string[];
}

const IDLE_COOLDOWN_MS = 2 * 60_000; // Doc 08 §2: idle 1×/2 menit
const MIN_GAP_MS = 6_000; // jeda antar balon agar tidak spam
const ANTI_REPEAT = 3; // baris terakhir tidak keluar sampai 3 lain tampil

export interface DialogueEngineOptions {
  element: string;
  pools: DialoguePools;
  rng: IRng;
  /** nowMs awal (jam simulasi). */
  nowMs: number;
}

export class DialogueEngine {
  private readonly pools: DialoguePools;
  private readonly rng: IRng;
  private readonly element: string;

  private nowMs: number;
  private lastSpokenAt = -Infinity;
  /** Riwayat 3 baris terakhir per pool — anti-ulang (Doc 08 §2). */
  private readonly recent = new Map<DialogueTriggerKey, string[]>();
  /** Sapaan fase & musim terakhir diucapkan — agar 1× per fase/hari. */
  private phaseSpoken: DayPhase | null = null;
  private seasonSpokenDay = -1;
  /** Pet memilih varian: senior (elder) atau gelap (yako/nogitsune). */
  private variant: "normal" | "senior" | "dark" = "normal";

  constructor(opts: DialogueEngineOptions) {
    this.pools = opts.pools;
    this.rng = opts.rng;
    this.element = opts.element;
    this.nowMs = opts.nowMs;
  }

  /** Perbarui konteks varian — dipanggil system saat evolusi/umur berubah. */
  setVariant(stage: PetStage, path: string): void {
    if (stage === "elder") this.variant = "senior";
    else if (path === "yako" || path === "nogitsune") this.variant = "dark";
    else this.variant = "normal";
  }

  get elementName(): string {
    return this.element;
  }

  /**
   * Pilih baris untuk trigger eksplisit (mis. poke → idle). Anti-ulang tetap berlaku.
   * Return null bila pool kosong / semua baris sedang "dihold".
   */
  pick(trigger: DialogueTriggerKey): string | null {
    return this.pickFromPool(trigger, this.poolFor(trigger));
  }

  /** Catat waktu bicara — dipanggil system setelah baris non-engine ditampilkan juga. */
  markSpoken(): void {
    this.lastSpokenAt = this.nowMs;
  }

  /** Majukan jam internal (system memanggil tiap tick dengan simNow). */
  tick(nowMs: number): void {
    this.nowMs = nowMs;
  }

  /** Sapaan awal pakai baris idle sesuai varian (dipakai first greeting). */
  greeting(): string | null {
    return this.pickFromPool("idle", this.idlePool());
  }

  /**
   * Evaluasi prioritas 1–9 (Doc 08 §2) → balasan tertinggi yang memenuhi syarat,
   * atau null bila tidak ada trigger aktif / masih dalam jeda antar balon.
   */
  pickByPriority(ctx: DialogueContext, dayIndex: number): DialoguePick | null {
    if (this.nowMs - this.lastSpokenAt < MIN_GAP_MS) return null;

    const cands: DialogueTriggerKey[] = [];
    // 1 — health <25 / SICK
    if (ctx.stats.health < 25 || ctx.state === "sick") cands.push("health");
    // 2 — hunger <25
    if (ctx.stats.hunger < 25) cands.push("hunger");
    // 3 — hygiene <25
    if (ctx.stats.hygiene < 25) cands.push("hygiene");
    // 4 — energy <20 / malam & terjaga
    if (ctx.stats.energy < 20) cands.push("energy");
    else if (ctx.phase === "night" && ctx.state !== "sleeping" && ctx.state !== "sick")
      cands.push("night");
    // 5 — happiness <25
    if (ctx.stats.happiness < 25) cands.push("happiness");
    // 6 — memori (lalai dulu, lalu event)
    if (ctx.pendingMemory) {
      cands.push(isNeglectMemoryKey(ctx.pendingMemory.key) ? "memory_neglect" : "memory_event");
    }
    // 7 — fase (1× per fase)
    if (ctx.phase !== "night" && this.phaseSpoken !== ctx.phase)
      cands.push(`phase_${ctx.phase}` as DialogueTriggerKey);
    // 8 — musim (1× per hari)
    if (this.seasonSpokenDay !== dayIndex) cands.push(`season_${ctx.season}` as DialogueTriggerKey);
    // 9 — idle (cooldown 2 menit)
    if (this.nowMs - this.lastSpokenAt >= IDLE_COOLDOWN_MS) cands.push("idle");

    for (const trigger of cands) {
      const text = this.pick(trigger);
      if (!text) continue;
      // catat sapaan fase/musim hanya jika barisnya benar-benar keluar
      if (trigger.startsWith("phase_")) this.phaseSpoken = ctx.phase;
      if (trigger.startsWith("season_")) this.seasonSpokenDay = dayIndex;
      this.markSpoken();
      return { trigger, text };
    }
    return null;
  }

  /** Pool untuk trigger + varian (senior nostalgia / gelap murung — Doc 08 §3). */
  private poolFor(trigger: DialogueTriggerKey): string[] {
    if (trigger === "idle") return this.idlePool();
    if (trigger === "memory_neglect" && this.variant === "dark" && this.pools.darkNeglect)
      return this.pools.darkNeglect;
    return this.pools.lines[trigger] ?? [];
  }

  private idlePool(): string[] {
    if (this.variant === "senior" && this.pools.seniorIdle?.length) return this.pools.seniorIdle;
    if (this.variant === "dark" && this.pools.darkIdle?.length) return this.pools.darkIdle;
    return this.pools.lines.idle ?? [];
  }

  /** Ambil baris acak yang tidak ada di 3 baris terakhir pool ini (anti-ulang). */
  private pickFromPool(trigger: DialogueTriggerKey, pool: string[]): string | null {
    if (!pool || pool.length === 0) return null;
    const recent = this.recent.get(trigger) ?? [];
    const fresh = pool.filter((line) => !recent.includes(line));
    const source = fresh.length > 0 ? fresh : pool; // pool 1 baris → tetap tampil
    const text = this.rng.pick(source);
    if (!text) return null;
    const nextRecent = [...recent, text].slice(-ANTI_REPEAT);
    this.recent.set(trigger, nextRecent);
    return text;
  }
}

export type { PetStats, PetState, Season, MemoryLogEntry };

