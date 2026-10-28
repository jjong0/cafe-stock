import { cx } from "@/lib/cx";
import { LEVEL_LABEL } from "../constants";
import type { Item, Level } from "../schemas";
import { LevelTag } from "./LevelTag";

type ItemRowProps = {
  item: Item;
  draftLevel: Level | undefined;
  onToggle: (level: Level) => void;
};

const LEVELS: Level[] = ["low", "out"];

const SELECTED = {
  low: "bg-low text-white",
  out: "bg-out text-white",
} as const;

// 피크타임에 한 번에 누를 수 있도록 상태 버튼을 행에 바로 둔다. 같은 버튼을 다시 누르면 선택이 풀린다
export function ItemRow({ item, draftLevel, onToggle }: ItemRowProps) {
  return (
    <li className="flex min-h-[68px] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-medium">{item.name}</p>
        {item.openIssue && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-weak">
            <LevelTag level={item.openIssue.level} />
            {item.openIssue.status === "acknowledged" ? "사장님 확인함" : "보고됨 · 확인 전"}
          </p>
        )}
      </div>
      <div role="group" aria-label={`${item.name} 상태`} className="flex shrink-0 gap-1.5">
        {LEVELS.map((level) => {
          const selected = draftLevel === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(level)}
              className={cx(
                "h-10 w-[60px] rounded-lg text-[15px] font-semibold transition-colors",
                selected ? SELECTED[level] : "bg-surface text-fg-sub active:bg-line",
              )}
            >
              {LEVEL_LABEL[level]}
            </button>
          );
        })}
      </div>
    </li>
  );
}
