/** Toko Dagashiya (Doc 12 §6 / Doc 06): 3 tab kategori, beli → ui/buy, cek koin & stok milik. */
import { useState } from "react";
import { eventBus } from "../lib/eventBus";
import { getSeason, type Season } from "@hagumi/core";
import { getFoodsForSeason, itemsConfig } from "@hagumi/data";
import { useGameState } from "../store/gameState";

type Tab = "makanan" | "obat" | "barang";

const SEASON_ICON: Record<Season, string> = {
  spring: "🌸",
  summer: "🍉",
  autumn: "🍁",
  winter: "❄️",
};

export function ShopSheet() {
  const [tab, setTab] = useState<Tab>("makanan");
  const { coins, inventory, nowMs } = useGameState();
  const season = getSeason(nowMs);

  const cards =
    tab === "makanan"
      ? getFoodsForSeason(season).map((f) => ({
          // Katalog musiman: hanya tampil di musimnya (Doc 06 AC, Doc 03 §4)
          id: f.id,
          icon: f.icon,
          name: f.name,
          price: f.price,
          note: `🍖+${f.hunger}${f.happiness ? ` · 😊+${f.happiness}` : ""}`,
          seasonal: f.season,
          owned: inventory.food[f.id] ?? 0,
        }))
      : tab === "obat"
        ? itemsConfig.medicines.map((m) => ({
            id: m.id,
            icon: m.icon,
            name: m.name,
            price: m.price,
            note: Object.entries(m.effects)
              .map(([k, v]) => `${k === "health" ? "❤️" : k === "energy" ? "⚡" : "🫧"}+${v}`)
              .join(" "),
            seasonal: undefined,
            owned: inventory.medicine[m.id] ?? 0,
          }))
        : itemsConfig.misc.map((m) => ({
            id: m.id,
            icon: m.icon,
            name: m.name,
            price: m.price,
            note: m.passive?.happinessDecayPct
              ? `😊 decay ${m.passive.happinessDecayPct}%`
              : "Dekorasi ruangan",
            seasonal: undefined,
            owned: inventory.owned.includes(m.id) ? 1 : 0,
          }));

  return (
    <div className="sheet__body">
      <div className="shop-tabs" role="tablist">
        {(["makanan", "obat", "barang"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`shop-tab${tab === t ? " shop-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "makanan" ? "🍡 Makanan" : t === "obat" ? "💊 Obat" : "🏮 Barang"}
          </button>
        ))}
      </div>
      <div className="shop-list">
        {cards.map((card) => {
          const disabled = coins < card.price;
          return (
            <button
              key={card.id}
              type="button"
              className="shop-item"
              disabled={disabled}
              onClick={() => eventBus.emit("ui/buy", { itemId: card.id })}
            >
              <span className="shop-item__icon">{card.icon}</span>
              <span className="shop-item__text">
                <span className="shop-item__name">
                  {card.name}
                  {card.seasonal && (
                    <span
                      className={`shop-item__season${card.seasonal === season ? " shop-item__season--now" : ""}`}
                    >
                      {SEASON_ICON[card.seasonal]}
                    </span>
                  )}
                  {card.owned > 0 && <span className="shop-item__owned">×{card.owned}</span>}
                </span>
                <span className="shop-item__note">{card.note}</span>
              </span>
              <span className="shop-item__price">🪙{card.price}</span>
            </button>
          );
        })}
      </div>
      <p className="sheet__note">
        {coins < 20 ? "Koinmu menipis — sapu poop & main mini-game (M4) untuk tambahan!" : "Item musiman hanya tampil 🗓️ di musimnya."}
      </p>
    </div>
  );
}
