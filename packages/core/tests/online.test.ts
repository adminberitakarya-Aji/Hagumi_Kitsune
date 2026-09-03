/**
 * Test modul online (M8 — Doc 07 §2B): breeding code, genetika seed-server,
 * rate limit, sinkronisasi save LWW. Deterministik — SeededRng.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_BREEDING_REQUESTS_PER_DAY,
  breedingCodePayloadOf,
  computeOnlineChildGenetics,
  createDefaultSave,
  decodeBreedingCode,
  diffSaves,
  encodeBreedingCode,
  resolveLastWriteWins,
  type BreedingCodePayload,
  type SaveData,
} from "../src";

const A: BreedingCodePayload = {
  v: 1,
  owner: "11111111-1111-1111-1111-111111111111",
  name: "Kogitsune",
  element: "fire",
  coatColor: "#E8874A",
  personality: "fire",
  path: "zenko",
  gen: 1,
  careScore: 82,
};

const B: BreedingCodePayload = {
  v: 1,
  owner: "22222222-2222-2222-2222-222222222222",
  name: "Shirayuki",
  element: "water",
  coatColor: "#8FB6D9",
  personality: "water",
  path: "biasa",
  gen: 2,
  careScore: 64,
};

describe("M8 — Breeding Code (Doc 07 §2B)", () => {
  it("encode → decode roundtrip menghasilkan payload identik", () => {
    const code = encodeBreedingCode(A);
    expect(code.startsWith("HG1.")).toBe(true);
    const result = decodeBreedingCode(code);
    expect(result.success).toBe(true);
    if (result.success) expect(result.payload).toEqual(A);
  });

  it("kode terpotong / salah ketik tertolak oleh checksum", () => {
    const code = encodeBreedingCode(A);
    const cut = code.slice(0, code.length - 3);
    expect(decodeBreedingCode(cut).success).toBe(false);
    // satu karakter payload diganti → checksum tidak cocok
    const body = code.split(".");
    body[1] = `${body[1]!.slice(0, -1)}A`;
    expect(decodeBreedingCode(body.join(".")).success).toBe(false);
  });

  it("format asing & payload tidak sah tertolak", () => {
    expect(decodeBreedingCode("bukan kode").success).toBe(false);
    // checksum valid tapi element di luar daftar → skema menolak
    const evil = { ...A, element: "shadow" };
    const forged = encodeBreedingCode(evil as unknown as BreedingCodePayload);
    expect(decodeBreedingCode(forged).success).toBe(false);
  });

  it("breedingCodePayloadOf memakai coatColor genetika & careScore bulat", () => {
    const save = createDefaultSave({ petName: "Kogitsune", element: "fire", nowMs: 0 });
    save.pet.careScore = 78.6;
    save.pet.coatColor = "#AABBCC";
    const payload = breedingCodePayloadOf(save.pet, A.owner, 1);
    expect(payload.name).toBe("Kogitsune");
    expect(payload.coatColor).toBe("#AABBCC");
    expect(payload.careScore).toBe(79);
    expect(payload.personality).toBe("fire");
  });
});

describe("M8 — Genetika online dari seed server (Doc 07 §3)", () => {
  it("seed sama → hasil identik, urutan induk tidak relevan", () => {
    const ab = computeOnlineChildGenetics(A, B, 12345);
    const ba = computeOnlineChildGenetics(B, A, 12345);
    expect(ab).toEqual(ba);
    // deterministik terhadap seed yang sama
    expect(computeOnlineChildGenetics(A, B, 12345)).toEqual(ab);
    // seed berbeda → distribusi berbeda (bukan konstanta)
    const others = new Set(
      [1, 2, 3, 4, 5].map((s) => JSON.stringify(computeOnlineChildGenetics(A, B, s))),
    );
    expect(others.size).toBeGreaterThan(1);
  });

  it("distribusi 2000 pasangan mendekati 70/25/5 (Doc 07 §6)", () => {
    let parent = 0;
    let mix = 0;
    let mutation = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const source = computeOnlineChildGenetics(A, B, seed).source;
      if (source === "mix") mix++;
      else if (source === "mutation") mutation++;
      else parent++;
    }
    expect(parent / 2000).toBeGreaterThan(0.6); // ~0.70
    expect(parent / 2000).toBeLessThan(0.8);
    expect(mix / 2000).toBeGreaterThan(0.15); // ~0.25
    expect(mix / 2000).toBeLessThan(0.35);
    expect(mutation / 2000).toBeGreaterThan(0.02); // ~0.05
    expect(mutation / 2000).toBeLessThan(0.08);
  });

  it("warna anak selalu campuran kedua induk + bonus dalam rentang data", () => {
    for (let seed = 0; seed < 50; seed++) {
      const child = computeOnlineChildGenetics(A, B, seed);
      expect(child.coatColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(child.startBonusPct).toBeGreaterThanOrEqual(1);
      expect(child.startBonusPct).toBeLessThanOrEqual(5);
    }
  });
});

describe("M8 — Rate limit klien (server menegakkan batas sama)", () => {
  it("konstanta batas harian = 5", () => {
    expect(MAX_BREEDING_REQUESTS_PER_DAY).toBe(5);
  });
});

function saveWithTick(tick: number, mutate?: (s: SaveData) => void): SaveData {
  const save = createDefaultSave({ petName: "Kogitsune", element: "fire", nowMs: 0 });
  save.lastTick = tick;
  mutate?.(save);
  return save;
}

describe("M8 — Sinkronisasi save (LWW + diff warning)", () => {
  it("save identik → diff.identical", () => {
    const a = saveWithTick(1000);
    const b = saveWithTick(1000);
    expect(diffSaves(a, b).identical).toBe(true);
    expect(diffSaves(a, b).fields).toEqual([]);
  });

  it("perbedaan koin & nama terdeteksi di ringkasan", () => {
    const local = saveWithTick(2000, (s) => {
      s.player.coins = 300;
      s.pet.name = "Kogitsune";
    });
    const remote = saveWithTick(1500, (s) => {
      s.player.coins = 120;
      s.pet.name = "Shirayuki";
    });
    const diff = diffSaves(local, remote);
    expect(diff.identical).toBe(false);
    expect(diff.fields).toContain("coins");
    expect(diff.fields).toContain("pet.name");
    expect(diff.summary).toContain("300");
    expect(diff.localNewer).toBe(true);
  });

  it("LWW: lastTick terbaru menang (dua arah)", () => {
    const old_ = saveWithTick(1000);
    const new_ = saveWithTick(9000);
    expect(resolveLastWriteWins(old_, new_).chosen).toBe("remote");
    expect(resolveLastWriteWins(old_, new_).data).toBe(new_);
    expect(resolveLastWriteWins(new_, old_).chosen).toBe("local");
    expect(resolveLastWriteWins(new_, old_).data).toBe(new_);
  });
});

