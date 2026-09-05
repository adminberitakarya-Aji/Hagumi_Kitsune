/** Action bar grid-6 tetap (Doc 12 §3.2 Gaya 2) — ikon vector (M10, Doc 10 §0).
 * M12: haptic ringan + SFX click di setiap CTA (Doc 14 §4). */
import { IconAlbum, IconChat, IconDapur, IconFuton, IconOnsen, IconToko } from "./icons";
import { audioEngine } from "../system/audioEngine";
import { haptic } from "../system/haptics";

export interface ActionBarProps {
  onAction?: (id: string) => void;
}

const ACTIONS = [
  { id: "dapur", Icon: IconDapur, title: "Dapur" },
  { id: "onsen", Icon: IconOnsen, title: "Onsen" },
  { id: "futon", Icon: IconFuton, title: "Futon" },
  { id: "toko", Icon: IconToko, title: "Toko" },
  { id: "album", Icon: IconAlbum, title: "Album" },
  { id: "chat", Icon: IconChat, title: "Chat" },
] as const;

/** "chat" punya jalur sendiri (M6 — ui/chat-open), sisanya lewat ui/action. */
export function ActionBar({ onAction }: ActionBarProps) {
  return (
    <nav className="action-bar" aria-label="menu utama">
      {ACTIONS.map(({ id, Icon, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          aria-label={title}
          onClick={() => {
            haptic("light");
            audioEngine.playSfx("click");
            onAction?.(id);
          }}
        >
          <Icon size={22} />
        </button>
      ))}
    </nav>
  );
}
