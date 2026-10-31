import { z } from "zod";

// AI 브리핑 출력. 품목은 itemId로만 받고, 화면의 품목명은 DB 값을 쓴다
export const BriefingSchema = z.object({
  summary: z.string().max(200),
  priorities: z.array(z.object({ itemId: z.uuid(), reason: z.string().max(80) })).max(5),
  recurring: z.array(z.object({ itemId: z.uuid(), note: z.string().max(80) })).max(3),
});
export type Briefing = z.infer<typeof BriefingSchema>;
