/** WashiPanel — bottom sheet (Doc 12 §2.3) dengan transisi masuk & KELUAR (M12 — Doc 14 §4):
 * tutup → slide-down 250ms → unmount SETELAH animasi (perbaikan bug `if (!open) return null`). */
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

const EXIT_MS = 250; // --dur-sheet

interface WashiPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function WashiPanel({ open, title, onClose, children }: WashiPanelProps) {
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      return;
    }
    if (!visible) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, visible]);

  if (!visible) return null;

  return (
    <div className={`sheet-backdrop${closing ? " sheet-backdrop--closing" : ""}`} onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__title">{title}</div>
        {children}
      </div>
    </div>
  );
}
