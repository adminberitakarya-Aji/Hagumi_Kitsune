/**
 * Ikon UI vector HAGUMI (M10 — Doc 10 §0 v2, Doc 17 §3.3).
 * Gaya: flat kawaii — stroke bulat (linecap/linejoin round), 2-tone, palet inti Doc 10.
 * Menggantikan SEMUA emoji di komponen React (DoD M10: audit grep emoji = 0).
 */
import type { ReactNode } from "react";
import { CORE } from "../game/art/palette";

const { indigo, hanko, sakura, washi, wood, shadow } = CORE;

export interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// ===== Aksi bar (Doc 12 §3.2 grid-6) =====

export function IconDapur(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-6Z" fill={hanko} />
      <path d="M3.5 10.5h17" stroke={indigo} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 4.5c0 1.2-1 1.3-1 2.4M13 3.5c0 1.4-1.2 1.5-1.2 2.8M17 4.5c0 1.2-1 1.3-1 2.4" stroke={shadow} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 12c1.6 0 2 1 2 2s-.6 2.4-2.4 2.4" stroke={indigo} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 12c-1.6 0-2 1-2 2s.6 2.4 2.4 2.4" stroke={indigo} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function IconOnsen(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 13c1.5 1 3-.8 4.5 0s3-.8 4.5 0 3-.8 4.5 0 2.5-.6 3.5 0v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" fill="#8FB8D8" />
      <path d="M4.5 13.5h15" stroke={indigo} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.5 9.5c0-1.4 1.2-1.6 1.2-3M12.4 9.5c0-1.4 1.2-1.6 1.2-3M16.3 9.5c0-1.4 1.2-1.6 1.2-3" stroke={shadow} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconFuton(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="9" width="18" height="8" rx="4" fill={indigo} />
      <rect x="5" y="11" width="6" height="4" rx="2" fill={washi} />
      <path d="M14 11v4M17 11v4" stroke={washi} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconToko(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9l1.5-4h13L20 9v1.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-6 0V9Z" fill={hanko} />
      <path d="M5.5 13.5V20h13v-6.5" stroke={indigo} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="10" y="15.5" width="4" height="4.5" rx="1" fill={wood} />
    </Svg>
  );
}

export function IconAlbum(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6c-1.5-1.4-3.8-2-6.5-2v14c2.7 0 5 .6 6.5 2 1.5-1.4 3.8-2 6.5-2V4c-2.7 0-5 .6-6.5 2Z" fill={washi} stroke={indigo} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 6v14" stroke={indigo} strokeWidth="1.6" />
      <path d="M7.5 8.5h2.5M14 8.5h2.5M7.5 11.5h2.5M14 11.5h2.5" stroke={shadow} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconChat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H10l-4.5 4v-4.2A3 3 0 0 1 4 13V6Z" fill={washi} stroke={indigo} strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="9" cy="9.5" r="1.1" fill={hanko} />
      <circle cx="12.5" cy="9.5" r="1.1" fill={hanko} />
      <circle cx="16" cy="9.5" r="1.1" fill={hanko} />
    </Svg>
  );
}

// ===== Stat (H2, Doc 12 §1.3) =====

export function IconHunger(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 4.5c2.8-.9 5.4 1.7 4.5 4.5-.6 1.9-2.6 3-4.5 4.6l-4.6 4.6c-1.2 1.2-3.2 1.2-4.4 0-1.2-1.2-1.2-3.2 0-4.4L10 9.2c1.6-1.9 2.6-4 4.5-4.7Z" fill="#E0955A" />
      <circle cx="5.4" cy="18.6" r="1.4" fill={washi} stroke={indigo} strokeWidth="1.1" />
    </Svg>
  );
}

export function IconHappy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" fill={sakura} stroke={indigo} strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconEnergy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.5 3 6 13.5h4.5L10 21l7.5-10.5H13L13.5 3Z" fill="#E8C96A" stroke={indigo} strokeWidth="1.3" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconHygiene(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5S6.5 10 6.5 14.2a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z" fill="#8FB8D8" stroke={indigo} strokeWidth="1.3" />
      <circle cx="10" cy="13.5" r="1.5" fill="#FFFFFF" opacity="0.8" />
    </Svg>
  );
}

