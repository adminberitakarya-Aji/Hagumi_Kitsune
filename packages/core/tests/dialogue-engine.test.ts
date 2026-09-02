/** Test DialogueEngine (M6 — Doc 08 §2): prioritas 1–9 + anti-ulang. */
import { describe, expect, it } from "vitest";

import { DialogueEngine, type DialoguePools } from "../src/companion/dialogue-engine";
import { SeededRng } from "../src/adapters";
import type { DialogueContext } from "../src/companion/types";

const LINES: DialoguePools = {
  lines: {
    health: ["H1", "H2", "H3"],
    hunger: ["UU1", "UU2", "UU3"],
    hygiene: ["B1", "B2", "B3"],
    energy: ["E1", "E2", "E3"],
    night: ["N1", "N2", "N3"],
    happiness: ["S1", "S2", "S3"],
    memory_neglect: ["MN1", "MN2"],
    memory_event: ["ME1", "ME2"],
    forgive: ["F1"],
    phase_morning: ["AM1", "AM2"],
    phase_day: ["AD1", "AD2"],
    phase_evening: ["AE1", "AE2"],
    season_spring: ["SSP1", "SSP2"],
    season_summer: ["SSU1", "SSU2"],
    season_autumn: ["SAU1", "SAU2"],
    season_winter: ["SWI1", "SWI2"],
    idle: ["I1", "I2", "I3", "I4"],
  },
  seniorIdle: ["SENIOR1", "SENIOR2"],
  darkIdle: ["DARK1", "DARK2"],
  darkNeglect: ["DARKNEG1"],
};

function makeEngine(nowMs = 1_735_000_000_000): DialogueEngine {
  return new DialogueEngine({ element: "fire", pools: LINES, rng: new SeededRng(42), nowMs });
}

const healthyCtx = (over: Partial<DialogueContext> = {}): DialogueContext => ({
  stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 100 },
  state: "idle",
  phase: "day",
  season: "spring",
  pendingMemory: null,
  ...over,
});

describe("DialogueEngine — anti-ulang (Doc 08 §2)", () => {
  it("baris terakhir tidak keluar lagi sampai 3 baris lain tampil", () => {
    const eng = makeEngine();
    const shown: string[] = [];
    for (let i = 0; i < 20; i++) {
      eng.tick(eng["nowMs"] + 10_000); // melewati jeda antar balon
      const line = eng.pick("idle");
      if (!line) continue;
      // baris ini tidak boleh ada di 3 terakhir
      const last3 = shown.slice(-3);
      expect(last3).not.toContain(line);
      shown.push(line);
    }
    expect(shown.length).toBeGreaterThan(3);
  });
});

