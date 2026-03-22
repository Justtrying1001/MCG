type StatusTone = "open" | "live" | "locked" | "settled" | "success" | "warning" | "danger";

const toneClass: Record<StatusTone, string> = {
  open: "open",
  live: "live",
  locked: "locked",
  settled: "settled",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return <span className={`mcg-badge ${toneClass[tone]}`.trim()}>{label}</span>;
}
