import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { AppError } from "./errors";
import { getSupabase } from "./supabase/server";

export const REPORT_LIMIT_PER_SESSION = 100;
export const AI_LIMIT_PER_SESSION = 20;
// 쿠키를 지워 세션을 바꿔도 같은 IP면 막는다. 같은 와이파이를 쓰는 여러 사람을 고려해 세션 한도의 2~3배로 둔다
export const REPORT_LIMIT_PER_IP = 300;
export const AI_LIMIT_PER_IP = 40;
// Gemini 무료 플랜 하루 500회(RPD)보다 낮게 둬서, 제공자 한도보다 우리 한도에서 먼저 막고 안내한다.
// 세션 쿠키는 지우면 초기화되므로 실제 한도를 지키는 건 이 전체 한도다
export const AI_LIMIT_GLOBAL = 450;

export const rateLimitKey = {
  reportSession: (sessionId: string) => `report:session:${sessionId}`,
  reportIp: (ipHash: string) => `report:ip:${ipHash}`,
  aiSession: (sessionId: string) => `ai:session:${sessionId}`,
  aiIp: (ipHash: string) => `ai:ip:${ipHash}`,
  aiGlobal: () => "ai:global",
};

const DEFAULT_MESSAGE = "오늘 요청 한도를 초과했습니다. 내일 다시 시도해 주세요.";

// 서버(Vercel)는 UTC로 돌아가므로 한국 자정에 한도가 초기화되도록 KST 날짜를 쓴다
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Gemini의 하루 한도는 미국 태평양 시간 자정에 초기화되므로 전체 한도는 그 날짜로 센다
const pacificDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });
export function todayPacific(now: Date = new Date()): string {
  return pacificDate.format(now);
}

// 카운트를 올리고 한도를 넘었으면 429를 던진다. 한도를 넘긴 시도도 카운트된다.
export async function checkRateLimit(
  key: string,
  limit: number,
  message: string = DEFAULT_MESSAGE,
  day: string = todayKst(),
): Promise<void> {
  const { data, error } = await getSupabase().rpc("increment_usage", {
    p_key: key,
    p_day: day,
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

// IP 원문은 저장하지 않는다. 서버 비밀키로 HMAC을 만들고 날짜를 섞어, 키만 보고는 IP를 되돌리거나 날짜를 넘어 추적할 수 없게 한다.
// Vercel이 x-real-ip를 실제 접속 IP로 덮어써 클라이언트가 위조할 수 없다. IP를 알 수 없으면(로컬 등) IP 단계는 건너뛴다
async function clientIpHash(): Promise<string | null> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-real-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ip || !secret) return null;
  return createHmac("sha256", secret).update(`${todayKst()}:${ip}`).digest("hex").slice(0, 32);
}

// 보고 제출: 세션 → IP 순서. 막힌 세션이 IP 카운트를 소진하지 않도록 세션을 먼저 본다
export async function checkReportRateLimit(sessionId: string): Promise<void> {
  await checkRateLimit(rateLimitKey.reportSession(sessionId), REPORT_LIMIT_PER_SESSION);
  const ipHash = await clientIpHash();
  if (ipHash) await checkRateLimit(rateLimitKey.reportIp(ipHash), REPORT_LIMIT_PER_IP);
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
  const ipHash = await clientIpHash();
  if (ipHash) {
    await checkRateLimit(
      rateLimitKey.aiIp(ipHash),
      AI_LIMIT_PER_IP,
      "이 네트워크에서 오늘 쓸 수 있는 AI 횟수를 모두 썼습니다. 내일 다시 시도해 주세요.",
    );
  }
  await checkRateLimit(
    rateLimitKey.aiGlobal(),
    AI_LIMIT_GLOBAL,
    "오늘 전체 AI 사용량이 한도에 도달했습니다. 내일 다시 시도해 주세요.",
    todayPacific(),
  );
}
