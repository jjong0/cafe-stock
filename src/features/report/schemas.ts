import { z } from "zod";

export const REPORTER_NAMES = ["직원A", "직원B", "직원C"] as const;

export const LevelSchema = z.enum(["low", "out"]);

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