export function IconHealth(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" fill={hanko} />
      <path d="M7 12h3l1.4-2.6 2 4.4L14.8 12H17" stroke={washi} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ===== HUD (H4 koin, H5 gear) =====

export function IconCoin(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" fill="#E8C96A" stroke={indigo} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5.6" fill="none" stroke="#B8933C" strokeWidth="1.2" />
      <rect x="10" y="10" width="4" height="4" rx="0.8" fill={washi} stroke={indigo} strokeWidth="1.1" />
    </Svg>
  );
}

export function IconGear(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4.2" stroke={indigo} strokeWidth="1.9" />
      <circle cx="12" cy="12" r="1.4" fill={indigo} />
      <path
        d="M12 3.2v3M12 17.8v3M3.2 12h3M17.8 12h3M5.8 5.8l2.1 2.1M16.1 16.1l2.1 2.1M18.2 5.8l-2.1 2.1M7.9 16.1l-2.1 2.1"
        stroke={indigo}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ===== Waktu (TimeSeasonBadge, Doc 12 §1.3) =====

export function IconSunrise(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 15a5 5 0 0 1 10 0" fill="#E8C96A" stroke={indigo} strokeWidth="1.5" />
      <path d="M3.5 17.5h17" stroke={indigo} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4.5v3M5 8.5l2 2M19 8.5l-2 2" stroke={indigo} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4.5" fill="#E8C96A" stroke={indigo} strokeWidth="1.5" />
      <path
        d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"
        stroke={indigo}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconDusk(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 15a5 5 0 0 1 10 0" fill="#E0955A" stroke={indigo} strokeWidth="1.5" />
      <path d="M3.5 17.5h17" stroke={indigo} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 20.5V18M8.8 20l1-2.2M15.2 20l-1-2.2" stroke={indigo} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5Z" fill="#E8C96A" stroke={indigo} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17.5 6.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2Z" fill={washi} />
    </Svg>
  );
}

// ===== Musim (bingkai badge) =====

export function IconSpring(p: IconProps) {
  return (
    <Svg {...p}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="7.2" rx="2.4" ry="3.4" fill={sakura} stroke={indigo} strokeWidth="1" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.8" fill={hanko} />
    </Svg>
  );
}

export function IconSummer(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="10" r="4" fill="#E8C96A" stroke={indigo} strokeWidth="1.4" />
      <path d="M4 18c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1.2 4-.6" stroke="#5E8C6A" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconAutumn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c4 1.5 6.5 5 6 9.5-.4 3.5-3 6-6 7.5-3-1.5-5.6-4-6-7.5-.5-4.5 2-8 6-9.5Z" fill="#E0955A" stroke={indigo} strokeWidth="1.3" />
      <path d="M12 6v13M12 11l-3.5-2M12 11l3.5-2M12 15l-4-2.4M12 15l4-2.4" stroke={indigo} strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  );
}

export function IconWinter(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 3l-2 2.2M12 3l2 2.2M12 21l-2-2.2M12 21l2-2.2M4.2 7.5l2.9.5M19.8 7.5l-2.9.5M4.2 16.5l2.9-.5M19.8 16.5l-2.9-.5"
        stroke={indigo}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ===== Status =====

export function IconMask(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" fill="#E8C96A" stroke={indigo} strokeWidth="1.5" />
      <rect x="6" y="10.5" width="12" height="5.5" rx="2.4" fill={washi} stroke={indigo} strokeWidth="1.3" />
      <path d="M8.5 13h2M11 13h2M13.5 13h2" stroke={shadow} strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  );
}

export function IconPill(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="9" width="16" height="6.5" rx="3.25" transform="rotate(-25 12 12)" fill={washi} stroke={indigo} strokeWidth="1.5" />
      <path d="M9.2 6.9l5.6 10.2" stroke={indigo} strokeWidth="1.4" />
    </Svg>
  );
}

export function IconLove(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" fill={hanko} stroke={indigo} strokeWidth="1.3" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconZzz(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 15h5l-5 6h5M14 3h5l-5 6h5" stroke={indigo} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconWarn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.8 21 19.5H3L12 3.8Z" fill="#E8C96A" stroke={indigo} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 9.5v4.5" stroke={indigo} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.1" fill={indigo} />
    </Svg>
  );
}

export function IconPoop(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="17.5" rx="7.5" ry="3.5" fill={wood} stroke={indigo} strokeWidth="1.3" />
      <ellipse cx="12" cy="12.5" rx="5" ry="2.8" fill={wood} stroke={indigo} strokeWidth="1.3" />
      <ellipse cx="12" cy="8.2" rx="3" ry="2" fill={wood} stroke={indigo} strokeWidth="1.3" />
    </Svg>
  );
}

