import "server-only";
import { AppError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/server";
import { IssueSchema, type Issue, type IssueAction, type IssueFilter, type IssueStatus } from "./schemas";

const ISSUE_SELECT =
  "id, item_id, level, status, opened_at, acknowledged_at, resolved_at, items(name, category), stock_reports(id, level, reporter_name, memo, created_at)";

const STATUSES_BY_FILTER: Record<IssueFilter, IssueStatus[]> = {
  open: ["open"],
  acknowledged: ["acknowledged"],
  all: ["open", "acknowledged"],
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "미확인",
  acknowledged: "확인됨",
  resolved: "처리완료",
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

async function getIssue(sessionId: string, issueId: string): Promise<Issue | null> {
  const { data, error } = await getSupabase()
    .from("stock_issues")
    .select(ISSUE_SELECT)
    .eq("id", issueId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data && toIssue(data);
}

// "현재 상태가 from일 때만 바꾼다"를 한 쿼리로 실행해, 읽고 쓰는 사이에 다른 요청이 끼어들 틈을 없앤다
async function updateIfStatus(
  sessionId: string,
  issueId: string,
  from: IssueStatus,
  patch: { status: IssueStatus; acknowledged_at?: string; resolved_at?: string },
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("stock_issues")
    .update(patch)
    .eq("id", issueId)
    .eq("session_id", sessionId)
    .eq("status", from)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

export async function transitionIssue(sessionId: string, issueId: string, action: IssueAction): Promise<Issue> {
  const now = new Date().toISOString();
  const updated =
    action === "acknowledge"
      ? await updateIfStatus(sessionId, issueId, "open", { status: "acknowledged", acknowledged_at: now })
      : (await updateIfStatus(sessionId, issueId, "acknowledged", { status: "resolved", resolved_at: now })) ||
        // 확인을 건너뛰고 바로 처리한 경우에도 확인 시각이 비지 않게 같은 시각으로 채운다
        (await updateIfStatus(sessionId, issueId, "open", { status: "resolved", acknowledged_at: now, resolved_at: now }));

  const issue = await getIssue(sessionId, issueId);
  // 다른 세션의 이슈와 시드 이슈도 존재를 드러내지 않도록 똑같이 404로 응답한다
  if (!issue) throw new AppError("NOT_FOUND", "이슈를 찾을 수 없습니다.", 404);
  if (!updated) {
    const verb = action === "acknowledge" ? "확인" : "처리완료";
    throw new AppError("INVALID_TRANSITION", `이미 ${STATUS_LABEL[issue.status]} 상태라 ${verb}할 수 없습니다.`, 409);
  }
  return issue;
}
