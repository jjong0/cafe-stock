import type { AggregateSpec } from "./schemas";

// 화면의 추천 질문 칩과 서버가 같은 목록을 쓴다. 추천 질문은 AI 없이 고정된 조건으로 바로 집계해
// 방문자마다 같은 질문으로 AI 호출 한도를 쓰지 않게 한다
export const SUGGESTED_QUESTIONS = [
  "이번 달 가장 자주 떨어진 품목은?",
  "요일별 품절 횟수 보여줘",
  "카테고리별 평균 처리 시간은?",
] as const;

const DAY = 24 * 60 * 60 * 1000;
const shiftDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

// today: 한국 날짜(YYYY-MM-DD)
export function presetSpec(question: string, today: string): (AggregateSpec & { title: string }) | null {
  const last30 = { from: shiftDays(today, -29), to: today };
  switch (question) {
    case SUGGESTED_QUESTIONS[0]:
      return {
        metric: "report_count",
        groupBy: "item",
        dateRange: { from: `${today.slice(0, 8)}01`, to: today },
        topN: 5,
        title: "이번 달 자주 떨어진 품목",
      };
    case SUGGESTED_QUESTIONS[1]:
      return { metric: "out_count", groupBy: "weekday", dateRange: last30, title: "요일별 품절 횟수" };
    case SUGGESTED_QUESTIONS[2]:
      return { metric: "avg_resolve_hours", groupBy: "category", dateRange: last30, title: "카테고리별 평균 처리 시간" };
    default:
      return null;
  }
}
