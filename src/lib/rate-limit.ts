import "server-only";
import { AppError } from "./errors";
import { getSupabase } from "./supabase/server";

export const REPORT_LIMIT_PER_SESSION = 100;
export const AI_LIMIT_PER_SESSION = 20;
// 세션 쿠키는 지우면 초기화되므로 실제 비용을 막는 건 이 전체 한도다
export const AI_LIMIT_GLOBAL = 500;

export const rateLimitKey = {
  reportSession: (sessionId: string) => `report:session:${sessionId}`,
  aiSession: (sessionId: string) => `ai:session:${sessionId}`,
  aiGlobal: () => "ai:global",
};

const DEFAULT_MESSAGE = "오늘 요청 한도를 초과했습니다. 내일 다시 시도해 주세요.";

// 서버(Vercel)는 UTC로 돌아가므로 한국 자정에 한도가 초기화되도록 KST 날짜를 쓴다
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 카운트를 올리고 한도를 넘었으면 429를 던진다. 한도를 넘긴 시도도 카운트된다.
export async function checkRateLimit(key: string, limit: number, message: string = DEFAULT_MESSAGE): Promise<void> {
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
    throw new AppError("RATE_LIMITED", message, 429);
  }
}

// 세션 한도를 먼저 본다. 순서가 반대면 이미 막힌 세션이 반복 요청할 때마다
// 전체 카운트가 올라가 한 방문자가 모든 방문자의 한도를 소진할 수 있다.
// 대신 전체 한도에서 막히면 세션 카운트가 1 낭비되지만, 그날은 누구도 호출할 수 없어 영향이 없다.
export async function checkAiRateLimit(sessionId: string): Promise<void> {
  await checkRateLimit(
    rateLimitKey.aiSession(sessionId),
    AI_LIMIT_PER_SESSION,
    `오늘 AI 기능은 ${AI_LIMIT_PER_SESSION}회까지 쓸 수 있습니다. 내일 다시 시도해 주세요.`,
  );
  await checkRateLimit(
    rateLimitKey.aiGlobal(),
    AI_LIMIT_GLOBAL,
    "오늘 전체 AI 사용량이 한도에 도달했습니다. 내일 다시 시도해 주세요.",
  );
}
