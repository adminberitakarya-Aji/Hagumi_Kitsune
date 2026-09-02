/** Layar memorial (Doc 12 §11.4) — momen mono no aware: minimal 4 dtk tenang sebelum interaktif. */
import { useEffect, useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";

const INTERACTIVE_AFTER_MS = 4000;

export function MemorialScreen() {
  const { petName, day } = useGameState();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), INTERACTIVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="memorial" role="dialog" aria-label="memorial">
      <div className="memorial__card">
        <div className="memorial__incense" aria-hidden="true">
          🕯️
        </div>
        <h2 className="memorial__title">Otsukaresama, {petName}</h2>
        <p className="memorial__days">{day} hari penuh kenangan</p>
        <p className="memorial__text">
          Perjalananmu bersama {petName} berakhir di sini.
          <br />
          Cerita ini — dan keturunannya — akan melanjutkannya.
        </p>
        <button
          type="button"
          className="memorial__btn"
          disabled={!ready}
          onClick={() => eventBus.emit("ui/memorial-continue", undefined)}
        >
          {ready ? "🏮 Lanjutkan Perjalanan" : "..."}
        </button>
      </div>
    </div>
  );
}
