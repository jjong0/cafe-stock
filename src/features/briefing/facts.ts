import "server-only";
import { createHash } from "node:crypto";
import { listIssues } from "@/features/issues/server";
import type { Level } from "@/features/report/schemas";
import { todayKst } from "@/lib/rate-limit";
import { stableStringify } from "@/lib/stable-json";
import { getSupabase } from "@/lib/supabase/server";

const HOUR = 60 * 60 * 1000;
const RECURRING_DAYS = 7;
const RECURRING_MIN_REPORTS = 3;

// AI에게 넘기는 사실 묶음. 숫자는 모두 여기서 DB 값으로 계산하고 AI는 문장만 만든다
export type BriefingFacts = {
  date: string;
  openIssues: {
    itemId: string;
    itemName: string;
    level: Level;
    status: "open" | "acknowledged";
    reportCount: number;
    elapsedHours: number;
  }[];
  recurring: { itemId: string; itemName: string; reportCount: number }[];
  resolvedToday: { itemId: string; itemName: string }[];
};

const byItemId = <T extends { itemId: string }>(a: T, b: T) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0);

export async function buildFacts(sessionId: string, now: Date = new Date()): Promise<BriefingFacts> {
  const today = todayKst(now);
  const [issues, recurring, resolvedToday] = await Promise.all([
    listIssues(sessionId, "all"),
    countRecentReports(sessionId, now),
    listResolvedToday(sessionId, today),
  ]);

  return {
    date: today,
    openIssues: issues
      .flatMap((issue) =>
        issue.status === "resolved"
          ? []
          : [
              {
                itemId: issue.itemId,
                itemName: issue.itemName,
                level: issue.level,
                status: issue.status,
                reportCount: issue.reportCount,
                // 시간 단위로 버려서, 데이터가 그대로면 1시간 안에는 같은 해시가 나오게 한다
                elapsedHours: Math.floor((now.getTime() - new Date(issue.openedAt).getTime()) / HOUR),
              },
            ],
      )
      .sort(byItemId),
    recurring,
    resolvedToday,
  };
}

// 반복 품목은 과거 기록이 핵심이라 공용 시드와 현재 세션 보고를 합쳐 센다
async function countRecentReports(sessionId: string, now: Date): Promise<BriefingFacts["recurring"]> {
  const since = new Date(now.getTime() - RECURRING_DAYS * 24 * HOUR).toISOString();
  const { data, error } = await getSupabase()
    .from("stock_reports")
    .select("item_id, items(name)")
    .gte("created_at", since)
    // sessionId는 getSessionId()가 UUID로 검증한 값이라 필터 문자열에 넣어도 안전하다
    .or(`session_id.is.null,session_id.eq.${sessionId}`);
  if (error) throw error;

  const counts = new Map<string, { itemName: string; reportCount: number }>();
  for (const row of data) {
    const entry = counts.get(row.item_id) ?? { itemName: row.items?.name ?? "", reportCount: 0 };
    entry.reportCount += 1;
    counts.set(row.item_id, entry);
  }
  return [...counts.entries()]
    .filter(([, entry]) => entry.reportCount >= RECURRING_MIN_REPORTS)
    .map(([itemId, entry]) => ({ itemId, ...entry }))
    .sort(byItemId);
}

// 오늘 처리완료는 방문자가 직접 한 일만 보여야 하므로 현재 세션만 본다
async function listResolvedToday(sessionId: string, today: string): Promise<BriefingFacts["resolvedToday"]> {
  const { data, error } = await getSupabase()
    .from("stock_issues")
    .select("item_id, items(name)")
    .eq("session_id", sessionId)
    .eq("status", "resolved")
    .gte("resolved_at", `${today}T00:00:00+09:00`);
  if (error) throw error;

  // 같은 품목이 오늘 두 번 처리됐어도 한 번만 넣는다
  const names = new Map(data.map((row) => [row.item_id, row.items?.name ?? ""]));
  return [...names.entries()].map(([itemId, itemName]) => ({ itemId, itemName })).sort(byItemId);
}

export function hashFacts(facts: BriefingFacts): string {
  return createHash("sha256").update(stableStringify(facts)).digest("hex");
}
