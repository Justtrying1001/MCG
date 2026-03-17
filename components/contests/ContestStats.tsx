export type ContestStatItem = {
  label: string;
  value: string;
  tone: "live" | "active" | "reward";
};

export function ContestStats({ items }: { items: ContestStatItem[] }) {
  return (
    <div className="contest-arena-stats" aria-label="Contest arena quick stats">
      {items.map((item) => (
        <article key={item.label} className={`contest-arena-stat-card tone-${item.tone}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
