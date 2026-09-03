/** S-Chat — Obrolan companion (M6 — Doc 12 §8): fullscreen washi, bubble pet kiri /
 * pemain kanan, kuota harian, riwayat sesi maks 20 bubble (privasi — Doc 12 §8). */
import { useEffect, useRef, useState } from "react";

import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";

const MAX_BUBBLES = 20; // riwayat sesi (Doc 12 §8)

export function ChatScreen() {
  const { chat, petName } = useGameState();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // terbaru di bawah → scroll otomatis ke bawah saat pesan baru
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length]);

  if (!chat) return null;

  const send = () => {
    const text = draft.trim();
    if (!text || chat.quotaLeft <= 0) return;
    eventBus.emit("ui/chat-send", { text });
    setDraft("");
  };

  return (
    <div className="sheet-backdrop" onClick={() => eventBus.emit("ui/chat-close", undefined)}>
      <div
        className="sheet chat-screen"
        role="dialog"
        aria-label={`Obrolan dengan ${petName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <div className="chat-screen__header">
          <button
            type="button"
            className="chat-screen__back"
            aria-label="Kembali"
            onClick={() => eventBus.emit("ui/chat-close", undefined)}
          >
            ←
          </button>
          <span className="chat-screen__name">{petName}</span>
          <span
            className="chat-screen__status"
            title={
              chat.tier === "tier2"
                ? "Tier 2 — LLM via Supabase edge (Doc 11 §2)"
                : "Tier 1 — memori terstruktur lokal (Doc 08 §5)"
            }
          >
            {chat.tier === "tier2" ? "✨ Tier 2" : "💬 Tier 1"}
          </span>
        </div>

        <div className="chat-screen__list" ref={listRef}>
          {chat.messages.slice(-MAX_BUBBLES).map((m, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${m.from}`}>
              {m.text}
            </div>
          ))}
          {chat.typing && (
            <div className="chat-bubble chat-bubble--pet chat-bubble--typing" aria-label="sedang mengetik">
              •••
            </div>
          )}
          {chat.messages.length === 0 && !chat.typing && (
            <div className="chat-screen__empty">Kyuu~ awali obrolanmu…</div>
          )}
        </div>

        {chat.quotaLeft <= 0 && (
          <div className="chat-screen__quota-banner">
            {petName} beristirahat merenung 💭 — kembali besok
          </div>
        )}

        <div className="chat-screen__input-row">
          <input
            className="chat-screen__input"
            value={draft}
            maxLength={120}
            placeholder="Ketik pesan…"
            disabled={chat.quotaLeft <= 0}
            aria-label="Pesan untuk companion"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            type="button"
            className="chat-screen__send"
            aria-label="Kirim"
            disabled={chat.quotaLeft <= 0 || draft.trim().length === 0}
            onClick={send}
          >
            ➤
          </button>
        </div>
        <div className="chat-screen__quota">
          Kuota hati: {chat.quotaLeft}/10 hari ini
          {chat.canForgive && <span className="chat-screen__forgive"> · coba katakan "maaf"</span>}
        </div>
      </div>
    </div>
  );
}
