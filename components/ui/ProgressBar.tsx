type Props = {
  value: number;
  max: number;
  label?: string;
};

export function ProgressBar({ value, max, label }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round((value / Math.max(max, 1)) * 100)));

  return (
    <div className="progress-wrap" aria-label={label ?? "Progression"}>
      {label ? <div className="progress-label">{label}</div> : null}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <div className="progress-caption">{clamped}%</div>
    </div>
  );
}
