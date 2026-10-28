import { z } from "zod";

const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

// 우리 API의 응답도 브라우저 입장에선 외부 입력이라 스키마로 검증한 뒤 쓴다
export async function fetchJson<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError("NETWORK_ERROR", "서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.", 0);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw parsed.success
      ? new ApiClientError(parsed.data.error.code, parsed.data.error.message, response.status)
      : new ApiClientError("UNKNOWN_ERROR", "요청을 처리하지 못했습니다.", response.status);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiClientError("INVALID_RESPONSE", "서버 응답 형식이 올바르지 않습니다.", response.status);
  }
  return parsed.data;
}