describe("DialogueEngine — prioritas trigger (Doc 08 §2)", () => {
  it("prio 1 health <25 mengalahkan hunger <25", () => {
    const eng = makeEngine();
    const pick = eng.pickByPriority(
      healthyCtx({ stats: { hunger: 10, happiness: 80, energy: 80, hygiene: 80, health: 20 } }),
      0,
    );
    expect(pick?.trigger).toBe("health");
    expect(LINES.lines.health).toContain(pick?.text);
  });

  it("prio 1 state SICK tanpa stat rendah tetap health", () => {
    const eng = makeEngine();
    const pick = eng.pickByPriority(healthyCtx({ state: "sick" }), 0);
    expect(pick?.trigger).toBe("health");
  });

  it("prio 2 hunger <25 mengalahkan hygiene <25 dan happiness <25", () => {
    const eng = makeEngine();
    const pick = eng.pickByPriority(
      healthyCtx({ stats: { hunger: 10, happiness: 5, energy: 80, hygiene: 10, health: 100 } }),
      0,
    );
    expect(pick?.trigger).toBe("hunger");
  });

  it("prio 4b malam & terjaga → night, tapi tidur → tidak night", () => {
    const eng = makeEngine();
    const pick = eng.pickByPriority(healthyCtx({ phase: "night" }), 0);
    expect(pick?.trigger).toBe("night");
    const eng2 = makeEngine();
    const pick2 = eng2.pickByPriority(healthyCtx({ phase: "night", state: "sleeping" }), 0);
    expect(pick2?.trigger).not.toBe("night");
  });

  it("prio 6 memori lalai → memory_neglect; event → memory_event", () => {
    const eng = makeEngine();
    const pick = eng.pickByPriority(
      healthyCtx({ pendingMemory: { t: 1, key: "starved_6h", detail: "x" } }),
      0,
    );
    expect(pick?.trigger).toBe("memory_neglect");
    const eng2 = makeEngine();
    const pick2 = eng2.pickByPriority(
      healthyCtx({ pendingMemory: { t: 1, key: "evolved", detail: "x" } }),
      0,
    );
    expect(pick2?.trigger).toBe("memory_event");
  });

  it("prio 7 sapaan fase 1× per fase; prio 8 musim 1× per hari; lalu idle", () => {
    const eng = makeEngine();
    const p1 = eng.pickByPriority(healthyCtx({ phase: "morning" }), 0);
    expect(p1?.trigger).toBe("phase_morning");
    eng.tick(1_735_000_000_000 + 10 * 60_000);
    // fase morning sudah diucapkan, tapi musim belum (prio 8 > idle)
    const p2 = eng.pickByPriority(healthyCtx({ phase: "morning" }), 0);
    expect(p2?.trigger).toBe("season_spring");
    eng.tick(1_735_000_000_000 + 20 * 60_000);
    // fase berganti ke day → sapaan fase day keluar (prio 7)
    const p3 = eng.pickByPriority(healthyCtx({ phase: "day" }), 0);
    expect(p3?.trigger).toBe("phase_day");
    eng.tick(1_735_000_000_000 + 30 * 60_000);
    // fase day sudah, musim sudah — tersisa idle (prio 9)
    const p4 = eng.pickByPriority(healthyCtx({ phase: "day" }), 0);
    expect(p4?.trigger).toBe("idle");
    // fase baru → sapaan fase keluar lagi
    eng.tick(1_735_000_000_000 + 40 * 60_000);
    const p5 = eng.pickByPriority(healthyCtx({ phase: "evening" }), 0);
    expect(p5?.trigger).toBe("phase_evening");
    // hari baru → sapaan musim boleh keluar lagi
    eng.tick(1_735_000_000_000 + 50 * 60_000);
    const p6 = eng.pickByPriority(healthyCtx({ phase: "evening" }), 1);
    expect(p6?.trigger).toContain("season_");
  });

  it("jeda antar balon (6 dtk) menahan balon baru", () => {
    const eng = makeEngine();
    expect(eng.pickByPriority(healthyCtx(), 0)).not.toBeNull();
    eng.tick(1_735_000_000_000 + 1_000);
    expect(eng.pickByPriority(healthyCtx(), 0)).toBeNull();
    eng.tick(1_735_000_000_000 + 7_000);
    expect(eng.pickByPriority(healthyCtx(), 0)).not.toBeNull();
  });
});

describe("DialogueEngine — varian kepribadian (Doc 08 §3)", () => {
  it("elder → varian senior untuk idle", () => {
    const eng = makeEngine();
    eng.setVariant("elder", "tenko");
    expect(LINES.seniorIdle).toContain(eng.pick("idle"));
  });

  it("yako/nogitsune → varian gelap untuk idle & memori lalai", () => {
    const eng = makeEngine();
    eng.setVariant("adult", "nogitsune");
    expect(LINES.darkIdle).toContain(eng.pick("idle"));
    expect(eng.pick("memory_neglect")).toBe("DARKNEG1");
  });

  it("normal tetap baris utama", () => {
    const eng = makeEngine();
    eng.setVariant("adult", "biasa");
    expect(LINES.lines.idle).toContain(eng.pick("idle"));
  });
});
