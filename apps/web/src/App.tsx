/** Shell app (M1.5): router Splash/Onboarding ↔ Home (Doc 04) + overlay React.
 * Satu arah: UI/kanvas → eventBus → gameSystem → gameState → React render. */
import { lazy, Suspense, useEffect, useState } from "react";
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
import { ContextHint } from "./components/ContextHint";
import { DayGoalCard } from "./components/DayGoalCard";
import { ShopSheet } from "./components/ShopSheet";
import { MinigameResultSheet } from "./components/MinigameResultSheet";
import { ChatScreen } from "./components/ChatScreen";
import { SickBanner } from "./components/SickBanner";
import { MemorialScreen } from "./components/MemorialScreen";
import { LoginRewardSheet } from "./components/LoginRewardSheet";
import { EvolutionCutscene } from "./components/EvolutionCutscene";
import { BreedingScreen } from "./components/BreedingScreen";
import { OnlineBreedingScreen } from "./components/OnlineBreedingScreen";
import { AlbumScreen } from "./components/AlbumScreen";
import { GalleryScreen } from "./components/GalleryScreen";
/** M10.5: Phaser di-chunk terpisah — nol byte Phaser sebelum pemain masuk game.
 * Semua import "phaser" hanya di game/*, jadi ini satu-satunya boundary split. */
const PhaserHost = lazy(() =>
  import("./game/PhaserHost").then((m) => ({ default: m.PhaserHost })),
);
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
  const [gallery, setGallery] = useState(() => window.location.hash === "#gallery");

  useEffect(() => initGameSystem(), []);
  // Mode teks besar — preferensi perangkat (M12 Fase C)
  useEffect(() => {
    document.documentElement.classList.toggle("text-large", localStorage.getItem("hagumi_text_large") === "1");
  }, []);
  useEffect(() => {
    const onHash = (): void => setGallery(window.location.hash === "#gallery");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const off = eventBus.on("ui/action", ({ id }) => {
      if (id === "dapur" || id === "onsen" || id === "futon" || id === "toko" || id === "gear") {
        setSheet(id);
      }
    });
    return off;
  }, []);

  if (gallery) {
    return (
      <div className="stage">
        <GalleryScreen />
      </div>
    );
  }

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
      <Suspense fallback={<div className="phaser-fallback" aria-hidden="true" />}>
        <PhaserHost />
      </Suspense>
      {sleeping && <div className="sleep-overlay" aria-hidden="true" />}
      {dead ? (
        <MemorialScreen />
      ) : (
        <>
          <TimeSeasonBadge />
          <Hud />
          <SickBanner />
          <DayGoalCard />
          <TutorialHint />
          <ContextHint />
          <ActionBar
            onAction={(id) =>
              id === "chat"
                ? eventBus.emit("ui/chat-open", undefined)
                : id === "album"
                  ? eventBus.emit("ui/album-open", undefined) // M7 — Album keluarga (Doc 12 §9.1)
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
          <AlbumScreen />
          <BreedingScreen />
          <OnlineBreedingScreen />
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
