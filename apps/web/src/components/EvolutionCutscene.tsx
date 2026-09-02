/** Cutscene evolusi (Doc 12 §11.3): overlay aura + label tier, tombol lanjut setelah 1,2 dtk.
 * Data dari store (evolution.kind/tier/path) — runtime menutup via ui/evolve-continue. */
import { useEffect, useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";

const PATH_LABEL: Record<string, string> = {
  tenko: "Tenko — Rubah Ilahi 9 Ekor",
  zenko: "Zenko — Rubah Suci",
  biasa: "Kitsune Biasa",
  yako: "Yako — Rubah Liar",
  nogitsune: "Nogitsune — Rubah Gelap",
};

const AURA: Record<string, string> = {
  tenko: "#E8C96A",
  zenko: "#FDF6E3",
  biasa: "#D6C084",
  yako: "#9A9A9A",
  nogitsune: "#6B4A7A",
};

const KIND_LABEL: Record<string, string> = {
  first: "🌟 Evolusi Pertama!",
  final: "✨ Jalur Hidupmu Terkunci",
  elder: "🍁 Memasuki Masa Senior",
};

export function EvolutionCutscene() {
  const evolution = useGameState().evolution;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!evolution) return;
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [evolution]);

  if (!evolution) return null;
  const aura = AURA[evolution.path ?? "biasa"] ?? "#D6C084";

  return (
    <div className="evo-overlay" style={{ background: `radial-gradient(circle, ${aura}55 0%, rgba(43,43,51,0.92) 75%)` }}>
      <div className="evo-flash" style={{ background: aura }} aria-hidden="true" />
      <div className="evo-kind">{KIND_LABEL[evolution.kind] ?? "✨ Evolusi"}</div>
      <div className="evo-fox" style={{ filter: `drop-shadow(0 0 18px ${aura})` }}>
        🦊
      </div>
      <div className="evo-tier" style={{ borderColor: aura }}>
        {evolution.path ? PATH_LABEL[evolution.path] ?? evolution.path : evolution.tier || "Berubah"}
      </div>
      {ready && (
        <HankoButton
          size="lg"
          onClick={() => eventBus.emit("ui/evolve-continue", undefined)}
        >
          Lanjutkan Perjalanan
        </HankoButton>
      )}
    </div>
  );
}
