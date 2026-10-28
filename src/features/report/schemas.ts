import { z } from "zod";

export const REPORTER_NAMES = ["직원A", "직원B", "직원C"] as const;

export const LevelSchema = z.enum(["low", "out"]);
export type Level = z.infer<typeof LevelSchema>;

export const CategorySchema = z.enum(["bean_milk", "syrup_sauce", "supplies", "dessert"]);
export type Category = z.infer<typeof CategorySchema>;

export const SubmitReportsSchema = z.object({
  reporterName: z.enum(REPORTER_NAMES),
  entries: z
    .array(z.object({ itemId: z.uuid(), level: LevelSchema }))
    .min(1)
    .max(25)
    .refine((entries) => new Set(entries.map((e) => e.itemId)).size === entries.length, {
      message: "같은 품목이 중복되었습니다.",
    }),
  memo: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((memo) => memo || undefined),
});

export type SubmitReportsInput = z.infer<typeof SubmitReportsSchema>;

// 응답 스키마: 클라이언트가 API 응답을 검증할 때 쓴다
export const ItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: CategorySchema,
  openIssue: z
    .object({ id: z.uuid(), level: LevelSchema, status: z.enum(["open", "acknowledged"]) })
    .nullable(),
});
export type Item = z.infer<typeof ItemSchema>;

export const ItemsResponseSchema = z.object({ items: z.array(ItemSchema) });

const SubmittedIssueSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  level: LevelSchema,
  status: z.string(),
  openedAt: z.string(),
});
export type SubmittedIssue = z.infer<typeof SubmittedIssueSchema>;

export const SubmitReportsResponseSchema = z.object({ issues: z.array(SubmittedIssueSchema) });

// 브라우저에 저장하는 보낸 보고 기록. 저장소 값도 외부 입력이라 읽을 때 검증한다
export const SentReportSchema = z.object({
  id: z.string(),
  sentAt: z.string(),
  reporterName: z.string(),
  memo: z.string().optional(),
  lines: z.array(z.object({ itemId: z.uuid(), issueId: z.uuid(), name: z.string(), level: LevelSchema })),
});
export type SentReport = z.infer<typeof SentReportSchema>;
