export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mcg-empty">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
