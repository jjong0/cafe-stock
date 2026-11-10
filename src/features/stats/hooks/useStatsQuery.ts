"use client";

import { useCallback, useState } from "react";
import { ApiClientError, fetchJson } from "@/lib/api-client";
import { StatsQueryResponseSchema, type StatsQueryResponse } from "../schemas";

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; data: StatsQueryResponse }
  | { status: "error"; question: string; message: string };

export function useStatsQuery() {
  const [state, setState] = useState<State>({ status: "idle" });

  const ask = useCallback(async (question: string) => {
    setState({ status: "loading", question });
    try {
      const data = await fetchJson("/api/stats/query", StatsQueryResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setState({ status: "done", question, data });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "통계를 불러오지 못했습니다.";
      setState({ status: "error", question, message });
    }
  }, []);

  return { state, ask };
}
