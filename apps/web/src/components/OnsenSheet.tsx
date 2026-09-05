/** Onsen stub (Doc 02 S6): gesture 5 sapuan → milestone berikutnya; sekarang tombol → hygiene 100. */
import { eventBus } from "../lib/eventBus";
import { HankoButton } from "./HankoButton";
import { useGameState } from "../store/gameState";
import { IconOnsen } from "./icons";

export function OnsenSheet({ onDone }: { onDone: () => void }) {
  const { sleeping, stats } = useGameState();

  return (
    <div className="sheet__body">
      <p>
        Di scene Onsen nanti: sapu punggung kitsune 5× (gesture). Untuk sekarang — tombol stub,
        hygiene langsung penuh.
      </p>
      <HankoButton
        size="lg"
        disabled={sleeping || stats.hygiene >= 100}
        onClick={() => {
          eventBus.emit("ui/bath", undefined);
          onDone();
        }}
      >
        <IconOnsen size={16} /> Mandi
      </HankoButton>
      <p className="sheet__note">
        {stats.hygiene >= 100 ? "Kitsune sudah bersih!" : `Hygiene sekarang: ${stats.hygiene}/100`}
      </p>
    </div>
  );
}
