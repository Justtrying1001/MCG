import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="admin-v2-page-header">
      <div>
        <h1 className="admin-v2-title">{title}</h1>
        {subtitle ? <p className="admin-v2-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-v2-header-actions">{actions}</div> : null}
    </section>
  );
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <section className="admin-v2-toolbar">{children}</section>;
}

export function AdminStatusBadge({
  tone,
  label,
}: {
  tone: "neutral" | "success" | "warn" | "danger";
  label: string;
}) {
  return <span className={`admin-v2-badge ${tone}`}>{label}</span>;
}

export function AdminStatStrip({ items }: { items: Array<{ label: string; value: string; tone?: "neutral" | "success" | "warn" | "danger" }> }) {
  return (
    <section className="admin-v2-stat-strip">
      {items.map((item) => (
        <article key={item.label} className="admin-v2-stat-item">
          <p className="admin-v2-stat-label">{item.label}</p>
          <div className="admin-v2-stat-value-row">
            <strong className="admin-v2-stat-value">{item.value}</strong>
            {item.tone ? <AdminStatusBadge tone={item.tone} label={item.tone.toUpperCase()} /> : null}
          </div>
        </article>
      ))}
    </section>
  );
}

export function AdminPanel({ children, className }: { children: ReactNode; className?: string }) {
  const classes = className ? `admin-v2-panel ${className}` : "admin-v2-panel";
  return <section className={classes}>{children}</section>;
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="admin-v2-empty">
      <p>{title}</p>
      {description ? <small>{description}</small> : null}
    </div>
  );
}

export function AdminDataTable({
  columns,
  children,
}: {
  columns: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-v2-table" style={{ ["--admin-columns" as string]: columns }}>
      {children}
    </section>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return <div className="admin-v2-table-head">{children}</div>;
}

export function AdminTableRow({ children }: { children: ReactNode }) {
  return <div className="admin-v2-table-row">{children}</div>;
}
