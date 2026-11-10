import { CATEGORY_OPTIONS } from "@/features/report/constants";
import type { Level } from "@/features/report/schemas";
import type { AggregateResult, AggregateSpec, DateRange } from "./schemas";

// DB를 읽지 않는 순수 계산이다. 숫자는 모두 여기서 계산하고 AI는 관여하지 않는다
export type AggregateData = {
  items: { id: string; name: string; category: string }[];
  reports: { itemId: string; level: Level; createdAt: string }[];
  resolvedIssues: { itemId: string; openedAt: string; resolvedAt: string }[];
};

export const MAX_RANGE_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const KST_OFFSET = 9 * HOUR;
// 화면에 월요일부터 보여주려고 getUTCDay()(일=0)를 이 순서로 바꾼다
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

const kstDate = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET).toISOString().slice(0, 10);
const kstWeekdayIndex = (iso: string) => (new Date(new Date(iso).getTime() + KST_OFFSET).getUTCDay() + 6) % 7;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

// 시작일이 늦으면 맞바꾸고, 90일을 넘으면 종료일 기준으로 잘라 clamped로 알린다
export function normalizeRange(range: DateRange): DateRange & { clamped: boolean } {
  const [from, to] = range.from <= range.to ? [range.from, range.to] : [range.to, range.from];
  if (daysBetween(from, to) + 1 <= MAX_RANGE_DAYS) return { from, to, clamped: false };
  return { from: addDays(to, -(MAX_RANGE_DAYS - 1)), to, clamped: true };
}

type Bucket = { sum: number; count: number };

export function aggregate(spec: AggregateSpec, data: AggregateData): AggregateResult {
  const { from, to, clamped } = normalizeRange(spec.dateRange);
  const inRange = (iso: string) => {
    const date = kstDate(iso);
    return date >= from && date <= to;
  };
  const itemFilter = spec.itemIds?.length ? new Set(spec.itemIds) : null;
  const itemById = new Map(data.items.map((item) => [item.id, item]));
  const isAverage = spec.metric === "avg_resolve_hours";

  // 지표별로 (품목, 발생 시각, 값) 목록을 만든다. 보고 수는 1, 평균 처리 시간은 처리에 걸린 시간
  const events = isAverage
    ? data.resolvedIssues
        .filter((issue) => inRange(issue.resolvedAt))
        .map((issue) => ({
          itemId: issue.itemId,
          at: issue.resolvedAt,
          value: (Date.parse(issue.resolvedAt) - Date.parse(issue.openedAt)) / HOUR,
        }))
    : data.reports
        .filter((report) => inRange(report.createdAt) && (spec.metric === "report_count" || report.level === "out"))
        .map((report) => ({ itemId: report.itemId, at: report.createdAt, value: 1 }));

  const keyOf = (event: { itemId: string; at: string }): string | null => {
    switch (spec.groupBy) {
      case "item":
        return event.itemId;
      case "category":
        return itemById.get(event.itemId)?.category ?? null;
      case "weekday":
        return String(kstWeekdayIndex(event.at));
      case "date":
        return kstDate(event.at);
    }
  };

  const buckets = new Map<string, Bucket>();
  for (const event of events) {
    if (itemFilter && !itemFilter.has(event.itemId)) continue;
    const key = keyOf(event);
    if (key === null) continue;
    const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += event.value;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  // 데이터가 없는 칸: 횟수는 0, 평균은 0시간으로 오해되지 않도록 null
  const valueOf = (key: string): number | null => {
    const bucket = buckets.get(key);
    if (!bucket) return isAverage ? null : 0;
    return isAverage ? Math.round((bucket.sum / bucket.count) * 10) / 10 : bucket.sum;
  };

  let rows: AggregateResult["rows"];
  switch (spec.groupBy) {
    case "item": {
      // 25개 품목을 0으로 다 늘어놓지 않도록 데이터가 있는 품목만 보여준다.
      // 단, 특정 품목을 물었으면("우유 품절 몇 번?") 기록이 없어도 0으로 답해야 해서 그 품목은 넣는다
      const keys = new Set([...buckets.keys(), ...(spec.itemIds ?? []).filter((id) => itemById.has(id))]);
      rows = [...keys].map((key) => ({ key, label: itemById.get(key)?.name ?? key, value: valueOf(key) }));
      break;
    }
    case "category":
      rows = CATEGORY_OPTIONS.map((option) => ({ key: option.value, label: option.label, value: valueOf(option.value) }));
      break;
    case "weekday":
      rows = WEEKDAYS.map((label, index) => ({ key: String(index), label, value: valueOf(String(index)) }));
      break;
    case "date":
      rows = Array.from({ length: daysBetween(from, to) + 1 }, (_, index) => {
        const date = addDays(from, index);
        return { key: date, label: date.slice(5).replace("-", "/"), value: valueOf(date) };
      });
      break;
  }

  // 순서 자체가 의미인 요일·날짜는 그대로 두고, 품목·분류만 큰 값부터 정렬해 상위 N개를 남긴다
  if (spec.groupBy === "item" || spec.groupBy === "category") {
    rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.label.localeCompare(b.label, "ko"));
    if (spec.topN) rows = rows.slice(0, spec.topN);
  }

  return { rows, unit: isAverage ? "시간" : "회", range: { from, to }, clamped };
}

