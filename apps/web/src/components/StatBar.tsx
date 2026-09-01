/** StatBar mini (Doc 12 §2.1) — blink saat <30. */
interface StatBarProps {
  icon: string;
  value: number;
  color: string;
}

export function StatBar({ icon, value, color }: StatBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span className={`stat${clamped < 30 ? " stat--urgent" : ""}`}>
      <span className="stat__icon">{icon}</span>
      <span className="stat__bar">
        <i style={{ width: `${clamped}%`, backgroundColor: color }} />
      </span>
    </span>
  );
}
