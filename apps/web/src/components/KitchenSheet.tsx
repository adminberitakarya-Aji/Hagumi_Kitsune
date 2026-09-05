/** Dapur (Doc 02 S8, Doc 06 §2): grid inventaris makanan — makan dari stok, bukan beli langsung.
 * Makanan musiman selalu bisa dimakan selama stok ada. Ikon UI vector (M10); ikon item dari data. */
import { eventBus } from "../lib/eventBus";
import { itemsConfig } from "@hagumi/data";
import { useGameState } from "../store/gameState";
import { IconHappy, IconHunger, IconToko } from "./icons";

export function KitchenSheet({ onFed }: { onFed: () => void }) {
  const { inventory, sleeping } = useGameState();

  const cards = itemsConfig.foods.map((food) => ({
    ...food,
    count: inventory.food[food.id] ?? 0,
  }));
  const anyFood = cards.some((c) => c.count > 0);

  return (
    <div className="sheet__body">
      <div className="food-grid">
        {cards.map((card) => {
          const disabled = sleeping || card.count === 0;
          return (
            <button
              key={card.id}
              type="button"
              className="food-card"
              disabled={disabled}
              onClick={() => {
                eventBus.emit("ui/feed", { foodId: card.id });
                onFed();
              }}
            >
              <span className="food-card__icon">{card.icon}</span>
              <span className="food-card__name">{card.name}</span>
              <span className="food-card__meta">
                <IconHunger size={12} />+{card.hunger}
                {card.happiness ? (
                  <>
                    {" · "}
                    <IconHappy size={12} />+{card.happiness}
                  </>
                ) : null}
                {card.count > 0 && <span className="food-card__count">×{card.count}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="sheet__note">
        {sleeping
          ? "Kitsune sedang tidur..."
          : anyFood
            ? (
              <>Stok dari pantry — beli lagi di Toko <IconToko size={12} /></>
            )
            : (
              <>Pantry kosong! Beli makanan di Toko <IconToko size={12} /></>
            )}
      </p>
    </div>
  );
}
