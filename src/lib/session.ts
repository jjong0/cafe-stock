import { cookies } from "next/headers";
import { z } from "zod";
import { AppError } from "./errors";

export const SESSION_COOKIE = "session_id";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const SessionIdSchema = z.uuid();

export function isValidSessionId(value: string | undefined): value is string {
  return SessionIdSchema.safeParse(value).success;
}

// 쿠키는 proxy.ts가 발급한다. 여기서 없다면 proxy matcher에서 빠진 경로이거나 쿠키가 조작된 경우다.
export async function getSessionId(): Promise<string> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSessionId(value)) {
    throw new AppError("NO_SESSION", "세션이 없습니다. 페이지를 새로고침해 주세요.", 401);
  }
  return value;
}
