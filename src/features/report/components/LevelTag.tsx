import { Tag } from "@/components/ui/Tag";
import { LEVEL_LABEL } from "../constants";
import type { Level } from "../schemas";

export function LevelTag({ level, className }: { level: Level; className?: string }) {
  return (
    <Tag tone={level === "out" ? "danger" : "warning"} className={className}>
      {LEVEL_LABEL[level]}
    </Tag>
  );
}
