import type { ReactNode } from "react";

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: ReactNode;
  count?: number;
  onClick?: () => void;
};

export function Chip({ label, selected = false, icon, count, onClick }: ChipProps) {
  const className = `mcg-chip ${selected ? "selected" : ""}`.trim();
  if (!onClick) {
    return <span className={className}>{icon} {label}{typeof count === "number" ? ` (${count})` : ""}</span>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {icon} {label}{typeof count === "number" ? ` (${count})` : ""}
    </button>
  );
}
