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
} from "@hagumi/core";

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.VITE_SUPABASE_URL!.replace(/\/+$/, "");
const key = env.VITE_SUPABASE_ANON_KEY!;
const anonA = crypto.randomUUID();
const anonB = crypto.randomUUID();

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function call(anon: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${url}/functions/v1/breeding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
      "x-hagumi-anon": anon,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
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
const r1 = await call(anonA, { action: "inbox", code: codeA });
check("inbox pemain A", r1.status === 200 && r1.json.requests.length === 0, `sentToday=${r1.json.sentToday}`);

// 2) A kirim request ke B
const r2 = await call(anonA, { action: "send", code: codeA, friendCode: codeB });
check("A kirim request ke B", r2.status === 200 && !!r2.json.requestId, `id=${r2.json.requestId ?? r2.json.error}`);
const requestId = r2.json.requestId as string | undefined;

// 3) B lihat inbox → ada incoming
const r3 = await call(anonB, { action: "inbox", code: codeB });
check(
  "B melihat permintaan masuk",
  r3.status === 200 && r3.json.requests.length === 1 && r3.json.requests[0].partner.name === "Kogitsune",
);

// 4) duplikat ditolak
const r4 = await call(anonA, { action: "send", code: codeA, friendCode: codeB });
check("duplikat aktif ditolak", r4.status === 400, r4.json.error);

// 5) B accept → seed dikunci
const r5 = await call(anonB, { action: "accept", code: codeB, requestId });
check("B accept → seed dikunci", r5.status === 200 && typeof r5.json.seed === "number", `seed=${r5.json.seed}`);

// 6) kedua pihak melihat ready
const r6a = await call(anonA, { action: "inbox", code: codeA });
const r6b = await call(anonB, { action: "inbox", code: codeB });
check("A melihat hasil siap", r6a.json.requests[0]?.status === "ready");
check("B melihat hasil siap", r6b.json.requests[0]?.status === "ready");

// 7) A klaim telur → genetika deterministik dari seed
const r7 = await call(anonA, { action: "claim", requestId });
const seed = r7.json.seed as number;
const partner = r7.json.partner as { owner: string; careScore: number };
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
const r8 = await call(anonB, { action: "claim", requestId });
check("B klaim telur → request done", r8.status === 200);

// 9) Cloud backup push/pull
const saveRes = await fetch(`${url}/functions/v1/save-sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    apikey: key,
    "x-hagumi-anon": anonA,
  },
  body: JSON.stringify({ action: "push", save: saveA, lastTick: saveA.lastTick }),
});
const saveJson = await saveRes.json();
check("cloud push", saveRes.status === 200 && saveJson.ok === true);
const pullRes = await fetch(`${url}/functions/v1/save-sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    apikey: key,
    "x-hagumi-anon": anonA,
  },
  body: JSON.stringify({ action: "pull" }),
});
const pullJson = await pullRes.json();
check(
  "cloud pull = data yang di-push",
  pullJson.lastTick === saveA.lastTick && pullJson.save?.pet?.name === "Kogitsune",
);

console.log(failures === 0 ? "\n🎉 E2E SEMUA LULUS" : `\n⚠️ ${failures} cek gagal`);
process.exit(failures === 0 ? 0 : 1);
