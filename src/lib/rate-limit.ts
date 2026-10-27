import "server-only";
import { AppError } from "./errors";
import { getSupabase } from "./supabase/server";

export const REPORT_LIMIT_PER_SESSION = 100;

export const rateLimitKey = {
  reportSession: (sessionId: string) => `report:session:${sessionId}`,
};

// 서버(Vercel)는 UTC로 돌아가므로 한국 자정에 한도가 초기화되도록 KST 날짜를 쓴다
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 카운트를 올리고 한도를 넘었으면 429를 던진다. 한도를 넘긴 시도도 카운트된다.
export async function checkRateLimit(key: string, limit: number): Promise<void> {
  const { data, error } = await getSupabase().rpc("increment_usage", {
    p_key: key,
    p_day: todayKst(),
    p_limit: limit,
  });
  if (error) throw error;
  if (typeof data !== "boolean") {
    throw new Error(`increment_usage returned ${String(data)}`);
  }
  if (!data) {
    throw new AppError("RATE_LIMITED", "오늘 요청 한도를 초과했습니다. 내일 다시 시도해 주세요.", 429);
  }
}
