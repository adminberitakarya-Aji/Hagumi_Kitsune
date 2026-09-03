/**
 * SALINAN SERVER-SIDE decode Breeding Code (M8 — Doc 07 §2B).
 * Identik dengan packages/core/src/online/breeding-code.ts — checksum FNV-1a
 * + validasi payload manual (tanpa zod agar edge function tetap ringan).
 */
import { hashString } from "./genetics.ts";

export const BREEDING_CODE_PREFIX = "HG1";

export interface BreedingCodePayload {
  v: 1;
  owner: string;
  name: string;
  element: string;
  coatColor: string;
  personality: string;
  path: string;
  gen: number;
  careScore: number;
}

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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

function checksum4(s: string): string {
  return hashString(s).toString(16).padStart(8, "0").slice(0, 4);
}

function validPayload(p: unknown): p is BreedingCodePayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.owner === "string" && o.owner.length >= 8 && o.owner.length <= 64 &&
    typeof o.name === "string" && o.name.length >= 1 && o.name.length <= 12 &&
    typeof o.element === "string" &&
    typeof o.coatColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(o.coatColor) &&
    typeof o.personality === "string" &&
    typeof o.path === "string" && o.path.length >= 1 && o.path.length <= 24 &&
    typeof o.gen === "number" && Number.isInteger(o.gen) && o.gen >= 1 && o.gen <= 99 &&
    typeof o.careScore === "number" && o.careScore >= 0 && o.careScore <= 100
  );
}

export function decodeBreedingCode(code: string): BreedingCodePayload | null {
  const parts = code.trim().replace(/\s+/g, "").split(".");
  if (parts.length !== 3 || parts[0]!.toUpperCase() !== BREEDING_CODE_PREFIX) return null;
  const [, b64, check] = parts as [string, string, string];
  if (!b64 || !check || checksum4(b64) !== check.toLowerCase()) return null;
  const bytes = b64UrlToBytes(b64);
  if (!bytes) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return validPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
