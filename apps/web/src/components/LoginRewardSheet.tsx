/** Hadiah login harian (Doc 12 §11.2) — streak dari core (Doc 06 §4); tutup = state UI murni. */
import { setUiState, useGameState } from "../store/gameState";
import { eventBus } from "../lib/eventBus";
import { HankoButton } from "./HankoButton";
import { IconCoin } from "./icons";

export function LoginRewardSheet() {
  const reward = useGameState().loginReward;
  if (!reward) return null;

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-label="hadiah login">
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__title">Streak Login Hari ke-{reward.day}</div>
        <div className="sheet__body login-reward">
          <div className="login-reward__coin" aria-hidden="true">
            <IconCoin size={44} />
          </div>
          <p className="login-reward__amount">+{reward.coins} koin</p>
          <p className="sheet__note">
            Kembali besok untuk streak berikutnya — hari ke-8 memberi bonus spesial!
          </p>
          <HankoButton size="lg" onClick={() => {
            eventBus.emit("sfx/play", { id: "coin" }); // klaim hadiah koin (M11)
            setUiState({ loginReward: null });
          }}>
            Terima
          </HankoButton>
        </div>
      </div>
    </div>
  );
}
