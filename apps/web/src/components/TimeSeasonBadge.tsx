/** Ikon waktu + bingkai musim (Doc 12 §1.3, x312 y88, non-interaktif) — dari TimeService core (Doc 03).
 * Memakai jam simulasi dari store agar ikut time-lapse debug. Ikon vector (M10, Doc 10 §0). */
import type { ReactNode } from "react";
import { getDayPhase, getSeason, type DayPhase, type Season } from "@hagumi/core";
import { useGameState } from "../store/gameState";
import { IconDusk, IconMoon, IconSun, IconSunrise, type IconProps } from "./icons";

const PHASE_ICON: Record<DayPhase, (p: IconProps) => ReactNode> = {
  morning: IconSunrise,
  day: IconSun,
  evening: IconDusk,
  night: IconMoon,
};

const SEASON_COLOR: Record<Season, string> = {
  spring: "#F0A8BC",
  summer: "#7FB069",
  autumn: "#E0955A",
  winter: "#8FB8D8",
};

const SEASON_NAME: Record<Season, string> = {
  spring: "Haru",
  summer: "Natsu",
  autumn: "Aki",
  winter: "Fuyu",
};

export function TimeSeasonBadge() {
  const nowMs = useGameState().nowMs;
  const Phase = PHASE_ICON[getDayPhase(nowMs)];
  const season = getSeason(nowMs);

  return (
    <div
      className="time-badge"
      style={{ borderColor: SEASON_COLOR[season] }}
      title={`${SEASON_NAME[season]} · ${getDayPhase(nowMs)}`}
    >
      <Phase size={20} />
    </div>
  );
}
