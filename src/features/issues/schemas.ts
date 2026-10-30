import { z } from "zod";
import { CategorySchema, LevelSchema } from "@/features/report/schemas";

// 요청
export const IssueFilterSchema = z.enum(["open", "acknowledged", "all"]).default("all");
export type IssueFilter = z.infer<typeof IssueFilterSchema>;

export const IssueIdSchema = z.uuid();

export const IssueActionSchema = z.object({ action: z.enum(["acknowledge", "resolve"]) });
export type IssueAction = z.infer<typeof IssueActionSchema>["action"];

// 응답: 사장님 화면(T9)이 API 응답을 검증할 때 쓴다
export const IssueStatusSchema = z.enum(["open", "acknowledged", "resolved"]);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssueReportSchema = z.object({
  id: z.uuid(),
  level: LevelSchema,
  reporterName: z.string(),
  memo: z.string().nullable(),
  createdAt: z.string(),
});

export const IssueSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  itemName: z.string(),
  category: CategorySchema,
  level: LevelSchema,
  status: IssueStatusSchema,
  openedAt: z.string(),
  acknowledgedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  reportCount: z.number().int(),
  reports: z.array(IssueReportSchema),
});
export type Issue = z.infer<typeof IssueSchema>;

export const IssuesResponseSchema = z.object({ issues: z.array(IssueSchema) });
export const IssueResponseSchema = z.object({ issue: IssueSchema });
