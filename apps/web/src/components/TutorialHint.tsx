/** Tutorial ringan Dapur (Doc 04 §5) — tampil sekali di Home, ditutup → flag localStorage. */
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";

export function TutorialHint() {
  const tutorialDone = useGameState().tutorialDone;
  if (tutorialDone) return null;

  return (
    <div className="tutorial">
      <div className="tutorial__arrow" aria-hidden="true">
        ⬆
      </div>
      <p>
        Ketuk tombol 🍵 <b>Dapur</b> untuk memberi makan kitsune-mu. Usap badannya untuk
        membelai!
      </p>
      <button type="button" onClick={() => eventBus.emit("ui/tutorial-dismiss", undefined)}>
        Mengerti ✓
      </button>
    </div>
  );
}
