/** Ringkasan offline saat buka game (Doc 12 §11.1) — WashiPanel via App.
 * M10: ikon vector (Doc 10 §0). */
import type { ReactNode } from "react";
import { setUiState, useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";
import { IconClock, IconCandle, IconLove, IconMask, IconPoop } from "./icons";

function formatElapsed(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h} jam ${m} mnt` : `${m} menit`;
}

export function OfflineSummarySheet() {
  const offline = useGameState().offline;
  if (!offline) return null;

  const chronology: Array<{ key: string; icon: ReactNode; text: string }> = [];
  chronology.push({
    key: "time",
    icon: <IconClock size={14} />,
    text: `Kamu pergi selama ${formatElapsed(offline.elapsedHours)}`,
  });
  if (offline.poopsSpawned > 0) {
    chronology.push({ key: "poop", icon: <IconPoop size={14} />, text: `${offline.poopsSpawned} kotoran di tatami` });
  }
  if (offline.becameSick) {
    chronology.push({ key: "sick", icon: <IconMask size={14} />, text: "Kitsune jatuh sakit!" });
  }
  if (offline.died) {
    chronology.push({ key: "died", icon: <IconCandle size={14} />, text: "Kitsune telah berpulang..." });
  }
  if (!offline.becameSick && !offline.died && offline.poopsSpawned === 0) {
    chronology.push({ key: "wait", icon: <IconLove size={14} />, text: "Ia menunggumu dengan setia" });
  }

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-label="ringkasan offline">
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__title">Selamat datang kembali</div>
        <div className="sheet__body">
          <p className="offline-summary">{offline.summaryText}</p>
          <ul className="offline-list">
            {chronology.map((row) => (
              <li key={row.key}>
                {row.icon} {row.text}
              </li>
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
