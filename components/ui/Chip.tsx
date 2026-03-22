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
  const content = (
    <>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{label}{typeof count === "number" ? ` (${count})` : ""}</span>
    </>
  );

  if (!onClick) {
    return <span className={className}>{content}</span>;
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={selected}>
      {content}
    </button>
  );
}
