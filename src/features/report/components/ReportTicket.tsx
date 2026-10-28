import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { LEVEL_LABEL } from "../constants";
import type { Level } from "../schemas";

export type TicketLine = { itemId: string; name: string; level: Level };

type ReportTicketProps = {
  lines: TicketLine[];
  reporterName: string;
  memo: string;
  onMemoChange: (memo: string) => void;
  onRemove: (itemId: string) => void;
  onSubmit: () => void;
  pending: boolean;
  tearing: boolean;
};

const MEMO_MAX = 200;

// 고른 품목이 POS 주문표처럼 한 줄씩 쌓이고, 보내면 뜯어서 넘기듯 빠져나간다
export function ReportTicket({ tearing, ...props }: ReportTicketProps) {
  const empty = props.lines.length === 0;

  return (
    <section
      aria-label="보고표"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-xl drop-shadow-[0_-4px_10px_rgb(28_35_32/0.12)]"
    >
      {/* 빈 상태와 채워진 상태가 바뀔 때 다시 마운트되어 새 용지가 올라오는 모션과 메모 상태 초기화가 함께 일어난다 */}
      <div key={empty ? "empty" : "filled"} className={tearing ? "animate-ticket-tear" : "animate-ticket-feed"}>
        <div className="ticket-edge" />
        <div className="bg-thermal px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {empty ? (
            <p className="py-2 text-center text-sm text-ink-soft">떨어진 품목을 누르면 여기에 담깁니다.</p>
          ) : (
            <FilledTicket {...props} />
          )}
        </div>
      </div>
    </section>
  );
}

function FilledTicket({ lines, reporterName, memo, onMemoChange, onRemove, onSubmit, pending }: Omit<ReportTicketProps, "tearing">) {
  const [memoOpen, setMemoOpen] = useState(false);

  return (
    <>
      <header className="flex items-baseline justify-between border-b border-dashed border-ink/25 pb-2">
        <h2 className="font-display text-xl">보고표</h2>
        <p className="font-mono text-xs text-ink-soft">
          {reporterName} · {lines.length}건
        </p>
      </header>

      <ul className="max-h-40 overflow-y-auto py-1.5">
        {lines.map((line) => (
          <li key={line.itemId} className="flex items-center gap-2 py-1">
            <span className="shrink-0 text-[15px] font-medium">{line.name}</span>
            <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-ink/20" />
            <span className={cx("shrink-0 text-sm font-semibold", line.level === "out" ? "text-stamp" : "text-tape-ink")}>
              {LEVEL_LABEL[line.level]}
            </span>
            <button
              type="button"
              onClick={() => onRemove(line.itemId)}
              aria-label={`${line.name} 빼기`}
              className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {memoOpen ? (
        <label className="mt-1 block">
          <span className="sr-only">메모</span>
          <textarea
            value={memo}
            onChange={(event) => onMemoChange(event.target.value)}
            maxLength={MEMO_MAX}
            rows={2}
            autoFocus
            placeholder="예: 오후 피크 전에 필요해요"
            className="w-full resize-none rounded-lg bg-counter px-3 py-2 text-[15px] ring-1 ring-inset ring-ink/15 placeholder:text-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setMemoOpen(true)}
          className="mt-1 text-sm font-medium text-ink-soft underline decoration-ink/25 underline-offset-4 hover:text-ink"
        >
          메모 남기기
        </button>
      )}

      <Button size="lg" onClick={onSubmit} disabled={pending} className="mt-3 w-full">
        {pending ? "보내는 중…" : `보고 보내기 · ${lines.length}건`}
      </Button>
    </>
  );
}
