import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { getModel } from "@/lib/ai/client";
import { buildBriefingPrompt, BRIEFING_SYSTEM } from "@/lib/ai/prompts";
import { BriefingSchema, type Briefing } from "@/lib/ai/schemas";
import { AppError } from "@/lib/errors";
import { checkAiRateLimit } from "@/lib/rate-limit";
import { getSupabase } from "@/lib/supabase/server";
import { buildFacts, hashFacts, type BriefingFacts } from "./facts";

export type BriefingView = {
  summary: string;
  priorities: { itemId: string; itemName: string; reason: string }[];
  recurring: { itemId: string; itemName: string; note: string }[];
};

export type BriefingResult = { briefing: BriefingView; cached: boolean; generatedAt: string };

const MAX_ATTEMPTS = 2; // 설계: Zod 검증 실패 시 1회 재시도
// 실제 응답은 2초 안팎이라 넉넉히 두되, 제공자가 멈춰도 요청이 서버 실행 시간 끝까지 붙잡히지 않게 한다
const AI_TIMEOUT_MS = 15_000;

export async function getBriefing(sessionId: string): Promise<BriefingResult> {
  const facts = await buildFacts(sessionId);
  const factsHash = hashFacts(facts);

  // 캐시 적중이면 AI를 부르지 않고 호출 횟수도 차감하지 않는다
  const cached = await readCache(factsHash);
  if (cached) return { briefing: toView(cached.content, facts), cached: true, generatedAt: cached.generatedAt };

  const content = keepKnownItems(await generateBriefing(sessionId, facts), facts);
  const generatedAt = await writeCache(sessionId, factsHash, content);
  return { briefing: toView(content, facts), cached: false, generatedAt };
}

async function generateBriefing(sessionId: string, facts: BriefingFacts): Promise<Briefing> {
  // 설정 오류(키 없음)는 호출 횟수를 차감하기 전에 드러나게 모델을 먼저 만든다
  const model = getModel();
  for (let attempt = 1; ; attempt++) {
    // 재시도도 실제 API 호출이라 매번 호출 제한을 센다
    await checkAiRateLimit(sessionId);
    try {
      const { output } = await generateText({
        model,
        system: BRIEFING_SYSTEM,
        prompt: buildBriefingPrompt(facts),
        output: Output.object({ schema: BriefingSchema }),
        // SDK 자동 재시도를 끄고 위의 1회 재시도만 둬서, 실제 호출 수와 카운트가 같게 한다
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        if (attempt < MAX_ATTEMPTS) continue;
        console.error("briefing schema validation failed twice", err.text);
        throw new AppError("AI_ERROR", "브리핑을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
      }
      // 제공자 429는 대개 분당 한도(15회)라 '오늘 한도'가 아니라 잠시 후 재시도로 안내한다
      if (APICallError.isInstance(err) && err.statusCode === 429) {
        throw new AppError("RATE_LIMITED", "요청이 많아 잠시 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.", 429);
      }
      console.error("briefing generation failed", err);
      throw new AppError("AI_ERROR", "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
    }
  }
}

// AI가 facts에 없는 itemId를 만들면 화면에 쓸 수 없으므로 버린다
function keepKnownItems(briefing: Briefing, facts: BriefingFacts): Briefing {
  const openIds = new Set(facts.openIssues.map((issue) => issue.itemId));
  const recurringIds = new Set(facts.recurring.map((item) => item.itemId));
  return {
    summary: briefing.summary,
    priorities: briefing.priorities.filter((p) => openIds.has(p.itemId)),
    recurring: briefing.recurring.filter((r) => recurringIds.has(r.itemId)),
  };
}

// 품목명은 AI 응답이 아니라 facts(DB 값)에서 붙인다
function toView(briefing: Briefing, facts: BriefingFacts): BriefingView {
  const names = new Map(
    [...facts.openIssues, ...facts.recurring].map((item) => [item.itemId, item.itemName] as const),
  );
  return {
    summary: briefing.summary,
    priorities: briefing.priorities.map((p) => ({ ...p, itemName: names.get(p.itemId) ?? "" })),
    recurring: briefing.recurring.map((r) => ({ ...r, itemName: names.get(r.itemId) ?? "" })),
  };
}

// 브리핑은 facts만으로 정해지고 facts에는 세션 정보가 없어, 해시가 같으면 다른 세션의 브리핑을 써도 된다.
// 새 방문자들은 facts가 같아(시드 반복 품목뿐) 세션을 바꿔가며 AI 한도를 소진하는 요청도 캐시에 걸린다
async function readCache(factsHash: string) {
  const { data, error } = await getSupabase()
    .from("briefings")
    .select("content, generated_at")
    .eq("facts_hash", factsHash)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // 저장된 JSON도 형식이 바뀌었을 수 있어 검증하고, 맞지 않으면 캐시가 없는 것으로 본다
  const parsed = BriefingSchema.safeParse(data.content);
  return parsed.success ? { content: parsed.data, generatedAt: data.generated_at } : null;
}

async function writeCache(sessionId: string, factsHash: string, content: Briefing): Promise<string> {
  const generatedAt = new Date().toISOString();
  // 같은 facts로 동시에 두 번 생성된 경우 먼저 저장된 것을 남긴다
  const { error } = await getSupabase()
    .from("briefings")
    .upsert({ session_id: sessionId, facts_hash: factsHash, content, generated_at: generatedAt }, { ignoreDuplicates: true });
  if (error) throw error;
  return generatedAt;
}
