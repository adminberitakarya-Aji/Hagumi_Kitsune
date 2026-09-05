/** HankoButton — CTA stempel merah, satu-satunya di tiap layar (Doc 12 §2.2).
 * Dukungan M1.5: `variant` (primary/ghost) & `onHoldComplete` (tekan-lama 0,8 dtk
 * untuk cap hanko — Doc 04 §3, progress ring saat ditahan). */
import { useCallback, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { eventBus } from "../lib/eventBus";
import { haptic } from "../system/haptics";

const HOLD_MS = 800;

interface HankoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "lg" | "md";
  variant?: "primary" | "ghost";
  /** Dipanggil setelah tombol ditekan tahan 0,8 dtk tanpa lepas (Doc 04 §3). */
  onHoldComplete?: () => void;
}

export function HankoButton({
  children,
  size = "md",
  variant = "primary",
  onHoldComplete,
  className = "",
  ...rest
}: HankoButtonProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const stopHold = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(() => {
    haptic("light");
    if (!onHoldComplete) return;
    startRef.current = performance.now();
    const step = (): void => {
      const pct = Math.min(1, (performance.now() - startRef.current) / HOLD_MS);
      setHoldProgress(pct);
      if (pct >= 1) {
        stopHold();
        haptic("success");
        eventBus.emit("sfx/play", { id: "stamp" }); // cap hanko — SFX utama game (M11)
        onHoldComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [onHoldComplete, stopHold]);

  return (
    <button
      type="button"
      className={`hanko hanko--${size} hanko--${variant} ${className}`}
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      {...rest}
    >
      <span className="hanko__cap" aria-hidden="true" />
      {children}
      {holdProgress > 0 && (
        <span
          className="hanko__hold"
          style={{ transform: `scaleX(${holdProgress})` }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
