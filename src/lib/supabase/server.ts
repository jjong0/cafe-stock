import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./database.types";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

let client: SupabaseClient<Database> | undefined;

// service role 키는 RLS를 우회하므로 이 모듈은 서버에서만 import된다(server-only가 빌드 단계에서 막는다)
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    // ZodError를 그대로 던지면 handleRouteError가 요청 오류(400)로 응답하므로 일반 Error로 바꾼다
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Supabase 환경 변수 오류: ${parsed.error.message}`);
    }
    const env = parsed.data;
    client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
