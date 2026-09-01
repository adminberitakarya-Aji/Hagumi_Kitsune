/** Ikon waktu + bingkai musim (Doc 12 §1.3, x312 y88, non-interaktif) — dari TimeService core (Doc 03).
 * Memakai jam simulasi dari store agar ikut time-lapse debug. */
import { getDayPhase, getSeason, type DayPhase, type Season } from "@hagumi/core";
import { useGameState } from "../store/gameState";

const PHASE_ICON: Record<DayPhase, string> = {
  morning: "🌅",
  day: "☀️",
  evening: "🌇",
  night: "🌙",
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
  const phase = PHASE_ICON[getDayPhase(nowMs)];
  const season = getSeason(nowMs);

  return (
    <div
      className="time-badge"
      style={{ borderColor: SEASON_COLOR[season] }}
      title={`${SEASON_NAME[season]} · ${getDayPhase(nowMs)}`}
    >
      {phase}
    </div>
  );
}
