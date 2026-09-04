/**
 * Uji e2e backend M8 (run: pnpm e2e:online):
 * dua pemain anon → tukar breeding code → send/accept → seed → klaim telur,
 * plus push/pull cloud backup. Memakai @hagumi/core untuk encode/decode agar
 * kompatibilitas klien ↔ server teruji sungguhan.
 */
import { readFileSync } from "node:fs";
import {
  computeOnlineChildGenetics,
  createDefaultSave,
  encodeBreedingCode,
  type BreedingCodePayload,
} from "@hagumi/core";

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.VITE_SUPABASE_URL!.replace(/\/+$/, "");
const key = env.VITE_SUPABASE_ANON_KEY!;

// Respons signup anon Supabase (field minimal yang dipakai skrip ini).
interface AnonAuthResponse {
  access_token: string;
  user: { id: string };
}

// Dua pemain = dua sesi Anonymous Auth (JWT server-signed — fix keamanan M9)
async function anonSession(): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({}),
  });
  // fetch dari @types/node (lib tanpa DOM) mengetik json() sebagai unknown — ketik eksplisit di sini.
  const data = (await res.json().catch(() => null)) as AnonAuthResponse | null;
  if (!data?.access_token) {
    throw new Error(
      `Anonymous Auth gagal: ${JSON.stringify(data).slice(0, 120)} — aktifkan Anonymous sign-ins di dashboard`,
    );
  }
  return { token: data.access_token, userId: data.user.id };
}
const { token: tokenA, userId: anonA } = await anonSession();
const { token: tokenB, userId: anonB } = await anonSession();

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/** Respons edge breeding — bentuk longgar (field tergantung action), cukup untuk asersi e2e. */
interface EdgeBreedingResponse {
  status: number;
  json: {
    requests: Array<{ status?: string; partner: { name: string } }>;
    sentToday: number;
    requestId?: string;
    error?: string;
    seed?: number;
    partner?: BreedingCodePayload;
  };
}

async function call(token: string, body: Record<string, unknown>): Promise<EdgeBreedingResponse> {
  const res = await fetch(`${url}/functions/v1/breeding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: key,
    },
    body: JSON.stringify(body),
  });
  // fetch dari @types/node (lib tanpa DOM) mengetik json() sebagai unknown — ketik eksplisit di sini.
  const json = (await res.json()) as EdgeBreedingResponse["json"];
  return { status: res.status, json };
}

// Buat save & breeding code untuk dua pemain
const saveA = createDefaultSave({ petName: "Kogitsune", element: "fire", nowMs: Date.now() });
saveA.pet.careScore = 85;
const saveB = createDefaultSave({ petName: "Shirayuki", element: "water", nowMs: Date.now() });
const codeA = encodeBreedingCode(breedingPayloadOf(saveA, anonA, 1));
const codeB = encodeBreedingCode(breedingPayloadOf(saveB, anonB, 2));

function breedingPayloadOf(
  save: ReturnType<typeof createDefaultSave>,
  owner: string,
  gen: number,
) {
  return {
    v: 1 as const,
    owner,
    name: save.pet.name,
    element: save.pet.element,
    coatColor: save.pet.coatColor ?? "#E8874A",
    personality: save.pet.element,
    path: save.pet.path,
    gen,
    careScore: Math.round(save.pet.careScore),
  };
}

// 1) inbox awal
const r1 = await call(tokenA, { action: "inbox", code: codeA });
check("inbox pemain A", r1.status === 200 && r1.json.requests.length === 0, `sentToday=${r1.json.sentToday}`);

// 2) A kirim request ke B
const r2 = await call(tokenA, { action: "send", code: codeA, friendCode: codeB });
check("A kirim request ke B", r2.status === 200 && !!r2.json.requestId, `id=${r2.json.requestId ?? r2.json.error}`);
const requestId = r2.json.requestId as string | undefined;

// 3) B lihat inbox → ada incoming
const r3 = await call(tokenB, { action: "inbox", code: codeB });
check(
  "B melihat permintaan masuk",
  r3.status === 200 && r3.json.requests.length === 1 && r3.json.requests[0]!.partner.name === "Kogitsune",
);

// 4) duplikat ditolak
const r4 = await call(tokenA, { action: "send", code: codeA, friendCode: codeB });
check("duplikat aktif ditolak", r4.status === 400, r4.json.error);

// 5) B accept → seed dikunci
const r5 = await call(tokenB, { action: "accept", code: codeB, requestId });
check("B accept → seed dikunci", r5.status === 200 && typeof r5.json.seed === "number", `seed=${r5.json.seed}`);

// 6) kedua pihak melihat ready
const r6a = await call(tokenA, { action: "inbox", code: codeA });
const r6b = await call(tokenB, { action: "inbox", code: codeB });
check("A melihat hasil siap", r6a.json.requests[0]?.status === "ready");
check("B melihat hasil siap", r6b.json.requests[0]?.status === "ready");

// 7) A klaim telur → genetika deterministik dari seed
const r7 = await call(tokenA, { action: "claim", requestId });
const seed = r7.json.seed as number;
const partner = r7.json.partner as BreedingCodePayload;
check("A klaim telur", r7.status === 200 && seed !== null && partner?.owner === anonB);
if (seed !== undefined && seed !== null && partner) {
  const mine = JSON.parse(
    Buffer.from(codeA.split(".")[1]!, "base64url").toString(),
  );
  const child = computeOnlineChildGenetics(mine, partner, seed);
  const childB = computeOnlineChildGenetics(partner, mine, seed);
  check(
    "genetika anak deterministik & simetris",
    JSON.stringify(child) === JSON.stringify(childB),
    `element=${child.element} coat=${child.coatColor}`,
  );
}

// 8) B klaim juga → done
const r8 = await call(tokenB, { action: "claim", requestId });
check("B klaim telur → request done", r8.status === 200);

// 9) Cloud backup push/pull
// Respons save-sync (field minimal untuk asersi e2e).
interface SaveSyncResponse {
  ok?: boolean;
  lastTick?: number;
  save?: { pet?: { name?: string } };
}
const saveRes = await fetch(`${url}/functions/v1/save-sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    apikey: key,
  },
  body: JSON.stringify({ action: "push", save: saveA, lastTick: saveA.lastTick }),
});
const saveJson = (await saveRes.json()) as SaveSyncResponse;
check("cloud push", saveRes.status === 200 && saveJson.ok === true);
const pullRes = await fetch(`${url}/functions/v1/save-sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenA}`,
    apikey: key,
  },
  body: JSON.stringify({ action: "pull" }),
});
const pullJson = (await pullRes.json()) as SaveSyncResponse;
check(
  "cloud pull = data yang di-push",
  pullJson.lastTick === saveA.lastTick && pullJson.save?.pet?.name === "Kogitsune",
);

console.log(failures === 0 ? "\n🎉 E2E SEMUA LULUS" : `\n⚠️ ${failures} cek gagal`);
process.exit(failures === 0 ? 0 : 1);
