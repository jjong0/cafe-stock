import { Tag } from "@/components/ui/Tag";
import { describeSpec } from "../format";
import type { StatsQueryResponse } from "../schemas";
import { StatsChart } from "./StatsChart";

type StatsResultProps = {
  result: StatsQueryResponse;
  onAsk: (question: string) => void;
};

export function StatsResult({ result, onAsk }: StatsResultProps) {
  if (!result.spec.supported || !("data" in result)) {
    const suggestions = "suggestions" in result ? result.suggestions : [];
    return (
      <div className="rounded-2xl bg-surface p-5">
        <p className="text-[16px] font-semibold">이 질문은 답할 수 없습니다</p>
        <p className="mt-1 text-[15px] text-fg-sub">{result.spec.supported ? "" : result.spec.reason}</p>
        <p className="mt-4 text-[13px] font-semibold text-fg-weak">이런 질문을 해 보세요</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onAsk(question)}
              className="rounded-full bg-bg px-3.5 py-2 text-[14px] ring-1 ring-inset ring-line hover:bg-line/40"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { spec, data, source } = result;
  const empty = data.rows.length === 0 || data.rows.every((row) => row.value === null || row.value === 0);

  return (
    <section aria-labelledby="stats-title" className="rounded-2xl border border-line p-5">
      <h2 id="stats-title" className="text-[17px] font-bold">
        {spec.title}
      </h2>
      {/* 해석 결과는 코드가 조건으로 만든 문구다. AI가 해석했는지 추천 질문인지 밝힌다 */}
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-fg-weak">
        <Tag tone="neutral">{source === "ai" ? "AI 해석" : "추천 질문"}</Tag>
        {describeSpec(spec, data)}
      </p>
      {data.clamped && (
        <p className="mt-2 text-[13px] text-low">기간이 90일을 넘어 최근 90일만 집계했습니다.</p>
      )}

      <div className="mt-4">
        {empty ? (
          <p className="py-10 text-center text-[15px] text-fg-weak">이 기간에는 기록이 없습니다.</p>
        ) : (
          <StatsChart rows={data.rows} unit={data.unit} groupBy={spec.groupBy} title={spec.title} />
        )}
      </div>
    </section>
  );
}
