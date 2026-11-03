import { z } from "zod";

export const MetricSchema = z.enum(["report_count", "out_count", "avg_resolve_hours"]);
export type Metric = z.infer<typeof MetricSchema>;

export const GroupBySchema = z.enum(["item", "category", "weekday", "date"]);
export type GroupBy = z.infer<typeof GroupBySchema>;

export const DateRangeSchema = z.object({ from: z.iso.date(), to: z.iso.date() }); // YYYY-MM-DD, 한국 날짜
export type DateRange = z.infer<typeof DateRangeSchema>;

// 집계 요청. T15에서 AI가 만드는 ChartSpec 중 supported: true인 경우가 이 형태를 따른다
export const AggregateSpecSchema = z.object({
  metric: MetricSchema,
  groupBy: GroupBySchema,
  dateRange: DateRangeSchema,
  itemIds: z.array(z.uuid()).optional(),
  topN: z.number().int().min(1).max(10).optional(),
});
export type AggregateSpec = z.infer<typeof AggregateSpecSchema>;

export const AggregateResultSchema = z.object({
  rows: z.array(z.object({ key: z.string(), label: z.string(), value: z.number().nullable() })),
  unit: z.enum(["회", "시간"]),
  range: DateRangeSchema,
  clamped: z.boolean(),
});
export type AggregateResult = z.infer<typeof AggregateResultSchema>;
