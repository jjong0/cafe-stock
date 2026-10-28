import type { Item, Level } from "../schemas";
import { ItemTile } from "./ItemTile";

type ItemGridProps = {
  items: Item[];
  levelOf: (itemId: string) => Level | undefined;
  expandedId: string | null;
  onExpand: (itemId: string | null) => void;
  onChoose: (itemId: string, level: Level) => void;
  onRemove: (itemId: string) => void;
};

export function ItemGrid({ items, levelOf, expandedId, onExpand, onChoose, onRemove }: ItemGridProps) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-ink-soft">이 분류에는 등록된 품목이 없습니다.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.id}>
          <ItemTile
            item={item}
            draftLevel={levelOf(item.id)}
            expanded={expandedId === item.id}
            onExpand={() => onExpand(item.id)}
            onCollapse={() => onExpand(null)}
            onChoose={(level) => onChoose(item.id, level)}
            onRemove={() => onRemove(item.id)}
          />
        </li>
      ))}
    </ul>
  );
}
