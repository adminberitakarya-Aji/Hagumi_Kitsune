/** Panel debug time-lapse (Doc 03 §6) — hanya render di build dev (`pnpm dev`).
 * M10: ikon vector (Doc 10 §0). */
import { eventBus } from "../lib/eventBus";
import type { DayPhase } from "@hagumi/core";
import { IconDusk, IconMoon, IconSun, IconSunrise, type IconProps } from "./icons";
import type { ReactNode } from "react";

const SPEEDS = [1, 10, 60, 3600] as const;
const PHASES: Array<{ id: DayPhase; Icon: (p: IconProps) => ReactNode }> = [
  { id: "morning", Icon: IconSunrise },
  { id: "day", Icon: IconSun },
  { id: "evening", Icon: IconDusk },
  { id: "night", Icon: IconMoon },
];

export function DebugPanel() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="debug-panel" aria-label="panel debug">
      <div className="debug-row">
        {SPEEDS.map((s) => (
          <button key={s} type="button" className="debug-btn" onClick={() => eventBus.emit("debug/speed", { multiplier: s })}>
            ×{s}
          </button>
        ))}
      </div>
      <div className="debug-row">
        {PHASES.map(({ id, Icon }) => (
          <button key={id} type="button" className="debug-btn" onClick={() => eventBus.emit("debug/set-phase", { phase: id })}>
            <Icon size={16} />
          </button>
        ))}
        <button type="button" className="debug-btn debug-btn--wide" onClick={() => eventBus.emit("debug/skip-day", undefined)}>
          +1 hari
        </button>
        <button
          type="button"
          className="debug-btn debug-btn--wide"
          onClick={() => {
            window.location.hash = "#gallery";
          }}
        >
          Komponen
        </button>
      </div>
    </div>
  );
}
