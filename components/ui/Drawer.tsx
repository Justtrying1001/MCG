"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Drawer({ open, title, children, onClose }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mcg-overlay" onClick={onClose}>
      <div className="mcg-drawer" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mcg-modal-head">
          <h3 className="mcg-modal-title">{title}</h3>
          <button type="button" className="mcg-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mcg-modal-content">{children}</div>
      </div>
    </div>
  );
}
