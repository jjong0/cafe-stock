"use client";

import { useCallback, useMemo, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api-client";
import { CATEGORY_OPTIONS } from "../constants";
import { useReportDraft } from "../hooks/useReportDraft";
import { useReporterName, type ReporterName } from "../hooks/useReporterName";
import { useSubmitReports } from "../hooks/useSubmitReports";
import { REPORTER_NAMES, type Category, type Item, type Level } from "../schemas";
import { ItemList } from "./ItemList";
import { ReportBar, type SelectedLine } from "./ReportBar";

export function StaffReportView({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<Category>("bean_milk");
  const [reporter, setReporter] = useReporterName();
  const [memo, setMemo] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const draft = useReportDraft();
  const { submit, pending } = useSubmitReports(setItems);

  const visibleItems = useMemo(() => items.filter((item) => item.category === category), [items, category]);
  const lines = useMemo<SelectedLine[]>(() => {
    const nameById = new Map(items.map((item) => [item.id, item.name]));
    return draft.entries.map((entry) => ({ ...entry, name: nameById.get(entry.itemId) ?? "" }));
  }, [items, draft.entries]);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = (text: string, tone: ToastMessage["tone"]) => setToast({ id: Date.now(), text, tone });

  function toggle(itemId: string, level: Level) {
    if (draft.levelOf(itemId) === level) draft.remove(itemId);
    else draft.setLevel(itemId, level);
  }

  async function handleSubmit() {
    const count = draft.entries.length;
    try {
      await submit({ reporterName: reporter, entries: draft.entries, memo: memo.trim() || undefined });
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "보고를 보내지 못했습니다. 다시 보내 주세요.", "error");
      return;
    }
    draft.clear();
    setMemo("");
    showToast(`${count}개 품목을 보고했습니다.`, "success");
  }

  return (
    <>
      <div className={lines.length > 0 ? "pb-48" : "pb-8"}>
        <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-5 pb-2">
          <h1 className="text-[22px] font-bold">재고 보고</h1>
          <label className="flex items-center gap-2 text-[14px] text-fg-weak">
            보고자
            <select
              value={reporter}
              onChange={(event) => {
                const next = REPORTER_NAMES.find((name) => name === event.target.value);
                if (next) setReporter(next satisfies ReporterName);
              }}
              className="h-9 rounded-lg bg-surface px-2.5 text-[15px] font-semibold text-fg"
            >
              {REPORTER_NAMES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </header>

        <nav className="sticky top-0 z-10 bg-bg">
          <Tabs label="품목 분류" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} className="mx-auto max-w-xl px-2" />
        </nav>

        <div className="mx-auto w-full max-w-xl px-4">
          <ItemList items={visibleItems} levelOf={draft.levelOf} onToggle={toggle} />
        </div>
      </div>

      {lines.length > 0 && (
        <ReportBar
          lines={lines}
          memo={memo}
          onMemoChange={setMemo}
          onRemove={draft.remove}
          onSubmit={handleSubmit}
          pending={pending}
        />
      )}
      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}
