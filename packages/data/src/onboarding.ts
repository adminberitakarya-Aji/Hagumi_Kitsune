/**
 * Skema & loader konfigurasi onboarding FTUE 2.0 (M14 — Doc 14 §6).
 * Data-driven (bukan flag tunggal): goal hari-1 + hint kontekstual dengan pemicu
 * yang dievaluasi runtime oleh gameSystem. Fail-fast saat load seperti behavior.ts.
 * Placeholder "{name}" & "{coins}" pada teks diisi runtime (fillOnboardingText).
 */
import { z } from "zod";
import onboardingJson from "../data/onboarding.json";

/** Pemicu kontekstual hint (Doc 14 §6): malam→futon · koin cukup→toko · hari-2→album · poop→sapu · event→CTA. */
export const onboardingHintTriggerSchema = z.enum([
  "night",
  "coins_enough",
  "day_2",
  "first_poop",
  "season_event",
]);
export type OnboardingHintTrigger = z.infer<typeof onboardingHintTriggerSchema>;

/** Tujuan CTA hint: futon/toko → sheet App · album → layar Album · garden → scene Taman. */
export const onboardingHintCtaSchema = z.enum(["futon", "toko", "album", "garden"]);
export type OnboardingHintCta = z.infer<typeof onboardingHintCtaSchema>;

export const onboardingHintSchema = z
  .object({
    id: z.string().min(1),
    trigger: onboardingHintTriggerSchema,
    text: z.string().min(1),
    cta: onboardingHintCtaSchema.nullable().default(null),
    ctaLabel: z.string().min(1).nullable().default(null),
    /** Ambang koin untuk pemicu coins_enough (diabaikan pemicu lain). */
    coinsThreshold: z.number().int().nonnegative().default(0),
  })
  .refine((h) => (h.cta === null) === (h.ctaLabel === null), {
    message: "cta dan ctaLabel harus dipasangkan (keduanya ada atau keduanya null)",
  })
  .refine((h) => h.trigger !== "coins_enough" || h.coinsThreshold > 0, {
    message: "pemicu coins_enough wajib punya coinsThreshold > 0",
  });
export type OnboardingHint = z.infer<typeof onboardingHintSchema>;

export const onboardingConfigSchema = z.object({
  version: z.literal(1),
  day1Goal: z.object({
    /** Teks goal hari-1; "{name}" diganti nama pet runtime. */
    title: z.string().min(1),
    subtitle: z.string().min(1),
    /** Koin seremonial saat hari-2 tercapai dan pet masih hidup. */
    rewardCoins: z.number().int().positive(),
    /** Toast saat reward diberikan; "{coins}" diganti jumlah koin. */
    rewardToast: z.string().min(1),
    /** Detail entri memoryLog seremonial (Doc 08 §4). */
    memoryDetail: z.string().min(1),
  }),
  /** Urutan array = prioritas tampil saat beberapa pemicu aktif bersamaan. */
  hints: z.array(onboardingHintSchema).min(1),
});
export type OnboardingConfig = z.infer<typeof onboardingConfigSchema>;

export const onboardingConfig: OnboardingConfig = onboardingConfigSchema.parse(onboardingJson);

/** Hint berdasarkan id (undefined bila tidak ada). */
export function getOnboardingHint(id: string): OnboardingHint | undefined {
  return onboardingConfig.hints.find((h) => h.id === id);
}

/** Isi placeholder teks onboarding: {name} → nama pet, {coins} → angka. */
export function fillOnboardingText(text: string, vars: { name?: string; coins?: number }): string {
  return text
    .replaceAll("{name}", vars.name ?? "kitsune-mu")
    .replaceAll("{coins}", vars.coins !== undefined ? String(vars.coins) : "");
}
