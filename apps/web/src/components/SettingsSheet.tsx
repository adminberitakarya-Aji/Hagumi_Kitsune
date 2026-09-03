/** Pengaturan + backup ekspor/impor base64 (Doc 09 §4) — dibuka dari tombol gear HUD.
 * M5: toggle musik/SFX/notify/companion offline (Doc 12 §3.2) — persist via ui/settings. */
import { useState } from "react";
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { HankoButton } from "./HankoButton";

export function SettingsSheet() {
  const backupCode = useGameState().backupCode;
  const cloud = useGameState().cloudSync;
  const [importText, setImportText] = useState("");
  const [music, setMusic] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [notify, setNotify] = useState(true);
  const [offlineLlm, setOfflineLlm] = useState(true);

  const update = (patch: { music?: boolean; sfx?: boolean; notify?: boolean; offlineLlm?: boolean }): void => {
    eventBus.emit("ui/settings", patch);
  };

  return (
    <div className="sheet__body">
      <section className="backup-section">
        <h4 className="backup-title">🎵 Suara</h4>
        <label className="settings-row">
          <span>Musik</span>
          <input
            type="checkbox"
            checked={music}
            onChange={(e) => {
              setMusic(e.target.checked);
              update({ music: e.target.checked });
            }}
          />
        </label>
        <label className="settings-row">
          <span>Efek suara</span>
          <input
            type="checkbox"
            checked={sfx}
            onChange={(e) => {
              setSfx(e.target.checked);
              update({ sfx: e.target.checked });
            }}
          />
        </label>
        <label className="settings-row">
          <span>Notifikasi</span>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => {
              setNotify(e.target.checked);
              update({ notify: e.target.checked });
            }}
          />
        </label>
        <label className="settings-row">
          <span>Mode Tanpa LLM (chat Tier 1)</span>
          <input
            type="checkbox"
            checked={offlineLlm}
            onChange={(e) => {
              setOfflineLlm(e.target.checked);
              update({ offlineLlm: e.target.checked });
            }}
          />
        </label>
      </section>
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
        <h4 className="backup-title">☁️ Backup Awan (M8)</h4>
        <div className="cloud-buttons">
          <HankoButton size="md" disabled={cloud.busy} onClick={() => eventBus.emit("ui/cloud-push", undefined)}>
            ⬆️ Unggah
          </HankoButton>
          <HankoButton size="md" disabled={cloud.busy} onClick={() => eventBus.emit("ui/cloud-pull", undefined)}>
            ⬇️ Tarik
          </HankoButton>
        </div>
        {cloud.diffSummary && (
          <div className="cloud-warning">
            <p className="sheet__note">⚠️ Perbedaan terdeteksi: {cloud.diffSummary}</p>
            <HankoButton size="md" onClick={() => eventBus.emit("ui/cloud-restore", undefined)}>
              Pakai yang Lebih Baru (LWW)
            </HankoButton>
          </div>
        )}
        <p className="sheet__note">
          Butuh konfigurasi Supabase (services/supabase/README.md). Tanpa itu, pakai kode backup manual di atas.
        </p>
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
