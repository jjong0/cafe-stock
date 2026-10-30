"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/lib/api-client";
import { IssueResponseSchema, IssuesResponseSchema, type Issue, type IssueAction } from "../schemas";

export function useIssues(initialIssues: Issue[]) {
  const [issues, setIssues] = useState(initialIssues);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchJson("/api/issues?status=all", IssuesResponseSchema);
      setIssues(data.issues);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 응답으로 그 행만 바꾼다. 처리완료된 이슈는 미처리 목록에서 뺀다
  const transition = useCallback(async (issueId: string, action: IssueAction): Promise<Issue> => {
    setPendingId(issueId);
    try {
      const { issue } = await fetchJson(`/api/issues/${issueId}`, IssueResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setIssues((prev) =>
        issue.status === "resolved"
          ? prev.filter((item) => item.id !== issue.id)
          : prev.map((item) => (item.id === issue.id ? issue : item)),
      );
      return issue;
    } finally {
      setPendingId(null);
    }
  }, []);

  return { issues, pendingId, refreshing, refresh, transition };
}
