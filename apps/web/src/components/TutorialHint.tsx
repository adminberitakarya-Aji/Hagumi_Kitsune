/** Tutorial ringan Dapur (Doc 04 §5) — tampil sekali di Home, ditutup → flag localStorage.
 * M10: ikon vector (Doc 10 §0). */
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { IconChevron, IconCheck, IconDapur } from "./icons";

export function TutorialHint() {
  const tutorialDone = useGameState().tutorialDone;
  if (tutorialDone) return null;

  return (
    <div className="tutorial">
      <div className="tutorial__arrow" aria-hidden="true">
        <IconChevron size={18} />
      </div>
      <p>
        Ketuk tombol <IconDapur size={14} /> <b>Dapur</b> untuk memberi makan kitsune-mu. Usap
        badannya untuk membelai!
      </p>
      <button type="button" onClick={() => eventBus.emit("ui/tutorial-dismiss", undefined)}>
        <IconCheck size={12} /> Mengerti
      </button>
    </div>
  );
}
