import "server-only";
import { LevelSchema } from "@/features/report/schemas";
import { getSupabase } from "@/lib/supabase/server";
import { aggregate, normalizeRange, type AggregateData } from "./aggregate";
import type { AggregateResult, AggregateSpec } from "./schemas";

// PostgREST는 한 번에 최대 1000행만 돌려줘서, 90일치를 한 번에 읽으면 조용히 잘린다
const PAGE_SIZE = 1000;

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await page(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// DB 값은 check 제약으로만 보장된다. ZodError는 400으로 바뀌므로 데이터 문제는 일반 Error로 던진다(500)
function toLevel(value: string) {
  const parsed = LevelSchema.safeParse(value);
  if (!parsed.success) throw new Error(`unexpected report level: ${value}`);
  return parsed.data;
}

// 통계는 공용 시드와 현재 세션 데이터를 합쳐 본다. 기간은 한국 날짜 기준이다
export async function runAggregate(sessionId: string, spec: AggregateSpec): Promise<AggregateResult> {
  const range = normalizeRange(spec.dateRange);
  const start = `${range.from}T00:00:00+09:00`;
  const endExclusive = new Date(Date.parse(`${range.to}T00:00:00+09:00`) + 24 * 60 * 60 * 1000).toISOString();
  // sessionId는 getSessionId()가 UUID로 검증한 값이라 필터 문자열에 넣어도 안전하다
  const ownData = `session_id.is.null,session_id.eq.${sessionId}`;
  const supabase = getSupabase();
  const isAverage = spec.metric === "avg_resolve_hours";

  const [itemsRes, reports, resolvedIssues] = await Promise.all([
    supabase.from("items").select("id, name, category"),
    isAverage
      ? Promise.resolve([])
      : fetchAll((from, to) =>
          supabase
            .from("stock_reports")
            .select("item_id, level, created_at")
            .or(ownData)
            .gte("created_at", start)
            .lt("created_at", endExclusive)
            .order("id")
            .range(from, to),
        ),
    isAverage
      ? fetchAll((from, to) =>
          supabase
            .from("stock_issues")
            .select("item_id, opened_at, resolved_at")
            .or(ownData)
            .eq("status", "resolved")
            .gte("resolved_at", start)
            .lt("resolved_at", endExclusive)
            .order("id")
            .range(from, to),
        )
      : Promise.resolve([]),
  ]);
  if (itemsRes.error) throw itemsRes.error;

  const data: AggregateData = {
    items: itemsRes.data,
    reports: reports.map((row) => ({ itemId: row.item_id, level: toLevel(row.level), createdAt: row.created_at })),
    resolvedIssues: resolvedIssues.flatMap((row) =>
      row.resolved_at ? [{ itemId: row.item_id, openedAt: row.opened_at, resolvedAt: row.resolved_at }] : [],
    ),
  };
  return aggregate(spec, data);
}
