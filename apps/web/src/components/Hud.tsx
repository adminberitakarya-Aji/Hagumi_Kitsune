/** HUD atas 48px (Doc 12 §1.3 — H1 nama+umur, H2 stat mini, H3 health pill, H4 koin, H5 gear).
 * M3: pet-info kini memuat jalur (ikon ekor) + Care Score — tier di Doc 01 §4.
 * M10: semua ikon = vector SVG (Doc 10 §0). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState, type StatKey } from "../store/gameState";
import { StatBar } from "./StatBar";
import {
  FoxFace,
  IconCoin,
  IconCrescent,
  IconEnergy,
  IconGear,
  IconHappy,
  IconHealth,
  IconHunger,
  IconHygiene,
  IconStar,
  IconTorii,
} from "./icons";

const STAT_ICONS: Record<StatKey, ReactNode> = {
  hunger: <IconHunger size={14} />,
  happiness: <IconHappy size={14} />,
  energy: <IconEnergy size={14} />,
  hygiene: <IconHygiene size={14} />,
};

const STAT_COLORS: Record<StatKey, string> = {
  hunger: "#E0955A",
  happiness: "#F0A8BC",
  energy: "#E8C96A",
  hygiene: "#8FB8D8",
};

const PATH_ICON: Record<string, ReactNode> = {
  tenko: <IconStar size={14} />,
  zenko: <IconTorii size={14} />,
  biasa: <FoxFace size={14} />,
  yako: <IconCrescent size={14} />,
  nogitsune: <FoxFace size={14} color="#9A7AB8" />,
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

  // Koin float ±n (Doc 12 §12 — M12 Fase B)
  const prevCoins = useRef(coins);
  const [coinFloat, setCoinFloat] = useState<{ key: number; delta: number } | null>(null);
  useEffect(() => {
    if (coins === prevCoins.current) return;
    const delta = coins - prevCoins.current;
    prevCoins.current = coins;
    if (delta === 0) return;
    setCoinFloat({ key: Date.now(), delta });
    const t = window.setTimeout(() => setCoinFloat(null), 950);
    return () => window.clearTimeout(t);
  }, [coins]);

  return (
    <header className="hud">
      <div className="pet-info" title={`Care Score: ${careScore} · jalur: ${PATH_NAME[path] ?? path}`}>
        {petName} · Hari {day} {PATH_ICON[path] ?? <FoxFace size={14} />}
        {"×".repeat(Math.max(tails, 1))} · CS {careScore}
      </div>
      <div className="stats" aria-label="stat pet">
        {(Object.keys(STAT_ICONS) as StatKey[]).map((key) => (
          <StatBar key={key} icon={STAT_ICONS[key]} value={stats[key]} color={STAT_COLORS[key]} />
        ))}
      </div>
      {health < 60 && (
        <div className="health-pill" role="status">
          <IconHealth size={12} /> {health}
        </div>
      )}
      <button
        className="coins"
        type="button"
        aria-label="buka toko"
        onClick={() => eventBus.emit("ui/action", { id: "koin" })}
      >
        <IconCoin size={14} /> {coins}
        {coinFloat && (
          <span key={coinFloat.key} className="coin-float">
            {coinFloat.delta > 0 ? "+" : ""}
            {coinFloat.delta}
          </span>
        )}
      </button>
      <button
        className="gear"
        aria-label="pengaturan"
        type="button"
        onClick={() => eventBus.emit("ui/action", { id: "gear" })}
      >
        <IconGear size={20} />
      </button>
    </header>
  );
}
