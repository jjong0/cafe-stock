import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// 무료 플랜에서 하루 호출 한도가 가장 넉넉한 계열(Flash-Lite)을 쓴다. 한도는 AI Studio 콘솔에서 확인한다
export const AI_MODEL_ID = "gemini-3.5-flash-lite";

const EnvSchema = z.object({ GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1) });

let provider: ReturnType<typeof createGoogleGenerativeAI> | undefined;

// API 키는 서버 전용이다(server-only가 클라이언트 번들에 포함되는 것을 빌드 단계에서 막는다)
export function getModel() {
  if (!provider) {
    // ZodError는 handleRouteError에서 400으로 바뀌므로 설정 오류는 일반 Error로 던진다(500)
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.");
    provider = createGoogleGenerativeAI({ apiKey: parsed.data.GOOGLE_GENERATIVE_AI_API_KEY });
  }
  return provider(AI_MODEL_ID);
}
