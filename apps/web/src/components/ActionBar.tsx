/** Action bar grid-6 tetap (Doc 12 §3.2 Gaya 2). */
export interface ActionBarProps {
  onAction?: (id: string) => void;
}

const ACTIONS = [
  { id: "dapur", icon: "🍖", title: "Dapur" },
  { id: "onsen", icon: "♨️", title: "Onsen" },
  { id: "futon", icon: "🛏️", title: "Futon" },
  { id: "toko", icon: "🏪", title: "Toko" },
  { id: "album", icon: "📖", title: "Album" },
  { id: "chat", icon: "💬", title: "Chat" },
] as const;

export function ActionBar({ onAction }: ActionBarProps) {
  return (
    <nav className="action-bar" aria-label="menu utama">
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          title={action.title}
          onClick={() => onAction?.(action.id)}
        >
          {action.icon}
        </button>
      ))}
    </nav>
  );
}
