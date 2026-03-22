import type { ReactNode } from "react";

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, open, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="mcg-overlay" onClick={onClose}>
      <div className="mcg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mcg-modal-head">
          <h3 className="mcg-modal-title">{title}</h3>
          <button type="button" className="mcg-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="mcg-modal-content">{children}</div>
      </div>
    </div>
  );
}
