/** Layar Breeding House (M7 — Doc 12 §9.2): altar, 3 mitra NPC harian, syarat, preview anak. */
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { ELEMENT_ICON, ELEMENT_LABEL } from "../lib/elements";

const REASON_TEXT: Record<string, string> = {
  TOO_YOUNG: "Umur minimal 20 hari (Dewasa)",
  LOW_HEALTH: "Health minimal 80",
  LOW_HAPPINESS: "Happiness minimal 80",
  ON_COOLDOWN: "Cooldown 7 hari belum selesai",
  QUOTA_FULL: "Keturunan maksimal 4 seumur hidup",
};

export function BreedingScreen() {
  const { breeding, coins } = useGameState();
  if (!breeding) return null;
  const canAfford = coins >= breeding.costCoins;

  return (
    <div className="breeding" role="dialog" aria-label="Breeding House">
      <header className="breeding__header">
        <button
          type="button"
          className="breeding__back"
          aria-label="kembali"
          onClick={() => eventBus.emit("ui/breeding-close", undefined)}
        >
          ‹
        </button>
        <h2 className="breeding__title">⛩️ Breeding House</h2>
      </header>

      <p className="breeding__note">
        Mitra NPC berubah setiap hari. Telur diletakkan di altar dan menetas
        saat {breeding.hasEgg ? "saudaranya" : "induknya"} berpulang — garis keluarga berlanjut.
      </p>

      <ul className="breeding__reqs">
        {breeding.reasons.length === 0 ? (
          <li className="breeding__req breeding__req--ok">✅ Semua syarat terpenuhi</li>
        ) : (
          breeding.reasons.map((r) => (
            <li key={r} className="breeding__req">
              ⬜ {REASON_TEXT[r] ?? r}
            </li>
          ))
        )}
        <li className="breeding__req">
          🧾 Keturunan {breeding.childrenCount}/{breeding.maxChildren}
        </li>
      </ul>

      <div className="breeding__partners">
        {breeding.partners.map((p) => (
          <div key={p.id} className="partner-card">
            <div className="partner-card__avatar" style={{ background: p.childCoat }}>
              {ELEMENT_ICON[p.element] ?? "🦊"}
            </div>
            <div className="partner-card__info">
              <div className="partner-card__name">{p.name}</div>
              <div className="partner-card__elem">
                {ELEMENT_LABEL[p.element] ?? p.element} · anak{" "}
                {ELEMENT_LABEL[p.childElement] ?? p.childElement}
              </div>
              <div className="partner-card__coat">
                <span className="swatch" style={{ background: p.childCoat }} />
                warna bulu anak
              </div>
            </div>
            <button
              type="button"
              className="partner-card__btn"
              disabled={!breeding.canBreed || !canAfford}
              onClick={() => eventBus.emit("ui/breeding-start", { partnerId: p.id })}
            >
              −🪙{breeding.costCoins}
            </button>
          </div>
        ))}
      </div>

      {breeding.hasEgg && <p className="breeding__egg">🥚 Telur sudah ada di altar (maks 1)</p>}
      {!canAfford && <p className="breeding__egg">🪙 Koin belum cukup (butuh {breeding.costCoins})</p>}

      {/* M8 — jalur antar-pemain asinkron (Doc 07 §2B) */}
      <div className="breeding__online">
        <button
          type="button"
          className="breeding__online-btn"
          onClick={() => eventBus.emit("ui/online-open", undefined)}
        >
          🌐 Tukar Kode Antar-Pemain
        </button>
        <p className="breeding__egg">
          Tukar Breeding Code dengan pemain lain — telur turunan muncul saat kalian berdua buka game.
        </p>
      </div>
    </div>
  );
}
