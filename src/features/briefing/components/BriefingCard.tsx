"use client";

import { Button } from "@/components/ui/Button";
import { formatTime } from "@/features/issues/format";
import { useBriefing } from "../hooks/useBriefing";
import type { BriefingResponse } from "../schemas";

type BriefingCardProps = {
  onSelectItem: (itemId: string) => void;
};

// AI가 만든 문장은 모두 텍스트로만 렌더링한다(HTML로 넣지 않는다). 품목명은 서버가 DB 값으로 붙인 것이다
export function BriefingCard({ onSelectItem }: BriefingCardProps) {
  const { state, generate } = useBriefing();
  const loading = state.status === "loading";
  const shown = state.status === "done" ? state.data : state.status === "idle" ? null : state.previous;

  return (
    <section aria-labelledby="briefing-title" className="rounded-2xl border border-line p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="briefing-title" className="text-[17px] font-bold">
            오늘의 브리핑
          </h2>
          {shown && !loading && (
            <p className="mt-0.5 text-[13px] text-fg-weak">
              {formatTime(shown.generatedAt)} 생성
              {shown.cached && " · 데이터가 그대로라 저장된 브리핑을 보여줍니다"}
            </p>
          )}
        </div>
        <Button variant={shown ? "secondary" : "primary"} onClick={generate} disabled={loading}>
          {loading ? "만드는 중…" : shown ? "다시 만들기" : "브리핑 만들기"}
        </Button>
      </header>

      <div aria-live="polite" aria-busy={loading} className="mt-4">
        {loading ? (
          <BriefingSkeleton />
        ) : shown ? (
          <BriefingBody data={shown} onSelectItem={onSelectItem} />
        ) : (
          <p className="text-[15px] text-fg-sub">
            미처리 이슈와 최근 7일 보고를 AI가 짧게 정리하고, 먼저 처리할 품목을 골라 줍니다.
          </p>
        )}
        {state.status === "error" && (
          <p role="alert" className="mt-3 text-[14px] font-medium text-out">
            {state.message}
          </p>
        )}
      </div>
    </section>
  );
}

function BriefingBody({ data, onSelectItem }: { data: BriefingResponse; onSelectItem: (itemId: string) => void }) {
  const { summary, priorities, recurring } = data.briefing;
  return (
    <div className="space-y-4">
      <p className="text-[16px] leading-relaxed">{summary}</p>

      {priorities.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-fg-weak">먼저 처리할 품목</h3>
          <ol className="mt-1.5">
            {priorities.map((item, index) => (
              <li key={item.itemId}>
                <button
                  type="button"
                  onClick={() => onSelectItem(item.itemId)}
                  className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface"
                >
                  <span className="w-4 shrink-0 text-[14px] font-semibold text-fg-weak tabular-nums">{index + 1}</span>
                  <span className="shrink-0 text-[15px] font-semibold">{item.itemName}</span>
                  <span className="min-w-0 text-[14px] text-fg-sub">{item.reason}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recurring.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-fg-weak">자주 떨어지는 품목</h3>
          <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 px-2">
            {recurring.map((item) => (
              <li key={item.itemId} className="text-[14px]">
                <span className="font-semibold">{item.itemName}</span>
                <span className="ml-1.5 text-fg-sub">{item.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="브리핑을 만드는 중">
      <div className="h-4 w-11/12 rounded bg-surface" />
      <div className="h-4 w-3/4 rounded bg-surface" />
      <div className="mt-5 h-3 w-24 rounded bg-surface" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-5 w-2/3 rounded bg-surface" />
      ))}
    </div>
  );
}
