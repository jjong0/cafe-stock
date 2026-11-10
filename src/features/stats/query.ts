import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { getModel } from "@/lib/ai/client";
import { withAiRetry } from "@/lib/ai/retry";
import { buildStatsPrompt, STATS_SYSTEM } from "@/lib/ai/prompts";
import { ChartSpecSchema, type ChartSpec } from "@/lib/ai/schemas";
import { AppError } from "@/lib/errors";
import { checkAiRateLimit, todayKst } from "@/lib/rate-limit";
import { getSupabase } from "@/lib/supabase/server";
import type { AggregateResult, AggregateSpec } from "./schemas";
import { runAggregate } from "./server";
import { presetSpec, SUGGESTED_QUESTIONS } from "./suggestions";

export type SupportedSpec = AggregateSpec & { chartType: "bar" | "line"; title: string };

export type StatsQueryResult =
  | { spec: SupportedSpec & { supported: true }; data: AggregateResult; source: "preset" | "ai" }
  | { spec: { supported: false; reason: string }; suggestions: readonly string[] };

const AI_TIMEOUT_MS = 15_000;

// 날짜별은 추세라 꺾은선, 나머지는 비교라 막대로 고정한다(AI가 고른 값은 쓰지 않는다)
const chartTypeOf = (groupBy: AggregateSpec["groupBy"]): SupportedSpec["chartType"] => (groupBy === "date" ? "line" : "bar");

export async function runStatsQuery(sessionId: string, question: string): Promise<StatsQueryResult> {
  const today = todayKst();

  // 추천 질문은 고정된 조건으로 바로 집계한다. AI를 부르지 않으므로 호출 횟수도 차감하지 않는다
  const preset = presetSpec(question, today);
  if (preset) {
    const spec = { ...preset, chartType: chartTypeOf(preset.groupBy), supported: true as const };
    return { spec, data: await runAggregate(sessionId, spec), source: "preset" };
  }

  const items = await listItems();
  const parsed = await interpret(sessionId, question, today, items);
  if (!parsed.supported) {
    return { spec: { supported: false, reason: parsed.reason }, suggestions: SUGGESTED_QUESTIONS };
  }

  // AI가 실제로 없는 품목 id를 만들었으면 버린다. 질문한 품목이 하나도 남지 않으면 엉뚱한 전체 집계 대신 안내한다
  const knownIds = new Set(items.map((item) => item.id));
  const itemIds = parsed.itemIds?.filter((id) => knownIds.has(id));
  if (parsed.itemIds?.length && !itemIds?.length) {
    return {
      spec: { supported: false, reason: "질문한 품목을 찾지 못했습니다. 품목 이름을 확인해 주세요." },
      suggestions: SUGGESTED_QUESTIONS,
    };
  }

  const spec: SupportedSpec & { supported: true } = {
    supported: true,
    metric: parsed.metric,
    groupBy: parsed.groupBy,
    // 종료일이 미래면 오늘까지로 줄인다(아직 없는 날짜를 0으로 채우지 않게)
    dateRange: {
      from: parsed.dateRange.from > today ? today : parsed.dateRange.from,
      to: parsed.dateRange.to > today ? today : parsed.dateRange.to,
    },
    itemIds: itemIds?.length ? itemIds : undefined,
    topN: parsed.groupBy === "item" || parsed.groupBy === "category" ? parsed.topN : undefined,
    chartType: chartTypeOf(parsed.groupBy),
    title: parsed.title,
  };
  return { spec, data: await runAggregate(sessionId, spec), source: "ai" };
}

async function listItems() {
  const { data, error } = await getSupabase().from("items").select("id, name, category").eq("active", true);
  if (error) throw error;
  return data;
}

async function interpret(
  sessionId: string,
  question: string,
  today: string,
  items: { id: string; name: string; category: string }[],
): Promise<ChartSpec> {
  // 설정 오류(키 없음)는 호출 횟수를 차감하기 전에 드러나게 모델을 먼저 만든다
  const model = getModel();
  try {
    // 매 시도 직전에 호출 제한을 센다. 재시도 규칙은 withAiRetry에 모아 두었다
    return await withAiRetry(
      async () => {
        const { output } = await generateText({
          model,
          system: STATS_SYSTEM,
          prompt: buildStatsPrompt({ question, today, items }),
          output: Output.object({ schema: ChartSpecSchema }),
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });
        return output;
      },
      { beforeAttempt: () => checkAiRateLimit(sessionId) },
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error("stats spec validation failed twice", err.text);
      throw new AppError("AI_ERROR", "질문을 해석하지 못했습니다. 다르게 물어보거나 추천 질문을 눌러 주세요.", 502);
    }
    // 제공자 429는 대개 분당 한도(15회)라 '오늘 한도'가 아니라 잠시 후 재시도로 안내한다
    if (APICallError.isInstance(err) && err.statusCode === 429) {
      throw new AppError("RATE_LIMITED", "요청이 많아 잠시 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.", 429);
    }
    console.error("stats interpretation failed", err);
    throw new AppError("AI_ERROR", "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }
}
