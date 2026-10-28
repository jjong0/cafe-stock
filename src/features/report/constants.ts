import type { Category, Level } from "./schemas";

export const CATEGORY_OPTIONS: ReadonlyArray<{ value: Category; label: string }> = [
  { value: "bean_milk", label: "원두·우유" },
  { value: "syrup_sauce", label: "시럽·소스" },
  { value: "supplies", label: "컵·부자재" },
  { value: "dessert", label: "디저트" },
];

export const LEVEL_LABEL: Record<Level, string> = {
  low: "부족",
  out: "품절",
};
