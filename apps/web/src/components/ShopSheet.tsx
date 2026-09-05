/** Toko Dagashiya (Doc 12 §6 / Doc 06): 3 tab kategori, beli → ui/buy, cek koin & stok milik.
 * M10: ikon UI vector; ikon item dari data katalog (items.json). */
import type { ReactNode } from "react";
import { useState } from "react";
import { eventBus } from "../lib/eventBus";
import { getSeason, type Season } from "@hagumi/core";
import { getFoodsForSeason, itemsConfig } from "@hagumi/data";
import { useGameState } from "../store/gameState";
import {
  IconAutumn,
  IconCoin,
  IconEnergy,
  IconHappy,
  IconHealth,
  IconHunger,
  IconHygiene,
  IconPill,
  IconSpring,
  IconSummer,
  IconToko,
  IconWinter,
} from "./icons";

type Tab = "makanan" | "obat" | "barang";

const SEASON_ICON: Record<Season, (p: { size?: number }) => ReactNode> = {
  spring: IconSpring,
  summer: IconSummer,
  autumn: IconAutumn,
  winter: IconWinter,
};

export function ShopSheet() {
  const [tab, setTab] = useState<Tab>("makanan");
  const { coins, inventory, nowMs } = useGameState();
  const season = getSeason(nowMs);

  const cards: Array<{ id: string; icon: string; name: string; price: number; note: ReactNode; seasonal?: Season; owned: number }> =
    tab === "makanan"
      ? getFoodsForSeason(season).map((f) => ({
          // Katalog musiman: hanya tampil di musimnya (Doc 06 AC, Doc 03 §4)
          id: f.id,
          icon: f.icon,
          name: f.name,
          price: f.price,
          note: (
            <>
              <IconHunger size={12} />+{f.hunger}
              {f.happiness ? (
                <>
                  {" · "}
                  <IconHappy size={12} />+{f.happiness}
                </>
              ) : null}
            </>
          ),
          seasonal: f.season,
          owned: inventory.food[f.id] ?? 0,
        }))
      : tab === "obat"
        ? itemsConfig.medicines.map((m) => ({
            id: m.id,
            icon: m.icon,
            name: m.name,
            price: m.price,
            note: (
              <>
                {Object.entries(m.effects).map(([k, v]) => (
                  <span key={k}>
                    {k === "health" ? <IconHealth size={12} /> : k === "energy" ? <IconEnergy size={12} /> : <IconHygiene size={12} />}
                    +{v}{" "}
                  </span>
                ))}
              </>
            ),
            seasonal: undefined,
            owned: inventory.medicine[m.id] ?? 0,
          }))
        : itemsConfig.misc.map((m) => ({
            id: m.id,
            icon: m.icon,
            name: m.name,
            price: m.price,
            note: m.passive?.happinessDecayPct ? (
              <>
                <IconHappy size={12} /> decay {m.passive.happinessDecayPct}%
              </>
            ) : (
              "Dekorasi ruangan"
            ),
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
            {t === "makanan" ? <IconHunger size={13} /> : t === "obat" ? <IconPill size={13} /> : <IconToko size={13} />} {t.charAt(0).toUpperCase() + t.slice(1)}
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
                      {(() => {
                        const SeasonIcon = SEASON_ICON[card.seasonal];
                        return <SeasonIcon size={13} />;
                      })()}
                    </span>
                  )}
                  {card.owned > 0 && <span className="shop-item__owned">×{card.owned}</span>}
                </span>
                <span className="shop-item__note">{card.note}</span>
              </span>
              <span className="shop-item__price">
                <IconCoin size={13} />
                {card.price}
              </span>
            </button>
          );
        })}
      </div>
      <p className="sheet__note">
        {coins < 20 ? "Koinmu menipis — sapu poop & main mini-game untuk tambahan!" : "Item musiman hanya tampil di musimnya."}
      </p>
    </div>
  );
}
