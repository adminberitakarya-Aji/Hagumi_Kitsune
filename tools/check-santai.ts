/** Skrip analisis sekali-jalan: profil kematian persona santai (tuning M5). Jalankan: pnpm tsx tools/check-santai.ts */
import { runSimulation, SIM_PROFILES } from "./simulate";

const santai = SIM_PROFILES.santai!;
const deaths: Array<{ seed: number; day: number; path: string }> = [];
let alive = 0;
for (let seed = 1; seed <= 60; seed++) {
  const s = runSimulation(seed, false, santai);
  if (s.stage === "dead" && s.deathDay !== null) {
    deaths.push({ seed, day: s.deathDay, path: s.path });
  } else {
    alive++;
  }
}
console.log(`santai: ${alive}/60 hidup, ${deaths.length} mati`);
console.log("kematian per seed:", deaths.map((d) => `${d.seed}:d${d.day}(${d.path})`).join(" "));
