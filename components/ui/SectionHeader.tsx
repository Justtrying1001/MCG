import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function SectionHeader({ eyebrow, title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="mcg-section-header">
      <div>
        {eyebrow ? <p className="mcg-eyebrow">{eyebrow}</p> : null}
        <h2 className="mcg-title">{title}</h2>
        {subtitle ? <p className="mcg-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
