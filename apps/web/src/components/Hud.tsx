/** HUD atas 48px (Doc 12 §1.3 — H1 nama+umur, H2 stat mini, H3 health pill, H4 koin, H5 gear).
 * M3: pet-info kini memuat jalur (emoji ekor) + Care Score — tier di Doc 01 §4. */
import { eventBus } from "../lib/eventBus";
import { useGameState, type StatKey } from "../store/gameState";
import { StatBar } from "./StatBar";

const STAT_ICONS: Record<StatKey, string> = {
  hunger: "🍖",
  happiness: "😊",
  energy: "⚡",
  hygiene: "🧼",
};

const STAT_COLORS: Record<StatKey, string> = {
  hunger: "#E0955A",
  happiness: "#F0A8BC",
  energy: "#E8C96A",
  hygiene: "#8FB8D8",
};

const PATH_ICON: Record<string, string> = {
  tenko: "🌟",
  zenko: "⛩️",
  biasa: "🦊",
  yako: "🌑",
  nogitsune: "💀",
};

const PATH_NAME: Record<string, string> = {
  tenko: "Tenko",
  zenko: "Zenko",
  biasa: "Kitsune",
  yako: "Yako",
  nogitsune: "Nogitsune",
};

export function Hud() {
  const { petName, day, stats, coins, health, path, tails, careScore } = useGameState();

  return (
    <header className="hud">
      <div className="pet-info" title={`Care Score: ${careScore} · jalur: ${PATH_NAME[path] ?? path}`}>
        {petName} · Hari {day} · {PATH_ICON[path] ?? "🦊"}
        {"×".repeat(Math.max(tails, 1))} · CS {careScore}
      </div>
      <div className="stats" aria-label="stat pet">
        {(Object.keys(STAT_ICONS) as StatKey[]).map((key) => (
          <StatBar key={key} icon={STAT_ICONS[key]} value={stats[key]} color={STAT_COLORS[key]} />
        ))}
      </div>
      {health < 60 && (
        <div className="health-pill" role="status">
          ❤️ {health}
        </div>
      )}
      <button
        className="coins"
        type="button"
        aria-label="buka toko"
        onClick={() => eventBus.emit("ui/action", { id: "koin" })}
      >
        🪙 {coins}
      </button>
      <button
        className="gear"
        aria-label="pengaturan"
        type="button"
        onClick={() => eventBus.emit("ui/action", { id: "gear" })}
      >
        ⚙️
      </button>
    </header>
  );
}
