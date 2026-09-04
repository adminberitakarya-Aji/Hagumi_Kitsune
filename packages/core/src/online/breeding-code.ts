/**
 * HAGUMI core — Breeding Code encode/decode (M8 — Doc 07 §2B).
 * Format: `HG1.<base64url payload>.<checksum4hex>` — checksum FNV-1a menangkap
 * salah ketik/kode terpotong sebelum dikirim ke server. Fungsi murni (Doc 09 §1).
 */
import { z } from "zod";
import { PET_ELEMENTS } from "../pet/types";
import { coatColorOf, hashString } from "../breeding/breeding";
import type { PetData } from "../pet/types";
import type { BreedingCodePayload } from "./types";

export const BREEDING_CODE_PREFIX = "HG1";

/** Anti-abuse klien (server menegakkan batas yang sama — M8 rate limit). */
export const MAX_BREEDING_REQUESTS_PER_DAY = 5;

const payloadSchema = z.object({
  v: z.literal(1),
  owner: z.string().min(8).max(64),
  name: z.string().min(1).max(12),
  element: z.enum(PET_ELEMENTS),
  coatColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  personality: z.enum(PET_ELEMENTS),
  path: z.string().min(1).max(24),
  gen: z.number().int().min(1).max(99),
  careScore: z.number().min(0).max(100),
});

// ===== base64url murni (TextEncoder — tanpa API platform, pola SaveSystem) =====

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToB64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]!;
    const b2 = i + 1 < bytes.length ? bytes[i + 1]! : NaN;
    const b3 = i + 2 < bytes.length ? bytes[i + 2]! : NaN;
    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (Number.isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = Number.isNaN(b2) ? 64 : ((b2 & 15) << 2) | (Number.isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = Number.isNaN(b3) ? 64 : b3 & 63;
    out += B64URL.charAt(enc1) + (enc2 === 64 ? "" : B64URL.charAt(enc2));
    if (enc3 !== 64) out += B64URL.charAt(enc3);
    if (enc4 !== 64) out += B64URL.charAt(enc4);
  }
  return out;
}

function b64UrlToBytes(s: string): Uint8Array | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of s) {
    const idx = B64URL.indexOf(ch);
    if (idx === -1) return null;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/** Checksum 4-hex FNV-1a atas string base64 — deteksi salah ketik/kode terpotong. */
function checksum4(s: string): string {
  return hashString(s).toString(16).padStart(8, "0").slice(0, 4);
}

/** Bangun payload gen pet aktif untuk Breeding Code (Doc 07 §2B). */
export function breedingCodePayloadOf(pet: PetData, owner: string, gen: number): BreedingCodePayload {
  return {
    v: 1,
    owner,
    name: pet.name,
    element: pet.element,
    coatColor: coatColorOf(pet.element, pet.coatColor),
    personality: pet.personality ?? pet.element,
    path: pet.path,
    gen,
    careScore: Math.round(pet.careScore),
  };
}

/** Encode payload → Breeding Code `HG1.<b64url>.<checksum>`. */
export function encodeBreedingCode(payload: BreedingCodePayload): string {
  const json = JSON.stringify(payload);
  const b64 = bytesToB64Url(new TextEncoder().encode(json));
  return `${BREEDING_CODE_PREFIX}.${b64}.${checksum4(b64)}`;
}

export type DecodeCodeResult =
  | { success: true; payload: BreedingCodePayload }
  | { success: false; error: string };

/** Decode + validasi checksum & skema — toleran spasi & awalan huruf kecil. */
export function decodeBreedingCode(code: string): DecodeCodeResult {
  const parts = code.trim().replace(/\s+/g, "").split(".");
  if (parts.length !== 3 || parts[0]!.toUpperCase() !== BREEDING_CODE_PREFIX) {
    return { success: false, error: "Format kode tidak dikenal (harus diawali HG1.)" };
  }
  const [, b64, check] = parts as [string, string, string];
  if (!b64 || !check || checksum4(b64) !== check.toLowerCase()) {
    return { success: false, error: "Kode tidak valid — kemungkinan terpotong saat menyalin" };
  }
  const bytes = b64UrlToBytes(b64);
  if (!bytes) return { success: false, error: "Kode mengandung karakter invalid" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { success: false, error: "Kode rusak — tidak bisa dibaca" };
  }
  const result = payloadSchema.safeParse(parsed);
  if (!result.success) return { success: false, error: "Kode bukan hash gen pet yang sah" };
  return { success: true, payload: result.data };
}
