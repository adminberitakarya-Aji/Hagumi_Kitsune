/** Test memori companion (M6 — Doc 08 §4). */
import { describe, expect, it } from "vitest";

import {
  MEMORY_MAX,
  addMemory,
  findPendingMemory,
  forgiveNeglectMemories,
  hasUnforgivenNeglect,
  markMemorySpoken,
} from "../src/companion/memory";
import { isNeglectMemoryKey } from "../src/companion/types";
import type { MemoryLogEntry } from "../src/index";

function entry(t: number, key: string): MemoryLogEntry {
  return { t, key, detail: "d" };
}

describe("memoryLog (Doc 08 §4)", () => {
  it("maks 20 entri terbaru — terbaru di depan", () => {
    let log: MemoryLogEntry[] = [];
    for (let i = 0; i < 30; i++) log = addMemory(log, entry(i, `ev_${i}`));
    expect(log).toHaveLength(MEMORY_MAX);
    expect(log[0]?.key).toBe("ev_29");
    expect(log.some((e) => e.key === "ev_5")).toBe(false);
  });

  it("memori lalai dikenali sebagai neglect (starved_6h dsb.)", () => {
    expect(isNeglectMemoryKey("starved_6h")).toBe(true);
    expect(isNeglectMemoryKey("left_alone_12h")).toBe(true);
    expect(isNeglectMemoryKey("evolved")).toBe(false);
    expect(isNeglectMemoryKey("hanami")).toBe(false);
  });

  it("findPendingMemory → entri terbaru yang belum diucapkan & belum dimaafkan", () => {
    const log = addMemory([entry(2, "evolved")], entry(3, "starved_6h"));
    const p = findPendingMemory(log);
    expect(p?.entry.key).toBe("starved_6h");
    expect(p?.index).toBe(0);
    // tandai spoken → lanjut ke berikutnya
    const log2 = markMemorySpoken(log, p!.index);
    expect(findPendingMemory(log2)?.entry.key).toBe("evolved");
  });

  it("memori dimaafkan → tak lagi pending & hasUnforgivenNeglect false", () => {
    let log = addMemory([entry(2, "evolved")], entry(3, "starved_6h"));
    expect(hasUnforgivenNeglect(log)).toBe(true);
    const { log: log2, count } = forgiveNeglectMemories(log);
    expect(count).toBe(1);
    expect(log2[0]?.forgiven).toBe(true);
    expect(hasUnforgivenNeglect(log2)).toBe(false);
    expect(findPendingMemory(log2)?.entry.key).toBe("evolved");
  });
});
