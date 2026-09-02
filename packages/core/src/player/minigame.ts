/**
 * HAGUMI core — Mini-game reward & gating (Doc 05 §1, §5 & §7).
 * Murni & data-agnostic: semua angka datang lewat params (dibangun dari minigames.json).
 */

export interface MinigameRewardParams {
  coinPerPoint: number;
  minCoins: number;
  happinessMin: number;
  happinessMax: number;
  /** Multiplier koin per fase hari, mis. { day: 1.1 } (Doc 03 §3). */
  dayPhaseMultipliers: Record<string, number>;
  /** Pengali koin tahap hidup (elder 1.1, teen/adult 1.0 — Doc 05 §1). */
  stageCoinMultiplier: number;
  /** Bonus elemen mystic: +10% koin akhir (0 bila bukan mystic — Doc 05 §4). */
  mysticBonusPct: number;
  /** Bonus koin hari login ke-7 (0 bila bukan — Doc 05 §5). */
  streakBonusCoins: number;
  /** Pengali musim (matsuri musiman panas ×1.5 — Doc 05 §5, Doc 03 §5). */
  seasonMultiplier?: number;
  /** Fase hari saat bermain (kunci dayPhaseMultipliers). */
  dayPhase: string;
}

export interface MinigameReward {
  coins: number;
  happiness: number;
}

/**
 * Koin = floor(poin × coinPerPoint) × stage × dayPhase × season × (1 + mystic) + streak (Doc 05 §5).
 * Happiness = linear min→max berdasar poin (0 poin = min, 100+ poin = max — Doc 05 §1).
 */
export function calculateMinigameReward(points: number, params: MinigameRewardParams): MinigameReward {
  const base = Math.floor(points * params.coinPerPoint);
  const phaseMult = params.dayPhaseMultipliers[params.dayPhase] ?? 1;
  const raw = base * params.stageCoinMultiplier * phaseMult * (params.seasonMultiplier ?? 1) * (1 + params.mysticBonusPct);
  const coins = Math.max(params.minCoins, Math.round(raw) + params.streakBonusCoins);

  const clamped = Math.min(points, 100);
  const happiness = Math.round(
    params.happinessMin + ((params.happinessMax - params.happinessMin) * clamped) / 100,
  );

  return { coins, happiness };
}

export interface MinigameGateInput {
  state: string;
  stage: string;
  energy: number;
  lastPlayAt: number;
  nowMs: number;
  cooldownMs: number;
  minEnergyToPlay: number;
  /** Stage rule dari minigames.json (baby.locked = true). */
  stageLocked: boolean;
}

export type MinigameGateResult =
  | { allowed: true }
  | { allowed: false; reason: "BABY_LOCKED" | "ALREADY_SLEEPING" | "IS_DEAD" | "TOO_TIRED" | "COOLDOWN" };

/** Gerbang pra-main (Doc 05 §1 & §7): baby terkunci, energy < 15 ditolak, cooldown 30 menit. */
export function canPlayMinigame(input: MinigameGateInput): MinigameGateResult {
  if (input.state === "dead" || input.stage === "dead") return { allowed: false, reason: "IS_DEAD" };
  if (input.stageLocked) return { allowed: false, reason: "BABY_LOCKED" };
  if (input.state === "sleeping") return { allowed: false, reason: "ALREADY_SLEEPING" };
  if (input.energy < input.minEnergyToPlay) return { allowed: false, reason: "TOO_TIRED" };
  if (input.nowMs - input.lastPlayAt < input.cooldownMs) return { allowed: false, reason: "COOLDOWN" };
  return { allowed: true };
}
