/** Layar Tukar Kode antar-pemain (M8 — Doc 07 §2B): breeding code + inbox asinkron.
 * Tanpa Supabase: fitur nonaktif mulus, game lokal tetap utuh (DoD M8). */
import { useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { ELEMENT_LABEL } from "../lib/elements";
import { ELEMENT_PALETTE } from "../game/art/palette";
import { Egg, FoxFace, IconChat, IconCheck, IconClock, IconClose } from "./icons";

const elemColor = (element: string): string => ELEMENT_PALETTE[element]?.body ?? "#E8874A";

const REASON_TEXT: Record<string, string> = {
  TOO_YOUNG: "Umur minimal 20 hari (Dewasa)",
  LOW_HEALTH: "Health minimal 80",
  LOW_HAPPINESS: "Happiness minimal 80",
  ON_COOLDOWN: "Cooldown 7 hari belum selesai",
  QUOTA_FULL: "Keturunan maksimal 4 seumur hidup",
};

export function OnlineBreedingScreen() {
  const { onlineBreeding: online } = useGameState();
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState(false);
  if (!online) return null;

  const quotaFull = online.sentToday >= online.maxPerDay;

  const copyCode = (): void => {
    void navigator.clipboard.writeText(online.myCode).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => alert("Gagal menyalin — salin manual dari kotak"),
    );
  };

  return (
    <div className="online" role="dialog" aria-label="Tukar Kode Antar-Pemain">
      <header className="breeding__header">
        <button
          type="button"
          className="breeding__back"
          aria-label="kembali"
          onClick={() => eventBus.emit("ui/online-close", undefined)}
        >
          ‹
        </button>
        <h2 className="breeding__title">
          <IconChat size={16} /> Tukar Kode
        </h2>
      </header>

      {online.status === "unconfigured" && (
        <p className="online__banner online__banner--off">
          Fitur online nonaktif (Supabase belum dikonfigurasi) — game lokal tetap utuh.
        </p>
      )}
      {online.status === "offline" && (
        <p className="online__banner online__banner--off">
          Server tidak terjangkau — coba Muat Ulang, atau mainkan offline.
        </p>
      )}
      {online.status === "ready" && <p className="online__banner">Online — asinkron, tanpa real-time.</p>}

      {online.status !== "unconfigured" && (
        <>
          <section className="online__section">
            <h4 className="online__label">Breeding Code-mu</h4>
            <textarea className="online__code" readOnly value={online.myCode} rows={2} />
            <button type="button" className="online__copy" onClick={copyCode}>
              {copied ? (
                <>
                  <IconCheck size={12} /> Tersalin!
                </>
              ) : (
                "Salin Kode"
              )}
            </button>
            <p className="online__hint">Tukarkan kode ini dengan teman — berisi hash gen pet (Doc 07 §2B).</p>
          </section>

          <section className="online__section">
            <h4 className="online__label">Kirim Permintaan</h4>
            <textarea
              className="online__code"
              placeholder="Tempel kode temanmu di sini..."
              rows={2}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <button
              type="button"
              className="online__copy"
              disabled={online.busy || paste.trim().length === 0}
              onClick={() => {
                eventBus.emit("ui/online-send", { code: paste.trim() });
                setPaste("");
              }}
            >
              Kirim Permintaan
            </button>
            <p className="online__hint">
              Kuota harian {online.sentToday}/{online.maxPerDay} — hasil telur muncul saat kalian berdua buka game.
            </p>
            {!online.canBreed && (
              <ul className="breeding__reqs">
                {online.reasons.map((r) => (
                  <li key={r} className="breeding__req">
                    • {REASON_TEXT[r] ?? r}
                  </li>
                ))}
              </ul>
            )}
            {quotaFull && <p className="online__hint">Kuota harian habis — coba lagi besok.</p>}
          </section>

          <section className="online__section">
            <h4 className="online__label">
              Kotak Masuk{" "}
              <button
                type="button"
                className="online__refresh"
                disabled={online.busy}
                onClick={() => eventBus.emit("ui/online-refresh", undefined)}
              >
                Muat Ulang
              </button>
            </h4>
            {online.requests.length === 0 && (
              <p className="online__hint">
                <IconClock size={12} /> Belum ada permintaan — minta temanmu menukar kode
              </p>
            )}
            <ul className="online__list">
              {online.requests.map((req) => (
                <li key={req.id} className="online__card">
                  <div
                    className="partner-card__avatar"
                    style={{ background: req.partnerCoat || "var(--washi)" }}
                  >
                    {req.partnerElement ? (
                      <FoxFace color={elemColor(req.partnerElement)} size={20} />
                    ) : (
                      <IconClock size={20} />
                    )}
                  </div>
                  <div className="online__card-info">
                    <div className="partner-card__name">{req.partnerName}</div>
                    <div className="partner-card__elem">
                      {req.direction === "incoming" ? "ingin breeding dengan petmu" : "menunggu persetujuan mitra"}
                      {req.partnerElement
                        ? ` · ${ELEMENT_LABEL[req.partnerElement as keyof typeof ELEMENT_LABEL] ?? req.partnerElement}`
                        : ""}
                      {req.partnerGen > 0 ? ` · gen ${req.partnerGen}` : ""}
                    </div>
                  </div>
                  {req.status === "ready" ? (
                    <button
                      type="button"
                      className="partner-card__btn"
                      disabled={online.busy}
                      onClick={() => eventBus.emit("ui/online-claim", { requestId: req.id })}
                    >
                      <Egg color="#F5EFE0" size={14} /> Klaim
                    </button>
                  ) : req.direction === "incoming" ? (
                    <div className="online__actions">
                      <button
                        type="button"
                        className="online__accept"
                        disabled={online.busy}
                        onClick={() => eventBus.emit("ui/online-accept", { requestId: req.id })}
                      >
                        <IconCheck size={14} />
                      </button>
                      <button
                        type="button"
                        className="online__decline"
                        disabled={online.busy}
                        onClick={() => eventBus.emit("ui/online-decline", { requestId: req.id })}
                      >
                        <IconClose size={14} />
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
