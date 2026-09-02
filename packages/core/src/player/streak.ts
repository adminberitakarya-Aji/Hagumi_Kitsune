/**
 * HAGUMI core — Streak login harian (Doc 06 §4).
 * Murni terhadap tanggal lokal "YYYY-MM-DD"; putus bila absen ≥1 hari penuh.
 */

export interface LoginStreak {
  count: number;
  lastDay: string;
}

export interface StreakUpdateResult {
  streak: LoginStreak;
  /** true bila ini buka-an baru yang berhak hadiah (bukan buka ulang hari sama). */
  isNewDay: boolean;
  /** Posisi hadiah hari ini pada tabel rewards (1-based). */
  rewardDay: number;
}

/** Selisih hari kalender: a - b (bukan durasi jam). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((da.getTime() - db.getTime()) / 86_400_000);
}

/**
 * Perbarui streak saat buka game.
 * - Hari sama → tidak ada hadiah ulang.
 * - Selisih 1 hari → streak+1.
 * - Selisih ≥2 hari → putus, reset ke 1.
 */
export function updateLoginStreak(
  streak: LoginStreak,
  todayLocal: string,
  maxCycle: number = 7,
): StreakUpdateResult {
  const diff = daysBetween(todayLocal, streak.lastDay);
  if (diff === 0) {
    return { streak, isNewDay: false, rewardDay: streak.count };
  }
  const count = diff === 1 ? streak.count + 1 : 1;
  // siklus 7 hari: hari 8 kembali ke 1 (Doc 06 §4 "8+ reset ke 1")
  const cycleDay = count > maxCycle ? ((count - 1) % maxCycle) + 1 : count;
  return {
    streak: { count, lastDay: todayLocal },
    isNewDay: true,
    rewardDay: cycleDay,
  };
}
