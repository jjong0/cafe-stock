import { describe, expect, it } from "vitest";
import { aggregate, normalizeRange, type AggregateData } from "./aggregate";
import type { AggregateSpec } from "./schemas";

const MILK = "00000000-0000-4000-8000-000000000001";
const OAT = "00000000-0000-4000-8000-000000000002";
const VANILLA = "00000000-0000-4000-8000-000000000003";
const HOLDER = "00000000-0000-4000-8000-000000000004";

// 2026-10-05(월)~10-11(일) 한 주. 시각은 UTC로 적고, 주석에 한국 시간을 단다
const data: AggregateData = {
  items: [
    { id: MILK, name: "우유", category: "bean_milk" },
    { id: OAT, name: "오트우유", category: "bean_milk" },
    { id: VANILLA, name: "바닐라시럽", category: "syrup_sauce" },
    { id: HOLDER, name: "컵홀더", category: "supplies" },
  ],
  reports: [
    { itemId: MILK, level: "out", createdAt: "2026-10-10T02:00:00Z" }, // 10/10(토) 11시
    { itemId: MILK, level: "out", createdAt: "2026-10-11T03:00:00Z" }, // 10/11(일) 12시
    { itemId: MILK, level: "low", createdAt: "2026-10-06T01:00:00Z" }, // 10/6(화) 10시
    { itemId: VANILLA, level: "low", createdAt: "2026-10-05T15:30:00Z" }, // 10/6(화) 00:30 — UTC로는 월요일
    { itemId: VANILLA, level: "low", createdAt: "2026-10-09T05:00:00Z" }, // 10/9(금)
    { itemId: OAT, level: "out", createdAt: "2026-10-07T05:00:00Z" }, // 10/7(수)
    { itemId: HOLDER, level: "low", createdAt: "2026-10-04T14:59:00Z" }, // 10/4(일) 23:59 — 기간 밖
    { itemId: HOLDER, level: "low", createdAt: "2026-10-11T15:00:00Z" }, // 10/12(월) 00:00 — 기간 밖
  ],
  resolvedIssues: [
    { itemId: MILK, openedAt: "2026-10-10T02:00:00Z", resolvedAt: "2026-10-10T04:00:00Z" }, // 2시간
    { itemId: OAT, openedAt: "2026-10-07T05:00:00Z", resolvedAt: "2026-10-07T06:20:00Z" }, // 1시간 20분
    { itemId: HOLDER, openedAt: "2026-10-05T00:00:00Z", resolvedAt: "2026-10-06T12:00:00Z" }, // 36시간
    { itemId: VANILLA, openedAt: "2026-09-20T00:00:00Z", resolvedAt: "2026-09-20T03:00:00Z" }, // 기간 밖
  ],
};

const week = { from: "2026-10-05", to: "2026-10-11" };
const spec = (overrides: Partial<AggregateSpec>): AggregateSpec => ({
  metric: "report_count",
  groupBy: "item",
  dateRange: week,
  ...overrides,
});

describe("normalizeRange", () => {
  it("시작일이 종료일보다 늦으면 맞바꾼다", () => {
    expect(normalizeRange({ from: "2026-10-11", to: "2026-10-05" })).toEqual({ ...week, clamped: false });
  });

  it("정확히 90일은 자르지 않는다", () => {
    expect(normalizeRange({ from: "2026-07-14", to: "2026-10-11" })).toEqual({ from: "2026-07-14", to: "2026-10-11", clamped: false });
  });

  it("90일을 넘으면 종료일 기준 90일로 자르고 clamped를 표시한다", () => {
    expect(normalizeRange({ from: "2026-01-01", to: "2026-10-11" })).toEqual({ from: "2026-07-14", to: "2026-10-11", clamped: true });
  });
});

