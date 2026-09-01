/** WashiPanel — bottom sheet (Doc 12 §2.3): lebar 328, backdrop tap-tutup, slide-up 250ms. */
import type { ReactNode } from "react";

interface WashiPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function WashiPanel({ open, title, onClose, children }: WashiPanelProps) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__title">{title}</div>
        {children}
      </div>
    </div>
  );
}
