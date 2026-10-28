"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "@/lib/cx";

export type TabOption<T extends string> = { value: T; label: string };

type TabsProps<T extends string> = {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

// 아래 목록을 바꾸는 밑줄 탭. 방향키로 이동하며 바로 선택된다
export function Tabs<T extends string>({ options, value, onChange, label, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cx("flex border-b border-line", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cx(
              "-mb-px h-12 flex-1 whitespace-nowrap border-b-2 text-[15px] transition-colors",
              selected ? "border-fg font-semibold text-fg" : "border-transparent text-fg-weak",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
