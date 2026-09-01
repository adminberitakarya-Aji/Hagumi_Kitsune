/** Dapur stub (Doc 02 S8): 3 makanan hard-coded dari data stub — katalog asli di M2 (Doc 06). */
import { eventBus } from "../lib/eventBus";
import { FOODS } from "../data/foods";
import { useGameState } from "../store/gameState";

export function KitchenSheet({ onFed }: { onFed: () => void }) {
  const { coins, sleeping } = useGameState();

  return (
    <div className="sheet__body">
      <div className="food-grid">
        {FOODS.map((food) => {
          const disabled = sleeping || coins < food.price;
          return (
            <button
              key={food.id}
              type="button"
              className="food-card"
              disabled={disabled}
              onClick={() => {
                eventBus.emit("ui/feed", { foodId: food.id });
                onFed();
              }}
            >
              <span className="food-card__icon">{food.icon}</span>
              <span className="food-card__name">{food.name}</span>
              <span className="food-card__meta">
                🪙{food.price} · 🍖+{food.hunger}
                {food.happiness ? ` · 😊+${food.happiness}` : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="sheet__note">
        {sleeping ? "Kitsune sedang tidur..." : "Stok pantry stub — katalog & inventory lengkap di M2."}
      </p>
    </div>
  );
}
