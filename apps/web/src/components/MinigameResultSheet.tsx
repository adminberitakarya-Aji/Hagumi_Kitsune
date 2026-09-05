/** Layar hasil mini-game (Doc 05 §6): poin → koin/happiness/rekor, tombol lanjut → Home.
 * M10: ikon UI vector; ikon game dari data minigames.json. */
import { getMinigameById } from "@hagumi/data";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";
import { IconCoin, IconHappy, IconStar, IconTrophy } from "./icons";

export function MinigameResultSheet() {
  const result = useGameState().minigameResult;
  if (!result) return null;

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-label="hasil mini-game">
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__title">
          {result.icon} {result.name}
        </div>
        <div className="sheet__body">
          <div className="mg-result__points">
            <IconStar size={14} /> {result.points} poin
          </div>
          {result.newRecord && (
            <div className="mg-result__record">
              <IconTrophy size={14} /> Rekor baru!
            </div>
          )}
          <ul className="offline-list">
            <li>
              <IconCoin size={14} /> +{result.coins} koin
            </li>
            <li>
              <IconHappy size={14} /> +{result.happiness} happiness
            </li>
            <li>
              <IconTrophy size={14} /> Rekor: {result.best}
            </li>
          </ul>
          <p className="sheet__note">{getMinigameById(result.gameId)?.bonusDesc ?? ""}</p>
        </div>
        <HankoButton size="lg" onClick={() => eventBus.emit("ui/minigame-continue", undefined)}>
          Kembali ke Rumah
        </HankoButton>
      </div>
    </div>
  );
}
