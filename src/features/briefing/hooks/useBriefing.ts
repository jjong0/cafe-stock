"use client";

import { useCallback, useRef, useState } from "react";
import { ApiClientError, fetchJson } from "@/lib/api-client";
import { BriefingResponseSchema, type BriefingResponse } from "../schemas";

type State =
  | { status: "idle" }
  | { status: "loading"; previous: BriefingResponse | null }
  | { status: "done"; data: BriefingResponse }
  | { status: "error"; message: string; previous: BriefingResponse | null };

export function useBriefing() {
  const [state, setState] = useState<State>({ status: "idle" });
  // 다시 만드는 동안이나 실패했을 때도 직전 브리핑은 계속 보여준다
  const lastRef = useRef<BriefingResponse | null>(null);

  const generate = useCallback(async () => {
    setState({ status: "loading", previous: lastRef.current });
    try {
      const data = await fetchJson("/api/briefing", BriefingResponseSchema, { method: "POST" });
      lastRef.current = data;
      setState({ status: "done", data });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "브리핑을 불러오지 못했습니다.";
      setState({ status: "error", message, previous: lastRef.current });
    }
  }, []);

  return { state, generate };
}
