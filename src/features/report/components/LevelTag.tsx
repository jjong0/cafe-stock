import { Tag } from "@/components/ui/Tag";
import { LEVEL_LABEL } from "../constants";
import type { Level } from "../schemas";

// 부족은 병에 붙인 테이프, 품절은 찍힌 도장처럼 보이게 한다
export function LevelTag({ level, className }: { level: Level; className?: string }) {
  return (
    <Tag tone={level === "out" ? "stamp" : "tape"} className={className}>
      {LEVEL_LABEL[level]}
    </Tag>
  );
}
