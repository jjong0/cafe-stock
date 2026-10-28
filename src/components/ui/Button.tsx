import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "quiet";
  size?: "md" | "lg";
};

const VARIANT = {
  primary: "bg-primary text-white active:bg-primary/85 disabled:bg-line disabled:text-fg-weak",
  secondary: "bg-surface text-fg active:bg-line disabled:text-fg-weak",
  quiet: "text-fg-sub active:bg-surface disabled:text-fg-weak",
} as const;

const SIZE = {
  md: "h-10 rounded-lg px-4 text-[15px]",
  lg: "h-14 rounded-xl px-6 text-[17px]",
} as const;

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