// ===== Navigasi =====

export function IconBack(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 5 8 12l6.5 7" stroke={indigo} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" stroke={indigo} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevron(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 15.5 12 9l7 6.5" stroke={indigo} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5 10 18 19.5 6.5" stroke="#5E8C6A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ===== Karakter: telur & kitsune (Splash, jalur evolusi) =====

/** Telur kawaii dengan wajah — warna dari elemen (ELEMENT_PALETTE.body). */
export function Egg({ color, size = 40, className }: IconProps & { color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.5c4.4 0 7.5 5.6 7.5 11a7.5 7.5 0 0 1-15 0c0-5.4 3.1-11 7.5-11Z" fill={color} stroke={indigo} strokeWidth="1.4" />
      <ellipse cx="9.2" cy="8" rx="1.6" ry="2.4" fill="#FFFFFF" opacity="0.45" />
      <path d="M9 13.2c.7.8 1.6.8 2.3 0M13 13.2c.7.8 1.6.8 2.3 0" stroke={indigo} strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="7.6" cy="14.8" rx="1" ry="0.6" fill={sakura} opacity="0.9" />
      <ellipse cx="16.4" cy="14.8" rx="1" ry="0.6" fill={sakura} opacity="0.9" />
    </svg>
  );
}

/** Wajah kitsune kawaii — pewarna via `color` (recolor elemen/jalur). */
export function FoxFace({ color = "#E8874A", size = 24, className }: IconProps & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 9.5 5.5 3l4.6 3.2a8 8 0 0 1 3.8 0L18.5 3 20 9.5c.7 1.2 1 2.4 1 3.5 0 4.4-4 7.5-9 7.5S3 17.4 3 13c0-1.1.3-2.3 1-3.5Z" fill={color} stroke={indigo} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.4 12.2c.8.9 1.9.9 2.7 0M13 12.2c.8.9 1.9.9 2.7 0" stroke={indigo} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 15.4c.6.7 1.4.7 2 0" stroke={indigo} strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="7.2" cy="14.6" rx="1.1" ry="0.7" fill={sakura} />
      <ellipse cx="16.8" cy="14.6" rx="1.1" ry="0.7" fill={sakura} />
    </svg>
  );
}

/** Bintang ilahi (jalur Tenko). */
export function IconStar(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4L12 3Z" fill="#F5B841" stroke={indigo} strokeWidth="1.3" strokeLinejoin="round" />
    </Svg>
  );
}

/** Torii (jalur Zenko). */
export function IconTorii(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 6.5c5.5 1.2 11.5 1.2 17 0M5 10h14" stroke={hanko} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 7.5V20M17 7.5V20" stroke={hanko} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 6v3.4" stroke={hanko} strokeWidth="1.8" />
    </Svg>
  );
}

/** Bulan gelap (jalur Yako). */
export function IconCrescent(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5Z" fill={indigo} />
      <circle cx="16.5" cy="7" r="0.9" fill={washi} />
      <circle cx="18.5" cy="11" r="0.6" fill={washi} />
    </Svg>
  );
}

/** Piala (rekor mini-game). */
export function IconTrophy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10v4.5a5 5 0 0 1-10 0V4Z" fill="#E8C96A" stroke={indigo} strokeWidth="1.4" />
      <path d="M7 5.5H4.5A3 3 0 0 0 7.6 9M17 5.5h2.5A3 3 0 0 1 16.4 9" stroke={indigo} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 13.5V17M8.5 20h7l-1-3h-5l-1 3Z" stroke={indigo} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Jam (durasi offline). */
export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" stroke={indigo} strokeWidth="1.7" />
      <path d="M12 7v5.2l3.4 2" stroke={indigo} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Lilin kenangan (memorial / berpulang). */
export function IconCandle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c1.2 1.4 1.8 2.3 1.8 3.2a1.8 1.8 0 1 1-3.6 0c0-.9.6-1.8 1.8-3.2Z" fill="#F5B841" stroke={indigo} strokeWidth="1.1" />
      <rect x="9.5" y="9" width="5" height="11" rx="2" fill={washi} stroke={indigo} strokeWidth="1.4" />
      <path d="M9.5 13c1.6 1 3.4 1 5 0" stroke={sakura} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}
