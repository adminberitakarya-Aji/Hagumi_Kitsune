/**
 * Skema & loader katalog item (Doc 06 §2 — "Tidak ada angka harga/efek di kode").
 * Fail-fast saat load: harga/efek rusak → error saat boot, bukan di tengah permainan.
 */
import { z } from "zod";
import itemsJson from "../data/items.json";

export const SEASON_KEYS = ["spring", "summer", "autumn", "winter"] as const;
export type SeasonKey = (typeof SEASON_KEYS)[number];

const foodSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  price: z.number().int().positive(),
  hunger: z.number().int(),
  happiness: z.number().int(),
  season: z.enum(SEASON_KEYS).optional(),
});

const medicineSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  price: z.number().int().positive(),
  effects: z.object({
    health: z.number().int().optional(),
    energy: z.number().int().optional(),
    hygiene: z.number().int().optional(),
  }),
  cooldownHours: z.number().positive().optional(),
});

const miscSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  price: z.number().int().positive(),
  kind: z.enum(["toy", "decor", "egg"]),
  passive: z.object({ happinessDecayPct: z.number() }).optional(),
});

export const itemsConfigSchema = z.object({
  foods: z.array(foodSchema),
  medicines: z.array(medicineSchema),
  misc: z.array(miscSchema),
});

export type FoodItem = z.infer<typeof foodSchema>;
export type MedicineItem = z.infer<typeof medicineSchema>;
export type MiscItem = z.infer<typeof miscSchema>;
export type ItemsConfig = z.infer<typeof itemsConfigSchema>;

export const itemsConfig: ItemsConfig = itemsConfigSchema.parse(itemsJson);

/** Semua id unik lintas kategori (mencegah konflik inventory). */
function assertUniqueIds(): void {
  const ids = [
    ...itemsConfig.foods.map((f) => f.id),
    ...itemsConfig.medicines.map((m) => m.id),
    ...itemsConfig.misc.map((m) => m.id),
  ];
  if (new Set(ids).size !== ids.length) {
    throw new Error("items.json: ada id duplikat lintas kategori");
  }
}
assertUniqueIds();

/** Makanan yang tersedia di musim tertentu (Doc 06 AC: item musiman hanya musimnya). */
export function getFoodsForSeason(season?: SeasonKey): FoodItem[] {
  return itemsConfig.foods.filter((f) => f.season === undefined || f.season === season);
}

export function getMedicines(): MedicineItem[] {
  return itemsConfig.medicines;
}

export function getMisc(): MiscItem[] {
  return itemsConfig.misc;
}

export function getItemById(id: string): FoodItem | MedicineItem | MiscItem | undefined {
  return (
    itemsConfig.foods.find((f) => f.id === id) ??
    itemsConfig.medicines.find((m) => m.id === id) ??
    itemsConfig.misc.find((m) => m.id === id)
  );
}
