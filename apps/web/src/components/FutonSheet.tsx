/** Futon stub (Doc 02 S7): tidurkan/bangunkan; overlay redup dikontrol App via state `sleeping`. */
import { eventBus } from "../lib/eventBus";
import { HankoButton } from "./HankoButton";
import { useGameState } from "../store/gameState";

export function FutonSheet({ onDone }: { onDone: () => void }) {
  const { sleeping } = useGameState();

  return (
    <div className="sheet__body">
      <p>
        {sleeping
          ? "Kitsune sedang tidur nyenyak... Energi pulih saat tertidur (regen asli di Fase B)."
          : "Tidurkan kitsune? Ia akan menolak aksi lain selagi tidur."}
      </p>
      <HankoButton
        size="lg"
        onClick={() => {
          eventBus.emit("ui/sleep", { on: !sleeping });
          onDone();
        }}
      >
        {sleeping ? "☀️ Bangunkan" : "🛏️ Tidurkan"}
      </HankoButton>
    </div>
  );
}
