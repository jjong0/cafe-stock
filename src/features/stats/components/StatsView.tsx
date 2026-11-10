"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useStatsQuery } from "../hooks/useStatsQuery";
import { SUGGESTED_QUESTIONS } from "../suggestions";
import { StatsResult } from "./StatsResult";

const QUESTION_MAX = 200;

export function StatsView() {
  const { state, ask } = useStatsQuery();
  const [question, setQuestion] = useState("");
  const loading = state.status === "loading";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setQuestion(trimmed);
    void ask(trimmed);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(question);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16">
      <h1 className="text-[22px] font-bold">재고 통계</h1>
      <p className="mt-1 text-[15px] text-fg-sub">궁금한 것을 물어보면 지난 기록을 집계해 차트로 보여줍니다.</p>

      <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">질문</span>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={QUESTION_MAX}
            placeholder="예: 지난주에 우유 품절 몇 번 있었어?"
            className="h-12 w-full rounded-xl bg-surface px-4 text-[16px] placeholder:text-fg-weak focus:outline-none focus:ring-2 focus:ring-fg"
          />
        </label>
        <Button type="submit" size="lg" className="h-12" disabled={loading || !question.trim()}>
          {loading ? "집계 중…" : "물어보기"}
        </Button>
      </form>
      {/* Gemini 무료 플랜은 입력이 서비스 개선에 쓰일 수 있어 안내한다 */}
      <p className="mt-2 text-[13px] text-fg-weak">질문은 AI(Gemini)가 해석합니다. 이름, 연락처 같은 개인정보는 입력하지 마세요.</p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="추천 질문">
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => submit(suggestion)}
            disabled={loading}
            className="rounded-full bg-surface px-3.5 py-2 text-[14px] text-fg-sub hover:bg-line disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-busy={loading} className="mt-6">
        {state.status === "loading" && <ResultSkeleton />}
        {state.status === "error" && (
          <p role="alert" className="rounded-2xl bg-out-soft p-5 text-[15px] font-medium text-out">
            {state.message}
          </p>
        )}
        {state.status === "done" && <StatsResult result={state.data} onAsk={submit} />}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-line p-5" aria-label="집계하는 중">
      <div className="h-5 w-48 rounded bg-surface" />
      <div className="mt-2 h-4 w-72 rounded bg-surface" />
      <div className="mt-6 h-56 rounded-xl bg-surface" />
    </div>
  );
}
