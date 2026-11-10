import { APICallError, NoObjectGeneratedError } from "ai";
import { describe, expect, it, vi } from "vitest";
import { OVERLOAD_RETRY_DELAY_MS, withAiRetry } from "./retry";

const overloaded = () =>
  new APICallError({ message: "high demand", url: "https://example.test", requestBodyValues: {}, statusCode: 503 });
const rateLimited = () =>
  new APICallError({ message: "quota", url: "https://example.test", requestBodyValues: {}, statusCode: 429 });
const badSchema = () =>
  new NoObjectGeneratedError({
    message: "schema mismatch",
    text: "{}",
    response: { id: "r", timestamp: new Date(), modelId: "m" },
    usage: {
      inputTokens: 1,
      inputTokenDetails: { noCacheTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
      outputTokens: 1,
      outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
      totalTokens: 2,
    },
    finishReason: "stop",
  });

function setup(results: Array<unknown | Error>) {
  const call = vi.fn(async () => {
    const next = results.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  const beforeAttempt = vi.fn(async () => {});
  const delay = vi.fn(async () => {});
  return { call, beforeAttempt, delay, run: () => withAiRetry(call, { beforeAttempt, delay }) };
}

describe("withAiRetry", () => {
  it("성공하면 한 번만 부르고 카운트도 한 번 센다", async () => {
    const t = setup(["ok"]);
    await expect(t.run()).resolves.toBe("ok");
    expect(t.call).toHaveBeenCalledTimes(1);
    expect(t.beforeAttempt).toHaveBeenCalledTimes(1);
  });

  it("과부하(503)면 잠깐 기다렸다 1회 다시 부르고, 재시도도 카운트한다", async () => {
    const t = setup([overloaded(), "ok"]);
    await expect(t.run()).resolves.toBe("ok");
    expect(t.call).toHaveBeenCalledTimes(2);
    expect(t.beforeAttempt).toHaveBeenCalledTimes(2);
    expect(t.delay).toHaveBeenCalledWith(OVERLOAD_RETRY_DELAY_MS);
  });

  it("과부하가 두 번 이어지면 더 부르지 않고 오류를 넘긴다", async () => {
    const t = setup([overloaded(), overloaded(), "never"]);
    await expect(t.run()).rejects.toMatchObject({ statusCode: 503 });
    expect(t.call).toHaveBeenCalledTimes(2);
  });

  it("분당 한도(429)는 다시 보내면 더 막히므로 재시도하지 않는다", async () => {
    const t = setup([rateLimited(), "never"]);
    await expect(t.run()).rejects.toMatchObject({ statusCode: 429 });
    expect(t.call).toHaveBeenCalledTimes(1);
    expect(t.delay).not.toHaveBeenCalled();
  });

  it("스키마 불일치는 기다리지 않고 1회 다시 부른다", async () => {
    const t = setup([badSchema(), "ok"]);
    await expect(t.run()).resolves.toBe("ok");
    expect(t.call).toHaveBeenCalledTimes(2);
    expect(t.delay).not.toHaveBeenCalled();
  });

  it("스키마 재시도와 과부하 재시도는 따로 센다(최대 3번 호출)", async () => {
    const t = setup([badSchema(), overloaded(), "ok"]);
    await expect(t.run()).resolves.toBe("ok");
    expect(t.call).toHaveBeenCalledTimes(3);
    expect(t.beforeAttempt).toHaveBeenCalledTimes(3);
  });
});
