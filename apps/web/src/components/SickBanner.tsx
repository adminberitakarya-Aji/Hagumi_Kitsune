/** Banner sakit (Doc 12 §11.5) — muncul saat state SICK; tombol → ui/use-medicine (runtime pilih obat termurah tersedia). */
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";

export function SickBanner() {
  const { sick, inventory } = useGameState();
  if (!sick) return null;

  const hasMedicine = Object.values(inventory.medicine).some((n) => n > 0);

  return (
    <div className="sick-banner" role="alert">
      <span className="sick-banner__text">😷 Kitsune sakit! Suhunya panas...</span>
      {hasMedicine ? (
        <button
          type="button"
          className="sick-banner__btn"
          onClick={() => eventBus.emit("ui/use-medicine", undefined)}
        >
          💊 Obati
        </button>
      ) : (
        <button
          type="button"
          className="sick-banner__btn"
          onClick={() => eventBus.emit("ui/action", { id: "toko" })}
        >
          🏪 Beli Obat
        </button>
      )}
    </div>
  );
}
