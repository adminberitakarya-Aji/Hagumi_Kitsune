/** Shell app (M1.5): router Splash/Onboarding ↔ Home (Doc 04) + overlay React.
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
import { Splash } from "./components/Splash";
import { TutorialHint } from "./components/TutorialHint";
import { ShopSheet } from "./components/ShopSheet";
import { MinigameResultSheet } from "./components/MinigameResultSheet";
import { ChatScreen } from "./components/ChatScreen";
import { SickBanner } from "./components/SickBanner";
import { MemorialScreen } from "./components/MemorialScreen";
import { LoginRewardSheet } from "./components/LoginRewardSheet";
import { EvolutionCutscene } from "./components/EvolutionCutscene";
import { PhaserHost } from "./game/PhaserHost";
import { eventBus } from "./lib/eventBus";
import { initGameSystem } from "./system/gameSystem";
import { useGameState } from "./store/gameState";

type SheetId = "dapur" | "onsen" | "futon" | "toko" | "gear" | null;

const SHEET_TITLES: Record<"dapur" | "onsen" | "futon" | "toko" | "gear", string> = {
  dapur: "Dapur",
  onsen: "Onsen",
  futon: "Kamar Futon",
  toko: "Toko Dagashiya",
  gear: "Pengaturan",
};

export default function App() {
  const [sheet, setSheet] = useState<SheetId>(null);
  const { screen, sleeping, dead } = useGameState();

  useEffect(() => initGameSystem(), []);
  useEffect(() => {
    const off = eventBus.on("ui/action", ({ id }) => {
      if (id === "dapur" || id === "onsen" || id === "futon" || id === "toko" || id === "gear") {
        setSheet(id);
      }
    });
    return off;
  }, []);

  if (screen === "splash") {
    return (
      <div className="stage">
        <Splash />
        <Toast />
      </div>
    );
  }

  return (
    <div className="stage">
      <PhaserHost />
      {sleeping && <div className="sleep-overlay" aria-hidden="true" />}
      {dead ? (
        <MemorialScreen />
      ) : (
        <>
          <TimeSeasonBadge />
          <Hud />
          <SickBanner />
          <TutorialHint />
          <ActionBar
            onAction={(id) =>
              id === "chat"
                ? eventBus.emit("ui/chat-open", undefined)
                : eventBus.emit("ui/action", { id })
            }
          />
          <Toast />
          <DebugPanel />
          <OfflineSummarySheet />
          <LoginRewardSheet />
          <EvolutionCutscene />
          <MinigameResultSheet />
          <ChatScreen />
          {sheet && (
            <WashiPanel open title={SHEET_TITLES[sheet]} onClose={() => setSheet(null)}>
              {sheet === "dapur" && <KitchenSheet onFed={() => setSheet(null)} />}
              {sheet === "onsen" && <OnsenSheet onDone={() => setSheet(null)} />}
              {sheet === "futon" && <FutonSheet onDone={() => setSheet(null)} />}
              {sheet === "toko" && <ShopSheet />}
              {sheet === "gear" && <SettingsSheet />}
            </WashiPanel>
          )}
        </>
      )}
    </div>
  );
}
