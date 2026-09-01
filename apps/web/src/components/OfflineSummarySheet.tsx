/** Ringkasan offline saat buka game (Doc 12 §11.1) — WasbiPanel via App. */
import { setUiState, useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";

function formatElapsed(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h} jam ${m} mnt` : `${m} menit`;
}

export function OfflineSummarySheet() {
  const offline = useGameState().offline;
  if (!offline) return null;

  const chronology: string[] = [];
  chronology.push(`⏱️ Kamu pergi selama ${formatElapsed(offline.elapsedHours)}`);
  if (offline.poopsSpawned > 0) chronology.push(`💩 ${offline.poopsSpawned} kotoran di tatami`);
  if (offline.becameSick) chronology.push("😷 Kitsune jatuh sakit!");
  if (offline.died) chronology.push("🕯️ Kitsune telah berpulang...");
  if (!offline.becameSick && !offline.died && offline.poopsSpawned === 0) {
    chronology.push("❤️ Ia menunggumu dengan setia");
  }

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-label="ringkasan offline">
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__title">Selamat datang kembali</div>
        <div className="sheet__body">
          <p className="offline-summary">{offline.summaryText}</p>
          <ul className="offline-list">
            {chronology.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {offline.died && <p className="sheet__note">Layar memorial hadir di M2.</p>}
        </div>
        <HankoButton size="lg" onClick={() => setUiState({ offline: null })}>
          Tetap Semangat!
        </HankoButton>
      </div>
    </div>
  );
}
