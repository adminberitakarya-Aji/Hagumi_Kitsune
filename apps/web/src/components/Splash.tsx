/** Splash + Onboarding (Doc 04): torii → altar telur (pilih elemen) → nama (hanko
 * tekan-lama 0,8 dtk) → cutscene menetas 5 tahap → ui/new-game. Mystic (Prism)
 * sengaja belum ditawarkan — telur langka hadir bersama sistem drop-rate (M2+). */
import { useEffect, useRef, useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";
import { Egg, FoxFace } from "./icons";
import { ELEMENT_PALETTE } from "../game/art/palette";
import { haptic } from "../system/haptics";

type OnboardingStep = "title" | "egg" | "name" | "hatch";

type EggElement = "fire" | "water" | "wind" | "earth";

interface EggOption {
  element: EggElement;
  name: string;
  desc: string;
}

/** Warna telur dari palet elemen (M10 — ikon vector, Doc 17 §3.3). */
const EGG_COLOR: Record<EggElement, string> = {
  fire: ELEMENT_PALETTE.fire!.body,
  water: ELEMENT_PALETTE.water!.body,
  wind: ELEMENT_PALETTE.wind!.body,
  earth: ELEMENT_PALETTE.earth!.body,
};

const EGGS: EggOption[] = [
  { element: "fire", name: "Telur Ember", desc: "Bersemangat & aktif" },
  { element: "water", name: "Telur Tide", desc: "Tenang & penyayang" },
  { element: "wind", name: "Telur Gale", desc: "Ceria & jenaka" },
  { element: "earth", name: "Telur Terra", desc: "Tenang & penuh kasih" },
];

/** Cutscene menetas 5 tahap (Doc 04 §4) — durasi per tahap dalam ms. */
const HATCH_STAGES: Array<{ cls: string; ms: number; label: string }> = [
  { cls: "hatch--wobble", ms: 1400, label: "Telur bergetar..." },
  { cls: "hatch--glow", ms: 1200, label: "Cahaya hangat muncul..." },
  { cls: "hatch--crack", ms: 1000, label: "Retakan halus..." },
  { cls: "hatch--burst", ms: 700, label: "" },
  { cls: "hatch--fox", ms: 1200, label: "Selamat datang!" },
];

export function Splash() {
  const hasSave = useGameState().hasSave;
  const [step, setStep] = useState<OnboardingStep>("title");
  const [egg, setEgg] = useState<EggOption | null>(null);
  const [name, setName] = useState("");
  const [hatchStage, setHatchStage] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const startHatch = (petName: string, chosen: EggOption) => {
    haptic("hatch"); // momen menetas (M11)
    setStep("hatch");
    setHatchStage(0);
    let acc = 0;
    HATCH_STAGES.forEach((stage, i) => {
      acc += stage.ms;
      timers.current.push(window.setTimeout(() => setHatchStage(i + 1), acc));
    });
    // Save pertama dibuat tepat setelah cutscene selesai (Doc 04 §6)
    timers.current.push(
      window.setTimeout(() => {
        eventBus.emit("ui/new-game", { name: petName, element: chosen.element });
      }, acc),
    );
  };

  // ===== 1. Splash Torii (Doc 04 §1) =====
  if (step === "title") {
    return (
      <div className="splash">
        <div className="splash__torii" aria-hidden="true" />
        <h1 className="splash__title">
          HAGUMI
          <span className="splash__kanji">育み</span>
        </h1>
        <p className="splash__tag">Rawat kitsune-mu selama 90 hari</p>
        <div className="splash__actions">
          {hasSave && (
            <HankoButton size="lg" onClick={() => eventBus.emit("ui/continue", undefined)}>
              Lanjutkan
            </HankoButton>
          )}
          <HankoButton
            size={hasSave ? "md" : "lg"}
            variant={hasSave ? "ghost" : "primary"}
            onClick={() => setStep("egg")}
          >
            {hasSave ? "Pet Baru" : "Mulai Perjalanan"}
          </HankoButton>
        </div>
      </div>
    );
  }

  // ===== 2. Altar Telur (Doc 04 §2) =====
  if (step === "egg") {
    return (
      <div className="splash">
        <h2 className="splash__heading">Pilih Telur di Altar</h2>
        <p className="splash__tag">Karakter kitsune-mu ditentukan di sini</p>
        <div className="egg-grid">
          {EGGS.map((option) => (
            <button
              key={option.element}
              type="button"
              className={`egg-card${egg?.element === option.element ? " egg-card--picked" : ""}`}
              onClick={() => setEgg(option)}
            >
              <span className="egg-card__icon">
                <Egg color={EGG_COLOR[option.element]} size={36} />
              </span>
              <span className="egg-card__name">{option.name}</span>
              <span className="egg-card__desc">{option.desc}</span>
            </button>
          ))}
        </div>
        <div className="splash__actions">
          <HankoButton size="md" variant="ghost" onClick={() => setStep("title")}>
            Kembali
          </HankoButton>
          <HankoButton size="lg" disabled={!egg} onClick={() => setStep("name")}>
            Bawa ke Altar Nama
          </HankoButton>
        </div>
      </div>
    );
  }

  // ===== 3. Nama + Hanko (Doc 04 §3 — tekan-lama 0,8 dtk) =====
  if (step === "name" && egg) {
    return (
      <div className="splash">
        <h2 className="splash__heading">
          Beri Nama <Egg color={EGG_COLOR[egg.element]} size={18} />
        </h2>
        <input
          className="name-input"
          maxLength={12}
          placeholder="Nama kitsune..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="splash__tag">Tekan &amp; tahan stempel untuk menyegel takdir</p>
        <HankoButton
          size="lg"
          disabled={name.trim().length === 0}
          onHoldComplete={() => startHatch(name.trim(), egg)}
        >
          Cap Hanko (tahan)
        </HankoButton>
        <button type="button" className="splash__back" onClick={() => setStep("egg")}>
          ← pilih telur lain
        </button>
      </div>
    );
  }

  // ===== 4. Cutscene Menetas (Doc 04 §4) =====
  const stageIdx = Math.min(hatchStage, HATCH_STAGES.length) - 1;
  const stage = stageIdx >= 0 ? HATCH_STAGES[stageIdx] : null;
  return (
    <div className="splash splash--hatch">
      <div className={`hatch-egg ${stage?.cls ?? ""}`} aria-hidden="true">
        <span className="hatch-egg__inner">
          {hatchStage >= 4 ? (
            <FoxFace size={56} color={egg ? EGG_COLOR[egg.element] : "#E8874A"} />
          ) : (
            <Egg color={egg ? EGG_COLOR[egg.element] : "#F5EFE0"} size={56} />
          )}
        </span>
      </div>
      {stage?.label && <p className="hatch-label">{stage.label}</p>}
    </div>
  );
}
