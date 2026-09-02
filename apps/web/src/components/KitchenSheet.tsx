/** Dapur (Doc 02 S8, Doc 06 §2): grid inventaris makanan — makan dari stok, bukan beli langsung.
 * Makanan musiman selalu bisa dimakan selama stok ada. */
import { eventBus } from "../lib/eventBus";
import { itemsConfig } from "@hagumi/data";
import { useGameState } from "../store/gameState";

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
                🍖+{card.hunger}
                {card.happiness ? ` · 😊+${card.happiness}` : ""}
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
            ? "Stok dari pantry — beli lagi di Toko 🏪"
            : "Pantry kosong! Beli makanan di Toko 🏪"}
      </p>
    </div>
  );
}
