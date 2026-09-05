/** GalleryScreen — galeri komponen QA visual (M12 Fase A — Doc 14 §2).
 * Dev tool: buka via hash `#gallery` atau tombol "Komponen" di panel debug. */
import type { ReactNode } from "react";
import { HankoButton } from "./HankoButton";
import { StatBar } from "./StatBar";
import {
  Egg,
  FoxFace,
  IconAlbum,
  IconChat,
  IconCoin,
  IconCrescent,
  IconDapur,
  IconDusk,
  IconEnergy,
  IconFuton,
  IconGear,
  IconHappy,
  IconHealth,
  IconHunger,
  IconHygiene,
  IconMoon,
  IconOnsen,
  IconStar,
  IconSun,
  IconSunrise,
  IconToko,
  IconTorii,
} from "./icons";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, color: "var(--indigo)", margin: "0 0 6px" }}>{title}</h3>
      {children}
    </section>
  );
}

export function GalleryScreen() {
  return (
    <div className="stage" style={{ overflowY: "auto", padding: 12 }}>
      <h2 style={{ fontSize: "var(--font-display)", color: "var(--indigo)", margin: 0 }}>
        Galeri Komponen
      </h2>
      <p style={{ fontSize: "var(--font-caption)", color: "var(--text-dim)", marginBottom: 10 }}>
        QA visual M12 — Doc 14 §2. Buka via hash <code>#gallery</code>.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.hash = "";
        }}
        style={{ marginBottom: 12 }}
      >
        ‹ kembali ke game
      </button>

      <Section title="Ikon UI (subset)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, justifyItems: "center" }}>
          <IconDapur />
          <IconOnsen />
          <IconFuton />
          <IconToko />
          <IconAlbum />
          <IconChat />
          <IconHunger />
          <IconHappy />
          <IconEnergy />
          <IconHygiene />
          <IconHealth />
          <IconCoin />
          <IconGear />
          <IconSunrise />
          <IconSun />
          <IconDusk />
          <IconMoon />
          <IconTorii />
        </div>
      </Section>

      <Section title="Tombol Hanko">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <HankoButton size="lg">CTA Utama</HankoButton>
          <HankoButton size="md">Sekunder</HankoButton>
          <HankoButton size="md" variant="ghost">
            Ghost
          </HankoButton>
          <HankoButton size="md" disabled>
            Nonaktif
          </HankoButton>
        </div>
      </Section>

      <Section title="StatBar (urgent & normal)">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 200 }}>
          <StatBar icon={<IconHunger size={14} />} value={12} color="#E0955A" />
          <StatBar icon={<IconHappy size={14} />} value={85} color="#F0A8BC" />
          <StatBar icon={<IconEnergy size={14} />} value={48} color="#E8C96A" />
          <StatBar icon={<IconHygiene size={14} />} value={26} color="#8FB8D8" />
        </div>
      </Section>

      <Section title="Karakter — telur & wajah per elemen/jalur">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Egg color="#E8874A" />
          <Egg color="#8FB6D9" />
          <Egg color="#EFE3C0" />
          <Egg color="#A98F5C" />
          <FoxFace />
          <FoxFace color="#FDF6E3" />
          <FoxFace color="#B59A86" />
          <FoxFace color="#9A7AB8" />
        </div>
      </Section>

      <Section title="Jalur evolusi">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <IconStar />
          <IconTorii />
          <IconCrescent />
        </div>
      </Section>
    </div>
  );
}