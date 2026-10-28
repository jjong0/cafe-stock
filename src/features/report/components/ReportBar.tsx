import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { LEVEL_LABEL } from "../constants";
import type { Level } from "../schemas";

export type SelectedLine = { itemId: string; name: string; level: Level };

type ReportBarProps = {
  lines: SelectedLine[];
  memo: string;
  onMemoChange: (memo: string) => void;
  onRemove: (itemId: string) => void;
  onSubmit: () => void;
  pending: boolean;
};

const MEMO_MAX = 200;

// 고른 품목이 있을 때만 뜨는 하단 바. 다른 분류에서 고른 품목도 여기서 확인하고 뺄 수 있다
export function ReportBar({ lines, memo, onMemoChange, onRemove, onSubmit, pending }: ReportBarProps) {
  const [listOpen, setListOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(memo.length > 0);
  const summary = lines.map((line) => `${line.name} ${LEVEL_LABEL[line.level]}`).join(", ");

  return (
    <section aria-label="보고할 품목" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg">
      <div className="mx-auto w-full max-w-xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {listOpen && (
          <ul className="mb-2 max-h-48 overflow-y-auto">
            {lines.map((line) => (
              <li key={line.itemId} className="flex h-11 items-center justify-between">
                <span className="text-[15px]">
                  {line.name}
                  <span className={cx("ml-2 font-semibold", line.level === "out" ? "text-out" : "text-low")}>
                    {LEVEL_LABEL[line.level]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(line.itemId)}
                  className="h-9 rounded-lg px-3 text-[14px] text-fg-sub active:bg-surface"
                >
                  빼기
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setListOpen((open) => !open)}
            aria-expanded={listOpen}
            className="flex min-w-0 flex-1 items-baseline text-left"
          >
            <span className="flex shrink-0 items-center gap-1 text-[15px] font-semibold">
              {lines.length}개 선택
              <svg viewBox="0 0 16 16" aria-hidden className={cx("size-4 text-fg-weak transition-transform", listOpen && "rotate-180")}>
                <path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {!listOpen && <span className="ml-2 min-w-0 truncate text-[14px] text-fg-weak">{summary}</span>}
          </button>
          {!memoOpen && (
            <button type="button" onClick={() => setMemoOpen(true)} className="shrink-0 text-[14px] text-fg-sub">
              메모 추가
            </button>
          )}
        </div>

        {memoOpen && (
          <label className="mt-2 block">
            <span className="sr-only">메모</span>
            <textarea
              value={memo}
              onChange={(event) => onMemoChange(event.target.value)}
              maxLength={MEMO_MAX}
              rows={2}
              autoFocus
              placeholder="사장님께 전할 말 (선택)"
              className="w-full resize-none rounded-lg bg-surface px-3 py-2.5 text-[15px] placeholder:text-fg-weak focus:outline-none focus:ring-2 focus:ring-fg"
            />
          </label>
        )}

        <Button size="lg" onClick={onSubmit} disabled={pending} className="mt-3 w-full">
          {pending ? "보내는 중…" : "보고 보내기"}
        </Button>
      </div>
    </section>
  );
}
