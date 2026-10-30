import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { LevelTag } from "@/features/report/components/LevelTag";
import { LEVEL_LABEL } from "@/features/report/constants";
import { cx } from "@/lib/cx";
import { formatElapsed, formatTime, isLongWait } from "../format";
import type { Issue, IssueAction } from "../schemas";

// 데스크톱에서 헤더와 행의 열을 맞추기 위해 같은 템플릿을 쓴다
export const ISSUE_GRID = "sm:grid-cols-[minmax(0,1fr)_64px_136px_104px_196px]";

type IssueRowProps = {
  issue: Issue;
  now: number;
  pending: boolean;
  onAction: (action: IssueAction) => void;
};

export function IssueRow({ issue, now, pending, onAction }: IssueRowProps) {
  const [open, setOpen] = useState(false);
  const elapsed = formatElapsed(issue.openedAt, now);
  const longWait = isLongWait(issue.openedAt, now);
  const reportsId = `reports-${issue.id}`;

  return (
    <li id={`issue-${issue.id}`} className="border-b border-line py-3.5 last:border-b-0">
      <div className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1", ISSUE_GRID)}>
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate text-[17px] font-semibold">{issue.itemName}</span>
            <LevelTag level={issue.level} />
            {issue.status === "acknowledged" && <Tag tone="neutral">확인함</Tag>}
          </p>
          {/* 휴대폰에서는 열 대신 한 줄 요약으로 보여준다 */}
          <p className="mt-1 text-[13px] text-fg-weak sm:hidden">
            보고 {issue.reportCount}회 · <span className={cx(longWait && "font-semibold text-out")}>{elapsed} 경과</span>
          </p>
        </div>

        <p className="hidden text-[15px] tabular-nums sm:block">{issue.reportCount}회</p>
        <p className="hidden text-[15px] text-fg-sub tabular-nums sm:block">{formatTime(issue.openedAt)}</p>
        <p className={cx("hidden text-[15px] tabular-nums sm:block", longWait ? "font-semibold text-out" : "text-fg-sub")}>
          {elapsed}
        </p>

        <div className="flex justify-end gap-1.5">
          {issue.status === "open" && (
            <Button variant="secondary" disabled={pending} onClick={() => onAction("acknowledge")}>
              확인
            </Button>
          )}
          <Button disabled={pending} onClick={() => onAction("resolve")}>
            처리완료
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={reportsId}
        className="mt-1.5 flex items-center gap-1 text-[13px] text-fg-sub"
      >
        보고 내역 {issue.reportCount}건
        <svg viewBox="0 0 16 16" aria-hidden className={cx("size-3.5 transition-transform", open && "rotate-180")}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ol id={reportsId} className="mt-2 space-y-1.5 rounded-lg bg-surface px-3 py-2.5">
          {issue.reports.map((report) => (
            <li key={report.id} className="text-[14px]">
              <span className="text-fg-weak tabular-nums">{formatTime(report.createdAt)}</span>
              <span className="mx-2">{report.reporterName}</span>
              <span className={cx("font-semibold", report.level === "out" ? "text-out" : "text-low")}>
                {LEVEL_LABEL[report.level]}
              </span>
              {report.memo && <p className="mt-0.5 text-fg-sub">“{report.memo}”</p>}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
