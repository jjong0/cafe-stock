import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { IssueSchema, type Issue, type IssueFilter, type IssueStatus } from "./schemas";

const ISSUE_SELECT =
  "id, item_id, level, status, opened_at, acknowledged_at, resolved_at, items(name, category), stock_reports(id, level, reporter_name, memo, created_at)";

const STATUSES_BY_FILTER: Record<IssueFilter, IssueStatus[]> = {
  open: ["open"],
  acknowledged: ["acknowledged"],
  all: ["open", "acknowledged"],
};

type IssueRow = {
  id: string;
  item_id: string;
  level: string;
  status: string;
  opened_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  items: { name: string; category: string } | null;
  stock_reports: { id: string; level: string; reporter_name: string; memo: string | null; created_at: string }[];
};

// DB 값은 check 제약으로만 보장되고 타입은 string이라 응답 스키마로 좁힌다.
// 실패는 요청 오류가 아니라 서버 데이터 문제이므로 ZodError 대신 일반 Error로 던진다(500)
function toIssue(row: IssueRow): Issue {
  const reports = [...row.stock_reports].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const parsed = IssueSchema.safeParse({
    id: row.id,
    itemId: row.item_id,
    itemName: row.items?.name,
    category: row.items?.category,
    level: row.level,
    status: row.status,
    openedAt: row.opened_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    reportCount: reports.length,
    reports: reports.map((report) => ({
      id: report.id,
      level: report.level,
      reporterName: report.reporter_name,
      memo: report.memo,
      createdAt: report.created_at,
    })),
  });
  if (!parsed.success) throw new Error(`issue ${row.id} has unexpected shape: ${parsed.error.message}`);
  return parsed.data;
}

// 미처리 이슈는 현재 세션 것만 본다(시드 이슈는 모두 resolved). 오래 기다린 이슈가 먼저 온다
export async function listIssues(sessionId: string, filter: IssueFilter): Promise<Issue[]> {
  const { data, error } = await getSupabase()
    .from("stock_issues")
    .select(ISSUE_SELECT)
    .eq("session_id", sessionId)
    .in("status", STATUSES_BY_FILTER[filter])
    .order("opened_at", { ascending: true });
  if (error) throw error;
  return data.map(toIssue);
}
