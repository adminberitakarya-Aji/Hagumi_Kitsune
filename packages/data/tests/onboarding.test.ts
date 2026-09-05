/** Test konfigurasi onboarding FTUE 2.0 (M14 — Doc 14 §6). */
import { describe, expect, it } from "vitest";
import {
  fillOnboardingText,
  getOnboardingHint,
  onboardingConfig,
  onboardingConfigSchema,
} from "../src/onboarding";

describe("onboardingConfig (M14)", () => {
  it("lolos validasi skema fail-fast", () => {
    expect(() => onboardingConfigSchema.parse(onboardingConfig)).not.toThrow();
    expect(onboardingConfig.version).toBe(1);
  });

  it("memuat 5 pemicu kontekstual dari Doc 14 §6 dengan id unik", () => {
    const triggers = onboardingConfig.hints.map((h) => h.trigger);
    expect(triggers).toEqual(["night", "coins_enough", "day_2", "first_poop", "season_event"]);
    const ids = onboardingConfig.hints.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hint memiliki CTA + label yang konsisten (tidak ada hint mati)", () => {
    for (const hint of onboardingConfig.hints) {
      expect(hint.text.length).toBeGreaterThan(0);
      expect((hint.cta === null) === (hint.ctaLabel === null)).toBe(true);
    }
  });

  it("goal hari-1 punya reward seremonial positif + placeholder yang bisa diisi", () => {
    const goal = onboardingConfig.day1Goal;
    expect(goal.rewardCoins).toBeGreaterThan(0);
    expect(goal.title).toContain("{name}");
    const filled = fillOnboardingText(goal.title, { name: "Otta" });
    expect(filled).toBe("Jaga Otta tetap hidup 1 hari penuh");
    expect(fillOnboardingText(goal.rewardToast, { coins: goal.rewardCoins })).toContain(
      String(goal.rewardCoins),
    );
  });

  it("getOnboardingHint menemukan hint & undefined untuk id asing", () => {
    expect(getOnboardingHint("poop_scoop")?.trigger).toBe("first_poop");
    expect(getOnboardingHint("tidak_ada")).toBeUndefined();
  });
});
