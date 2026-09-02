/** Test katalog item & aturan (Doc 06) — validasi data, bukan angka. */
import { describe, expect, it } from "vitest";
import {
  getFoodsForSeason,
  getItemById,
  getMedicines,
  itemsConfig,
  rulesConfig,
} from "../src/index";

describe("items.json (Doc 06 §2)", () => {
  it("katalog inti lengkap", () => {
    expect(itemsConfig.foods).toHaveLength(8);
    expect(itemsConfig.medicines).toHaveLength(3);
    expect(itemsConfig.misc.length).toBeGreaterThanOrEqual(8);
  });

  it("starter food ada & harga sesuai tabel Doc 06", () => {
    const rice = getItemById("rice_ball");
    expect(rice && "hunger" in rice ? rice.hunger : 0).toBe(20);
    const syrup = getItemById("syrup");
    expect(syrup && "price" in syrup ? syrup.price : 0).toBe(30);
  });

  it("item musiman hanya muncul di musimnya", () => {
    const spring = getFoodsForSeason("spring").map((f) => f.id);
    expect(spring).toContain("rice_ball"); // non-musiman selalu ada
    expect(spring).toContain("sakura_mochi");
    expect(spring).not.toContain("kakigori");
    expect(getFoodsForSeason("summer").map((f) => f.id)).toContain("kakigori");
  });

  it("sirup punya cooldown 4 jam (Doc 06 §2)", () => {
    const syrup = getMedicines().find((m) => m.id === "syrup");
    expect(syrup?.cooldownHours).toBe(4);
  });
});

describe("rules.json (ROADMAP M2)", () => {
  it("aturan poop konsisten dengan desain", () => {
    expect(rulesConfig.poop.baseIntervalHours).toBe(4);
    expect(rulesConfig.poop.maxPoops).toBe(3);
    expect(rulesConfig.scoop.holdMs).toBe(400);
    expect(rulesConfig.cure.cooldownHours).toBe(4);
    expect(rulesConfig.inventory.foodCapacity).toBe(20);
  });

  it("tabel hadiah login 7 hari (Doc 06 §4)", () => {
    expect(rulesConfig.loginRewards).toEqual([20, 30, 40, 60, 80, 120, 200]);
  });
});