describe("report_count", () => {
  it("품목별로 세고 큰 값부터 정렬하며, 한국 시간 기준 기간 밖 보고는 뺀다", () => {
    const result = aggregate(spec({ groupBy: "item" }), data);
    expect(result.rows).toEqual([
      { key: MILK, label: "우유", value: 3 },
      { key: VANILLA, label: "바닐라시럽", value: 2 },
      { key: OAT, label: "오트우유", value: 1 },
    ]);
    expect(result.unit).toBe("회");
  });

  it("topN으로 상위 품목만 남긴다", () => {
    expect(aggregate(spec({ groupBy: "item", topN: 2 }), data).rows.map((row) => row.label)).toEqual(["우유", "바닐라시럽"]);
  });

  it("분류별로는 4개 분류를 모두 보여주고 데이터가 없으면 0이다", () => {
    expect(aggregate(spec({ groupBy: "category" }), data).rows).toEqual([
      { key: "bean_milk", label: "원두·우유", value: 4 },
      { key: "syrup_sauce", label: "시럽·소스", value: 2 },
      { key: "dessert", label: "디저트", value: 0 },
      { key: "supplies", label: "컵·부자재", value: 0 },
    ]);
  });

  it("날짜별로 기간의 모든 날을 오름차순으로 채운다", () => {
    const rows = aggregate(spec({ groupBy: "date" }), data).rows;
    expect(rows.map((row) => row.key)).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
    expect(rows.map((row) => row.value)).toEqual([0, 2, 1, 0, 1, 1, 1]);
    expect(rows[0].label).toBe("10/05");
  });

  it("특정 품목을 물으면 기록이 없어도 그 품목을 0으로 보여준다", () => {
    expect(aggregate(spec({ groupBy: "item", itemIds: [MILK, HOLDER] }), data).rows).toEqual([
      { key: MILK, label: "우유", value: 3 },
      { key: HOLDER, label: "컵홀더", value: 0 },
    ]);
  });

  it("itemIds가 있으면 그 품목만 센다", () => {
    expect(aggregate(spec({ groupBy: "date", itemIds: [VANILLA] }), data).rows.map((row) => row.value)).toEqual([0, 1, 0, 0, 1, 0, 0]);
  });
});

describe("out_count", () => {
  it("요일별 품절 보고를 월요일부터 7칸으로 센다", () => {
    const rows = aggregate(spec({ metric: "out_count", groupBy: "weekday" }), data).rows;
    expect(rows.map((row) => row.label)).toEqual(["월", "화", "수", "목", "금", "토", "일"]);
    expect(rows.map((row) => row.value)).toEqual([0, 0, 1, 0, 0, 1, 1]);
  });

  it("요일은 한국 시간으로 판단한다(UTC 월요일 15:30은 한국 화요일)", () => {
    const rows = aggregate(spec({ groupBy: "weekday", itemIds: [VANILLA] }), data).rows;
    expect(rows.find((row) => row.label === "월")?.value).toBe(0);
    expect(rows.find((row) => row.label === "화")?.value).toBe(1);
  });
});

describe("avg_resolve_hours", () => {
  it("처리완료 시각이 기간 안인 이슈만 평균 내고 소수 첫째 자리로 반올림한다", () => {
    const result = aggregate(spec({ metric: "avg_resolve_hours", groupBy: "category" }), data);
    expect(result.unit).toBe("시간");
    expect(result.rows).toEqual([
      { key: "supplies", label: "컵·부자재", value: 36 },
      { key: "bean_milk", label: "원두·우유", value: 1.7 }, // (2 + 1.333…) / 2
      { key: "dessert", label: "디저트", value: null },
      { key: "syrup_sauce", label: "시럽·소스", value: null },
    ]);
  });

  it("데이터가 없는 날은 0이 아니라 null이다", () => {
    const rows = aggregate(spec({ metric: "avg_resolve_hours", groupBy: "date" }), data).rows;
    expect(rows.map((row) => row.value)).toEqual([null, 36, 1.3, null, null, 2, null]);
  });
});

describe("기간 제한", () => {
  it("90일을 넘는 요청은 잘라서 집계하고 clamped를 알린다", () => {
    const result = aggregate(spec({ groupBy: "date", dateRange: { from: "2026-01-01", to: "2026-10-11" } }), data);
    expect(result.clamped).toBe(true);
    expect(result.range).toEqual({ from: "2026-07-14", to: "2026-10-11" });
    expect(result.rows).toHaveLength(90);
  });
});
