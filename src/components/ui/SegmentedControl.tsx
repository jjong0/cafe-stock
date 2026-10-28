"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "@/lib/cx";

export type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
  optionClassName?: string;
};

// 하나만 고르는 선택지 묶음. 방향키로 이동하며 바로 선택되는 radiogroup 패턴을 따른다
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  optionClassName,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={cx("flex gap-1 rounded-xl bg-steel-deep p-1", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cx(
              "flex-1 whitespace-nowrap rounded-lg transition-colors",
              size === "sm" ? "h-8 px-3 text-sm" : "h-11 px-3 text-base",
              selected ? "bg-counter text-ink shadow-[0_1px_2px_rgb(28_35_32/0.12)]" : "text-ink-soft hover:text-ink",
              optionClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
