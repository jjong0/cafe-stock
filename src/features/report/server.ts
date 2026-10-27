import "server-only";
import { getSupabase } from "@/lib/supabase/server";

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
