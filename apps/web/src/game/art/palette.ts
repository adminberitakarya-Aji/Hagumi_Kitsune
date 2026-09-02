/**
 * Palet inti & recolor elemen (M5 — Doc 10 §1–3).
 * Kontrak visual: MAKS 24 warna inti; sprite memakai subset dari tabel ini.
 * Recolor elemen = swap palet dari 1 set gambar (bukan gambar ulang — Doc 01 §6).
 */

export interface Palette {
  /** Warna utama tubuh. */
  body: string;
  /** Warna sekunder (perut, ujung ekor, moncong). */
  belly: string;
  /** Outline "gelap terang" (bukan hitam pekat — Doc 10 §1). */
  line: string;
  /** Dalam telinga & hidung. */
  inner: string;
  /** Mata. */
  eye: string;
  /** Aksen elemen (aura, kilau). */
  accent: string;
}

/** Palet inti 8 warna (Doc 10 §2). */
export const CORE = {
  washi: "#F5EFE0",
  sakura: "#F7C8D0",
  indigo: "#3D4A6B",
  matcha: "#9DB88A",
  wood: "#C9A87C",
  hanko: "#C1443C",
  ink: "#2B2B33",
  shadow: "#8A8296",
} as const;

/** Recolor 5 elemen (Doc 10 §2: fire oranye-merah; water biru pucat; wind krem; earth hijau-cokelat; mystic ungu). */
export const ELEMENT_PALETTE: Record<string, Palette> = {
  fire: {
    body: "#E8874A",
    belly: "#FBE3C4",
    line: "#A85A32",
    inner: "#C1443C",
    eye: "#2B2B33",
    accent: "#F5B841",
  },
  water: {
    body: "#8FB6D9",
    belly: "#EAF3FB",
    line: "#4E6E8E",
    inner: "#5C8CB8",
    eye: "#22303F",
    accent: "#BFE3F5",
  },
  wind: {
    body: "#EFE3C0",
    belly: "#FBF6E8",
    line: "#A89468",
    inner: "#D9C89A",
    eye: "#2B2B33",
    accent: "#C9E8A0",
  },
  earth: {
    body: "#A98F5C",
    belly: "#E8DCC0",
    line: "#6E5A38",
    inner: "#8A7448",
    eye: "#2B2B33",
    accent: "#9DB88A",
  },
  mystic: {
    body: "#A98BC4",
    belly: "#EFE6F7",
    line: "#6B4A7A",
    inner: "#8A6B9E",
    eye: "#241A2E",
    accent: "#D9B8F0",
  },
};

/** Tint jalur evolusi (M3) — overlay lembut di atas sprite final. */
export const PATH_TINT_HEX: Record<string, string | null> = {
  tenko: "#F5E6B0",
  zenko: "#FDFAF2",
  biasa: null,
  yako: "#B59A86",
  nogitsune: "#9A7AB8",
};
