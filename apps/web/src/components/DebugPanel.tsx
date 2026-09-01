/** Panel debug time-lapse (Doc 03 §6) — hanya render di build dev (`pnpm dev`). */
import { eventBus } from "../lib/eventBus";
import type { DayPhase } from "@hagumi/core";

const SPEEDS = [1, 10, 60, 3600] as const;
const PHASES: Array<{ id: DayPhase; icon: string }> = [
  { id: "morning", icon: "🌅" },
  { id: "day", icon: "☀️" },
  { id: "evening", icon: "🌇" },
  { id: "night", icon: "🌙" },
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
        {PHASES.map((p) => (
          <button key={p.id} type="button" className="debug-btn" onClick={() => eventBus.emit("debug/set-phase", { phase: p.id })}>
            {p.icon}
          </button>
        ))}
        <button type="button" className="debug-btn debug-btn--wide" onClick={() => eventBus.emit("debug/skip-day", undefined)}>
          +1 hari
        </button>
      </div>
    </div>
  );
}
