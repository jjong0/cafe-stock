"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toast, toastMessage, type ToastMessage } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api-client";
import { cx } from "@/lib/cx";
import { useIssues } from "../hooks/useIssues";
import { useNow } from "../hooks/useNow";
import type { Issue, IssueAction, IssueFilter } from "../schemas";
import { ISSUE_GRID, IssueRow } from "./IssueRow";

const FILTER_LABEL: Record<IssueFilter, string> = { all: "전체", open: "미확인", acknowledged: "확인됨" };

export function OwnerIssuesView({ initialIssues, serverNow }: { initialIssues: Issue[]; serverNow: number }) {
  const { issues, pendingId, refreshing, refresh, transition } = useIssues(initialIssues);
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const now = useNow(serverNow);

  // 필터는 이미 받은 미처리 이슈를 화면에서 나눈다. 개수를 버튼에 바로 보여줄 수 있다
  const counts = useMemo(
    () => ({
      all: issues.length,
      open: issues.filter((issue) => issue.status === "open").length,
      acknowledged: issues.filter((issue) => issue.status === "acknowledged").length,
    }),
    [issues],
  );
  const visible = filter === "all" ? issues : issues.filter((issue) => issue.status === filter);
  const filterOptions = (Object.keys(FILTER_LABEL) as IssueFilter[]).map((value) => ({
    value,
    label: `${FILTER_LABEL[value]} ${counts[value]}`,
  }));

  const dismissToast = useCallback(() => setToast(null), []);
  const showError = (err: unknown) =>
    setToast(toastMessage(err instanceof ApiClientError ? err.message : "요청을 처리하지 못했습니다.", "error"));

  async function handleAction(issueId: string, action: IssueAction) {
    try {
      const issue = await transition(issueId, action);
      const text = issue.status === "resolved" ? `${issue.itemName} 처리완료했습니다.` : `${issue.itemName} 확인했습니다.`;
      setToast(toastMessage(text, "success"));
    } catch (err) {
      showError(err);
      // 다른 탭에서 먼저 처리한 경우 등 화면이 실제 상태와 어긋났을 수 있어 다시 받아온다
      if (err instanceof ApiClientError && (err.status === 409 || err.status === 404)) await refresh().catch(() => {});
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold">미처리 이슈</h1>
        <div className="flex items-center gap-2">
          <SegmentedControl label="상태 필터" options={filterOptions} value={filter} onChange={setFilter} size="sm" />
          <Button variant="quiet" onClick={() => refresh().catch(showError)} disabled={refreshing}>
            {refreshing ? "불러오는 중…" : "새로고침"}
          </Button>
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyState hasAny={issues.length > 0} />
      ) : (
        <section aria-label="이슈 목록" className="mt-4">
          <div className={cx("hidden border-b border-line pb-2 text-[13px] text-fg-weak sm:grid sm:gap-x-4", ISSUE_GRID)}>
            <span>품목</span>
            <span>보고</span>
            <span>최초 보고</span>
            <span>경과</span>
            <span className="sr-only">처리</span>
          </div>
          <ul>
            {visible.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                now={now}
                pending={pendingId === issue.id}
                onAction={(action) => handleAction(issue.id, action)}
              />
            ))}
          </ul>
        </section>
      )}

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="mt-16 text-center">
      <p className="text-[17px] font-semibold">{hasAny ? "이 상태의 이슈가 없습니다." : "처리할 이슈가 없습니다."}</p>
      {!hasAny && (
        <p className="mt-2 text-[15px] text-fg-weak">
          직원 화면에서 보고를 보내면 여기에 나타납니다.{" "}
          <Link href="/staff" className="font-semibold text-fg underline underline-offset-4">
            직원 화면 열기
          </Link>
        </p>
      )}
    </div>
  );
}
