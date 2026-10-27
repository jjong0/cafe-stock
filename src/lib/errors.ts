import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NO_SESSION"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "RATE_LIMITED"
  | "AI_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// 라우트의 catch에서 호출한다. 예상하지 못한 오류는 내부 메시지를 숨기고 로그로만 남긴다.
export function handleRouteError(err: unknown) {
  if (err instanceof AppError) {
    return errorResponse(err.code, err.message, err.status);
  }
  // SyntaxError: request.json()이 JSON이 아닌 본문을 받았을 때
  if (err instanceof ZodError || err instanceof SyntaxError) {
    return errorResponse("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.", 400);
  }
  console.error(err);
  return errorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500);
}
