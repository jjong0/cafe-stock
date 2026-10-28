import type { Item, Level } from "../schemas";
import { ItemRow } from "./ItemRow";

type ItemListProps = {
  items: Item[];
  levelOf: (itemId: string) => Level | undefined;
  onToggle: (itemId: string, level: Level) => void;
};

export function ItemList({ items, levelOf, onToggle }: ItemListProps) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-[15px] text-fg-weak">이 분류에는 등록된 품목이 없습니다.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          draftLevel={levelOf(item.id)}
          onToggle={(level) => onToggle(item.id, level)}
        />
      ))}
    </ul>
  );
}
