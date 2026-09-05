/** Banner sakit (Doc 12 §11.5) — muncul saat state SICK; tombol → ui/use-medicine (runtime pilih obat termurah tersedia).
 * M10: ikon vector (Doc 10 §0). M11: haptic warn. */
import { useEffect } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { IconMask, IconPill, IconToko } from "./icons";
import { haptic } from "../system/haptics";

export function SickBanner() {
  const { sick, inventory } = useGameState();

  useEffect(() => {
    if (sick) {
      haptic("warn");
      eventBus.emit("sfx/play", { id: "sneeze" }); // bersin — pet sakit (M11)
    }
  }, [sick]);

  if (!sick) return null;

  const hasMedicine = Object.values(inventory.medicine).some((n) => n > 0);

  return (
    <div className="sick-banner" role="alert">
      <span className="sick-banner__text">
        <IconMask size={14} /> Kitsune sakit! Suhunya panas...
      </span>
      {hasMedicine ? (
        <button
          type="button"
          className="sick-banner__btn"
          onClick={() => eventBus.emit("ui/use-medicine", undefined)}
        >
          <IconPill size={14} /> Obati
        </button>
      ) : (
        <button
          type="button"
          className="sick-banner__btn"
          onClick={() => eventBus.emit("ui/action", { id: "toko" })}
        >
          <IconToko size={14} /> Beli Obat
        </button>
      )}
    </div>
  );
}
