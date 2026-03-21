import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SurfaceProps<T extends ElementType> = {
  as?: T;
  variant?: "base" | "raised" | "highlight";
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Surface<T extends ElementType = "section">({
  as,
  variant = "base",
  className = "",
  children,
  ...rest
}: SurfaceProps<T>) {
  const Component = as ?? "section";
  return (
    <Component className={`mcg-surface ${variant === "base" ? "" : variant} ${className}`.trim()} data-surface-variant={variant} {...rest}>
      {children}
    </Component>
  );
}
