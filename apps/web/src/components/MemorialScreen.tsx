/** Layar memorial (Doc 12 §11.4) — momen mono no aware: minimal 4 dtk tenang sebelum interaktif.
 * M7 (Doc 07 §5): bila ada warisan, tampilkan koin kenangan + tombol telur keturunan menetas.
 * M10: ikon vector (Doc 10 §0). */
import { useEffect, useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { ELEMENT_LABEL } from "../lib/elements";
import { IconCandle, IconCoin, IconLove, IconTorii, Egg } from "./icons";

const INTERACTIVE_AFTER_MS = 4000;

export function MemorialScreen() {
  const { petName, day, legacy } = useGameState();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), INTERACTIVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="memorial" role="dialog" aria-label="memorial">
      <div className="memorial__card">
        <div className="memorial__incense" aria-hidden="true">
          <IconCandle size={28} />
        </div>
        <h2 className="memorial__title">Otsukaresama, {petName}</h2>
        <p className="memorial__days">{day} hari penuh kenangan</p>
        <p className="memorial__text">
          Perjalananmu bersama {petName} berakhir di sini.
          <br />
          Cerita ini — dan keturunannya — akan melanjutkannya.
        </p>

        {legacy && (
          <div className="memorial__legacy">
            <p className="memorial__legacy-coins">
              <IconCoin size={14} /> +{legacy.memoryCoins} koin kenangan
            </p>
            {legacy.inheritedItemName && (
              <p className="memorial__legacy-item">
                <IconLove size={14} /> {legacy.inheritedItemName} diwariskan
              </p>
            )}
          </div>
        )}

        {legacy?.hasEgg ? (
          <button
            type="button"
            className="memorial__btn"
            disabled={!ready}
            onClick={() => eventBus.emit("ui/legacy-continue", undefined)}
          >
            {ready ? (
              <>
                <Egg color="#F5EFE0" size={16} /> {legacy.childName ?? "Keturunan"} Menetas
                {legacy.childElement ? ` (${ELEMENT_LABEL[legacy.childElement] ?? legacy.childElement})` : ""}
              </>
            ) : (
              "..."
            )}
          </button>
        ) : (
          <button
            type="button"
            className="memorial__btn"
            disabled={!ready}
            onClick={() => eventBus.emit("ui/memorial-continue", undefined)}
          >
            {ready ? (
              <>
                <IconTorii size={14} /> Lanjutkan Perjalanan
              </>
            ) : (
              "..."
            )}
          </button>
        )}
      </div>
    </div>
  );
}

