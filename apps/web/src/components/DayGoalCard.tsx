/** Goal eksplisit hari-1 (M14 — Doc 14 §6): kurva wahyu — pemain tahu target hari
 * pertama tanpa penjelasan luar. Hilang otomatis saat reward seremonial diberikan. */
import { useGameState } from "../store/gameState";
import { IconTrophy } from "./icons";

export function DayGoalCard() {
  const { dayGoal } = useGameState();
  if (!dayGoal) return null;
  return (
    <div className="day-goal" role="status">
      <span className="day-goal__icon" aria-hidden="true">
        <IconTrophy size={16} />
      </span>
      <div className="day-goal__body">
        <div className="day-goal__title">{dayGoal.title}</div>
        <div className="day-goal__sub">{dayGoal.subtitle}</div>
      </div>
    </div>
  );
}
