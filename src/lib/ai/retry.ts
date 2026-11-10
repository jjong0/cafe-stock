import { APICallError, NoObjectGeneratedError } from "ai";

export const OVERLOAD_RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type RetryOptions = {
  // 매 시도 직전에 실행한다(호출 제한 카운트). 재시도도 실제 API 호출이라 매번 센다
  beforeAttempt: () => Promise<void>;
  delay?: (ms: number) => Promise<void>;
};

// AI 호출 재시도 규칙. SDK 자동 재시도는 끄고(maxRetries: 0) 이것만 써서 실제 호출 수와 카운트를 맞춘다.
// - 응답이 스키마와 맞지 않으면 바로 1회 다시 부른다(설계 7절)
// - 제공자 과부하(503)는 잠깐 기다렸다 1회 다시 부른다. 분당 한도(429)는 다시 보내면 더 막히므로 재시도하지 않는다
export async function withAiRetry<T>(call: () => Promise<T>, { beforeAttempt, delay = sleep }: RetryOptions): Promise<T> {
  let schemaRetried = false;
  let overloadRetried = false;
  for (;;) {
    await beforeAttempt();
    try {
      return await call();
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err) && !schemaRetried) {
        schemaRetried = true;
        continue;
      }
      if (APICallError.isInstance(err) && err.statusCode === 503 && !overloadRetried) {
        overloadRetried = true;
        await delay(OVERLOAD_RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
}
