/** Hint kontekstual FTUE 2.0 (M14 — Doc 14 §6): tampil SEKALI per pemicu (ditandai
 * "seen" saat ditampilkan — tidak pernah muncul 2×), satu CTA hanko opsional.
 * Gaya mengikuti tutorial ringan Doc 04 §5; ikon vector (M10, Doc 10 §0). */
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { IconCheck, IconLove } from "./icons";

export function ContextHint() {
  const { hint } = useGameState();
  if (!hint) return null;

  const cta = hint.cta;
  return (
    <div className="hint-ctx" role="status">
      <span className="hint-ctx__icon" aria-hidden="true">
        <IconLove size={16} />
      </span>
      <p className="hint-ctx__text">{hint.text}</p>
      <div className="hint-ctx__actions">
        {cta !== null && hint.ctaLabel !== null && (
          <button
            type="button"
            className="hint-ctx__cta"
            onClick={() => eventBus.emit("ui/hint-cta", { cta })}
          >
            {hint.ctaLabel}
          </button>
        )}
        <button
          type="button"
          className="hint-ctx__close"
          aria-label="Tutup hint"
          onClick={() => eventBus.emit("ui/hint-dismiss", undefined)}
        >
          <IconCheck size={12} />
        </button>
      </div>
    </div>
  );
}
