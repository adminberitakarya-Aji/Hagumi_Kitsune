/** Pengaturan + backup ekspor/impor base64 (Doc 09 §4) — dibuka dari tombol gear HUD. */
import { useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";

export function SettingsSheet() {
  const backupCode = useGameState().backupCode;
  const [importText, setImportText] = useState("");

  return (
    <div className="sheet__body">
      <section className="backup-section">
        <h4 className="backup-title">📦 Backup Progress</h4>
        <HankoButton
          size="md"
          onClick={() => eventBus.emit("ui/backup-export", undefined)}
        >
          Buat Kode Backup
        </HankoButton>
        {backupCode && (
          <>
            <textarea className="backup-textarea" readOnly value={backupCode} rows={3} />
            <button
              type="button"
              className="backup-copy"
              onClick={() => {
                void navigator.clipboard.writeText(backupCode).then(
                  () => alert("Kode backup disalin ke clipboard"),
                  () => alert("Gagal menyalin — salin manual dari kotak"),
                );
              }}
            >
              📋 Salin
            </button>
          </>
        )}
      </section>
      <section className="backup-section">
        <h4 className="backup-title">♻️ Pulihkan dari Kode</h4>
        <textarea
          className="backup-textarea"
          placeholder="Tempel kode backup di sini..."
          rows={3}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <HankoButton
          size="md"
          disabled={importText.trim().length === 0}
          onClick={() => eventBus.emit("ui/backup-import", { code: importText.trim() })}
        >
          Impor
        </HankoButton>
        <p className="sheet__note">Impor akan MENGGANTI save sekarang. Ekspor dulu bila ragu.</p>
      </section>
    </div>
  );
}
