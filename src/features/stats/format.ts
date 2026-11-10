import type { AggregateResult, GroupBy, Metric, SupportedSpecView } from "./schemas";

const GROUP_LABEL: Record<GroupBy, string> = { item: "품목별", category: "분류별", weekday: "요일별", date: "날짜별" };
export const METRIC_LABEL: Record<Metric, string> = {
  report_count: "보고 수",
  out_count: "품절 수",
  avg_resolve_hours: "평균 처리 시간",
};

const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const DAY = 24 * 60 * 60 * 1000;

// 해석 결과 문구는 AI가 아니라 코드가 조건으로 만든다. 예: "11/1~11/10 (10일) · 품목별 · 보고 수 · 상위 5개"
export function describeSpec(spec: SupportedSpecView, data: AggregateResult): string {
  const days = Math.round((Date.parse(data.range.to) - Date.parse(data.range.from)) / DAY) + 1;
  const parts = [
    `${shortDate(data.range.from)}~${shortDate(data.range.to)} (${days}일)`,
    GROUP_LABEL[spec.groupBy],
    METRIC_LABEL[spec.metric],
  ];
  if (spec.itemIds?.length) parts.push(`품목 ${spec.itemIds.length}개 지정`);
  if (spec.topN) parts.push(`상위 ${spec.topN}개`);
  return parts.join(" · ");
}

export function formatValue(value: number | null, unit: AggregateResult["unit"]): string {
  return value === null ? "기록 없음" : `${value}${unit}`;
}
