import { z } from "zod";
import { DateRangeSchema, GroupBySchema, MetricSchema } from "@/features/stats/schemas";

// AI 브리핑 출력. 품목은 itemId로만 받고, 화면의 품목명은 DB 값을 쓴다
export const BriefingSchema = z.object({
  summary: z.string().max(200),
  priorities: z.array(z.object({ itemId: z.uuid(), reason: z.string().max(80) })).max(5),
  recurring: z.array(z.object({ itemId: z.uuid(), note: z.string().max(80) })).max(3),
});
export type Briefing = z.infer<typeof BriefingSchema>;

// 자연어 통계 질문 해석 결과(설계 8절). 숫자는 담지 않고 집계 조건만 담는다
export const ChartSpecSchema = z.discriminatedUnion("supported", [
  z.object({
    supported: z.literal(true),
    metric: MetricSchema,
    groupBy: GroupBySchema,
    dateRange: DateRangeSchema,
    itemIds: z.array(z.uuid()).optional(),
    topN: z.number().int().min(1).max(10).optional(),
    chartType: z.enum(["bar", "line"]),
    title: z.string().max(40),
  }),
  z.object({ supported: z.literal(false), reason: z.string().max(100) }),
]);
export type ChartSpec = z.infer<typeof ChartSpecSchema>;
