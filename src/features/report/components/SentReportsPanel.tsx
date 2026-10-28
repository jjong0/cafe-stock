import { cx } from "@/lib/cx";
import { LEVEL_LABEL } from "../constants";
import type { Item, SentReport } from "../schemas";

type SentReportsPanelProps = {
  id: string;
  reports: SentReport[];
  items: Item[];
};

const timeFormat = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

// 품목의 현재 미처리 이슈가 보낸 그 이슈인지로 상태를 정한다. 이슈가 닫혔으면 처리완료다
function statusOf(issueId: string, item: Item | undefined) {
  if (item?.openIssue?.id !== issueId) return { label: "처리완료", tone: "text-fg-weak" };
  return item.openIssue.status === "acknowledged"
    ? { label: "사장님 확인", tone: "text-fg" }
    : { label: "확인 전", tone: "text-fg-weak" };
}

export function SentReportsPanel({ id, reports, items }: SentReportsPanelProps) {
  const itemById = new Map(items.map((item) => [item.id, item]));

  return (
    <section
      id={id}
      aria-label="보낸 보고"
      className="absolute top-full right-2 left-2 z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-bg p-4 shadow-[0_8px_24px_rgb(0_0_0/0.12)] sm:left-auto sm:w-[360px]"
    >
      <h2 className="text-[17px] font-bold">보낸 보고</h2>

      {reports.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-fg-weak">아직 보낸 보고가 없습니다.</p>
      ) : (
        <ol className="mt-1">
          {reports.map((report) => (
            <li key={report.id} className="border-b border-line py-3 last:border-b-0">
              <p className="text-[13px] text-fg-weak">
                {timeFormat.format(new Date(report.sentAt))} · {report.reporterName}
              </p>
              <ul className="mt-1.5 space-y-1">
                {report.lines.map((line) => {
                  const status = statusOf(line.issueId, itemById.get(line.itemId));
                  return (
                    <li key={line.itemId} className="flex items-center justify-between text-[15px]">
                      <span>
                        {line.name}
                        <span className={cx("ml-2 font-semibold", line.level === "out" ? "text-out" : "text-low")}>
                          {LEVEL_LABEL[line.level]}
                        </span>
                      </span>
                      <span className={cx("text-[13px]", status.tone)}>{status.label}</span>
                    </li>
                  );
                })}
              </ul>
              {report.memo && <p className="mt-1.5 text-[14px] text-fg-sub">“{report.memo}”</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
