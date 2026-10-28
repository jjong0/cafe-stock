import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type TagProps = {
  tone: "warning" | "danger" | "neutral";
  children: ReactNode;
  className?: string;
};

const TONE = {
  warning: "bg-low-soft text-low",
  danger: "bg-out-soft text-out",
  neutral: "bg-surface text-fg-sub",
} as const;

export function Tag({ tone, children, className }: TagProps) {
  return (
    <span className={cx("inline-flex h-[22px] items-center rounded-md px-1.5 text-[13px] font-semibold", TONE[tone], className)}>
      {children}
    </span>
  );
}
