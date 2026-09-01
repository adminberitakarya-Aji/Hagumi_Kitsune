/** STUB M1 Fase C — katalog makanan sementara. Pindah ke `packages/data/items.json`
 * (skema Doc 06) saat M2, lalu load lewat `@hagumi/data`. */
export interface FoodDef {
  id: string;
  icon: string;
  name: string;
  price: number;
  hunger: number;
  happiness?: number;
}

export const FOODS: FoodDef[] = [
  { id: "gohan", icon: "🍚", name: "Nasi Putih", price: 10, hunger: 20 },
  { id: "sake", icon: "🐟", name: "Salmon", price: 25, hunger: 40 },
  { id: "dango", icon: "🍡", name: "Dango", price: 15, hunger: 10, happiness: 8 },
];
