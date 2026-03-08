import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "gold" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
};

export function Button({ variant = "primary", icon, className = "", children, ...props }: Props) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {icon ? <span className="btn-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
