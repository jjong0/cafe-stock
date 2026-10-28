import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type TagProps = {
  tone: "tape" | "stamp" | "neutral";
  children: ReactNode;
  className?: string;
};

// tape: 손으로 뜯은 마스킹테이프처럼 양 끝을 톱니로 자른다
const TAPE_EDGE =
  "[clip-path:polygon(0_10%,4%_0,96%_8%,100%_0,98%_50%,100%_100%,96%_92%,4%_100%,0_90%,2%_50%)]";

const TONE = {
  tape: cx("bg-tape px-2.5 text-tape-ink", TAPE_EDGE),
  stamp: "rounded-[3px] px-1.5 text-stamp ring-[1.5px] ring-inset ring-stamp -rotate-2",
  neutral: "rounded-[3px] bg-ink/8 px-1.5 text-ink-soft",
} as const;

export function Tag({ tone, children, className }: TagProps) {
  return (
    <span className={cx("inline-flex h-5 items-center text-xs font-semibold tracking-tight", TONE[tone], className)}>
      {children}
    </span>
  );
}
