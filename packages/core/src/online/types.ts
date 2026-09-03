/**
 * HAGUMI core — Tipe Breeding Online (M8 — Doc 07 §2B, services/supabase).
 * Jalur antar-pemain asinkron: breeding code + request, tanpa real-time server.
 */
import type { PetElement } from "../pet/types";

/**
 * Hash gen pet yang dikirim lewat Breeding Code (Doc 07 §2B):
 * element, warna bulu, kepribadian, careTier (jalur) — plus identitas pemilik
 * untuk routing request & generasi silsilah.
 */
export interface BreedingCodePayload {
  /** Versi format kode. */
  v: 1;
  /** Anon id pemilik pet (routing request antar pemain). */
  owner: string;
  /** Nama pet (tampil di kartu mitra). */
  name: string;
  element: PetElement;
  /** Warna bulu hex #RRGGBB (hasil genetika M7). */
  coatColor: string;
  /** Kepribadian = elemen dialog (Doc 08 §3). */
  personality: PetElement;
  /** careTier — jalur evolusi saat ini (zenko/yako/…). */
  path: string;
  /** Generasi silsilah (Doc 07 §4). */
  gen: number;
  /** Care Score dibulatkan 0–100 — menentukan bonus stat anak (Doc 07 §3). */
  careScore: number;
}

/** Status request breeding online (siklus: pending → ready → done; atau declined). */
export type OnlineRequestStatus = "pending" | "ready" | "done" | "declined";

/** Satu request breeding dari inbox server (Doc 07 §2B — polling saat buka game). */
export interface OnlineRequest {
  id: string;
  status: OnlineRequestStatus;
  /** "incoming" = permintaan masuk untukku, "outgoing" = yang kukirim. */
  direction: "incoming" | "outgoing";
  /** Hash gen pet mitra (dari breeding code / gen penerima saat accept). */
  partner: BreedingCodePayload;
  /** Seed genetika — diisi server saat kedua pihak sepakat (status ready). */
  seed: number | null;
  createdAt: number;
}
