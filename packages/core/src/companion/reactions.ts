/**
 * Reaksi non-verbal (M6 — Doc 08 §1): emoji ikon kecil untuk feedback instan aksi.
 * Render di scene di atas pet — bukan balon bicara.
 */
export type ReactionAction =
  | "feed"
  | "bath"
  | "sleep"
  | "wake"
  | "stroke"
  | "scoop"
  | "medicine"
  | "sick"
  | "minigame";

const REACTIONS: Record<ReactionAction, string> = {
  feed: "❤️",
  bath: "💧",
  sleep: "💤",
  wake: "💤",
  stroke: "❤️",
  scoop: "✨",
  medicine: "💧",
  sick: "💢",
  minigame: "❤️",
};

/** Emoji reaksi untuk satu aksi (instant feedback — Doc 08 §1). */
export function reactionFor(action: ReactionAction): string {
  return REACTIONS[action] ?? "❤️";
}
