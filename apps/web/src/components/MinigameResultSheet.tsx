/** Layar hasil mini-game (Doc 05 §6): poin → koin/happiness/rekor, tombol lanjut → Home. */
import { getMinigameById } from "@hagumi/data";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";

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
          <div className="mg-result__points">⭐ {result.points} poin</div>
          {result.newRecord && <div className="mg-result__record">🏅 Rekor baru!</div>}
          <ul className="offline-list">
            <li>🪙 +{result.coins} koin</li>
            <li>😊 +{result.happiness} happiness</li>
            <li>🏆 Rekor: {result.best}</li>
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
