/** Shell layar Home (M1 Fase C): PhaserHost + overlay React (HUD, badge, sheet, toast).
 * Satu arah: UI/kanvas → eventBus → gameSystem → gameState → React render. */
import { useEffect, useState } from "react";
import { Hud } from "./components/Hud";
import { ActionBar } from "./components/ActionBar";
import { Toast } from "./components/Toast";
import { TimeSeasonBadge } from "./components/TimeSeasonBadge";
import { WashiPanel } from "./components/WashiPanel";
import { KitchenSheet } from "./components/KitchenSheet";
import { OnsenSheet } from "./components/OnsenSheet";
import { FutonSheet } from "./components/FutonSheet";
import { SettingsSheet } from "./components/SettingsSheet";
import { OfflineSummarySheet } from "./components/OfflineSummarySheet";
import { DebugPanel } from "./components/DebugPanel";
import { PhaserHost } from "./game/PhaserHost";
import { eventBus } from "./lib/eventBus";
import { initGameSystem } from "./system/gameSystem";
import { useGameState } from "./store/gameState";

type SheetId = "dapur" | "onsen" | "futon" | "gear" | null;

const SHEET_TITLES: Record<"dapur" | "onsen" | "futon" | "gear", string> = {
  dapur: "Dapur",
  onsen: "Onsen",
  futon: "Kamar Futon",
  gear: "Pengaturan",
};

export default function App() {
  const [sheet, setSheet] = useState<SheetId>(null);
  const sleeping = useGameState().sleeping;

  useEffect(() => initGameSystem(), []);
  useEffect(() => {
    const off = eventBus.on("ui/action", ({ id }) => {
      if (id === "dapur" || id === "onsen" || id === "futon" || id === "gear") setSheet(id);
    });
    return off;
  }, []);

  return (
    <div className="stage">
      <PhaserHost />
      {sleeping && <div className="sleep-overlay" aria-hidden="true" />}
      <TimeSeasonBadge />
      <Hud />
      <ActionBar onAction={(id) => eventBus.emit("ui/action", { id })} />
      <Toast />
      <DebugPanel />
      <OfflineSummarySheet />
      {sheet && (
        <WashiPanel open title={SHEET_TITLES[sheet]} onClose={() => setSheet(null)}>
          {sheet === "dapur" && <KitchenSheet onFed={() => setSheet(null)} />}
          {sheet === "onsen" && <OnsenSheet onDone={() => setSheet(null)} />}
          {sheet === "futon" && <FutonSheet onDone={() => setSheet(null)} />}
          {sheet === "gear" && <SettingsSheet />}
        </WashiPanel>
      )}
    </div>
  );
}
