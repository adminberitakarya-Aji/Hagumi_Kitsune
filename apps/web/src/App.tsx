import { Hud } from "./components/Hud";
import { ActionBar } from "./components/ActionBar";
import { PhaserHost } from "./game/PhaserHost";

/** Shell layar Home placeholder (Fase A) — layar asli & router datang di Fase C. */
export default function App() {
  return (
    <div className="stage">
      <PhaserHost />
      <Hud />
      <ActionBar />
    </div>
  );
}
