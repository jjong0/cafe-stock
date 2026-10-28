import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "quiet";
  size?: "md" | "lg";
};

const VARIANT = {
  primary: "bg-ink text-thermal hover:bg-ink/90 disabled:bg-ink/30",
  secondary: "bg-counter text-ink ring-1 ring-inset ring-ink/15 hover:bg-steel disabled:text-ink/40",
  quiet: "text-ink-soft hover:text-ink hover:bg-ink/5 disabled:text-ink/30",
} as const;

const SIZE = {
  md: "h-10 px-4 text-sm",
  lg: "h-14 px-6 text-base",
} as const;

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
