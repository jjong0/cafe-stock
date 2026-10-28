import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import { LEVEL_LABEL } from "../constants";
import type { Item, Level } from "../schemas";
import { LevelTag } from "./LevelTag";

type ItemTileProps = {
  item: Item;
  draftLevel: Level | undefined;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onChoose: (level: Level) => void;
  onRemove: () => void;
};

const CHOICES: Level[] = ["low", "out"];

export function ItemTile({ item, draftLevel, expanded, onExpand, onCollapse, onChoose, onRemove }: ItemTileProps) {
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (expanded) firstChoiceRef.current?.focus();
  }, [expanded]);

  // 단톡방 보고의 문제였던 "사장님이 봤는지 모름"을 직원 화면에서 바로 알 수 있게 한다
  const reported = item.openIssue && (
    <span className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
      <LevelTag level={item.openIssue.level} />
      <span className="text-xs text-ink-soft">
        {item.openIssue.status === "acknowledged" ? "사장님 확인" : "보고됨"}
      </span>
    </span>
  );

  if (expanded) {
    return (
      <div
        onKeyDown={(event) => event.key === "Escape" && onCollapse()}
        className="relative flex min-h-28 w-full flex-col justify-end gap-2 rounded-xl bg-counter p-2 ring-2 ring-ink"
      >
        <p className="truncate px-1 text-sm font-medium text-ink-soft">{item.name}</p>
        <div role="group" aria-label={`${item.name} 상태`} className="flex gap-1.5">
          {CHOICES.map((level, index) => (
            <button
              key={level}
              ref={index === 0 ? firstChoiceRef : undefined}
              type="button"
              onClick={() => onChoose(level)}
              aria-pressed={draftLevel === level}
              className={cx(
                "h-11 flex-1 rounded-lg text-base font-semibold transition-colors",
                level === "out" ? "bg-stamp text-white hover:bg-stamp/90" : "bg-tape text-tape-ink hover:bg-tape/85",
              )}
            >
              {LEVEL_LABEL[level]}
            </button>
          ))}
          {draftLevel && (
            <button
              type="button"
              onClick={onRemove}
              className="h-11 rounded-lg px-3 text-sm font-medium text-ink-soft ring-1 ring-inset ring-ink/15 hover:text-ink"
            >
              빼기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-expanded={false}
      className={cx(
        "relative flex min-h-28 w-full flex-col items-start justify-end rounded-xl bg-counter p-3 text-left transition-shadow",
        draftLevel ? "ring-2 ring-ink" : "ring-1 ring-ink/10 hover:ring-ink/30",
      )}
    >
      {reported}
      <span className="text-base font-semibold leading-snug">{item.name}</span>
      <span className="mt-0.5 h-5 text-sm text-ink-soft">
        {draftLevel ? `보고표에 담음 · ${LEVEL_LABEL[draftLevel]}` : null}
      </span>
    </button>
  );
}
