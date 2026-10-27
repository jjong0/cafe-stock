import "server-only";
import { AppError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/server";
import type { SubmitReportsInput } from "./schemas";

export type ItemWithOpenIssue = {
  id: string;
  name: string;
  category: string;
  openIssue: { id: string; level: string; status: string } | null;
};

// 미처리 이슈는 현재 세션 것만 본다(시드 이슈는 모두 resolved)
export async function getItemsWithOpenIssues(sessionId: string): Promise<ItemWithOpenIssue[]> {
  const supabase = getSupabase();
  const [itemsRes, issuesRes] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, category")
      .eq("active", true)
      .order("category")
      .order("sort_order"),
    supabase
      .from("stock_issues")
      .select("id, item_id, level, status")
      .eq("session_id", sessionId)
      .neq("status", "resolved"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (issuesRes.error) throw issuesRes.error;

  const issueByItem = new Map(issuesRes.data.map((issue) => [issue.item_id, issue]));
  return itemsRes.data.map((item) => {
    const issue = issueByItem.get(item.id);
    return {
      ...item,
      openIssue: issue ? { id: issue.id, level: issue.level, status: issue.status } : null,
    };
  });
}

// 없는 품목이면 RPC에서 외래 키 오류(500)가 나므로 요청 검증 단계에서 400으로 거른다
export async function assertActiveItems(itemIds: string[]): Promise<void> {
  const { data, error } = await getSupabase()
    .from("items")
    .select("id")
    .in("id", itemIds)
    .eq("active", true);
  if (error) throw error;
  if (data.length !== itemIds.length) {
    throw new AppError("VALIDATION_ERROR", "존재하지 않거나 사용하지 않는 품목이 포함되어 있습니다.", 400);
  }
}

export type SubmittedIssue = {
  id: string;
  itemId: string;
  level: string;
  status: string;
  openedAt: string;
};

export async function submitReports(
  sessionId: string,
  input: SubmitReportsInput,
): Promise<SubmittedIssue[]> {
  const { data, error } = await getSupabase().rpc("submit_reports", {
    p_session_id: sessionId,
    p_reporter_name: input.reporterName,
    p_entries: input.entries,
    p_memo: input.memo,
  });
  if (error) throw error;
  return data.map((issue) => ({
    id: issue.id,
    itemId: issue.item_id,
    level: issue.level,
    status: issue.status,
    openedAt: issue.opened_at,
  }));
}
