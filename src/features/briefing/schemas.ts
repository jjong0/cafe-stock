import { z } from "zod";

// POST /api/briefing 응답. 브라우저에서도 외부 입력으로 보고 검증한다
export const BriefingResponseSchema = z.object({
  briefing: z.object({
    summary: z.string(),
    priorities: z.array(z.object({ itemId: z.uuid(), itemName: z.string(), reason: z.string() })),
    recurring: z.array(z.object({ itemId: z.uuid(), itemName: z.string(), note: z.string() })),
  }),
  cached: z.boolean(),
  generatedAt: z.string(),
});
export type BriefingResponse = z.infer<typeof BriefingResponseSchema>;
