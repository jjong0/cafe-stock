"use client";

import { useCallback, useMemo, useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api-client";
import { CATEGORY_OPTIONS } from "../constants";
import { useReportDraft } from "../hooks/useReportDraft";
import { useReporterName } from "../hooks/useReporterName";
import { useSubmitReports } from "../hooks/useSubmitReports";
import { REPORTER_NAMES, type Category, type Item, type Level } from "../schemas";
import { ItemGrid } from "./ItemGrid";
import { ReportTicket, type TicketLine } from "./ReportTicket";

const REPORTER_OPTIONS = REPORTER_NAMES.map((name) => ({ value: name, label: name }));
const TEAR_MS = 380;

export function StaffReportView({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<Category>("bean_milk");
  const [reporter, setReporter] = useReporterName();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [tearing, setTearing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const draft = useReportDraft();
  const { submit, pending } = useSubmitReports(setItems);

  const visibleItems = useMemo(() => items.filter((item) => item.category === category), [items, category]);
  const lines = useMemo<TicketLine[]>(() => {
    const nameById = new Map(items.map((item) => [item.id, item.name]));
    return draft.entries.map((entry) => ({ ...entry, name: nameById.get(entry.itemId) ?? "" }));
  }, [items, draft.entries]);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = (text: string, tone: ToastMessage["tone"]) => setToast({ id: Date.now(), text, tone });

  function choose(itemId: string, level: Level) {
    draft.setLevel(itemId, level);
    setExpandedId(null);
  }

  function remove(itemId: string) {
    draft.remove(itemId);
    setExpandedId(null);
  }

  async function handleSubmit() {
    const count = draft.entries.length;
    try {
      await submit({ reporterName: reporter, entries: draft.entries, memo: memo.trim() || undefined });
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "보고를 보내지 못했습니다. 다시 보내 주세요.", "error");
      return;
    }
    setTearing(true);
    setTimeout(() => {
      draft.clear();
      setMemo("");
      setTearing(false);
    }, TEAR_MS);
    showToast(`보고 ${count}건을 보냈습니다.`, "success");
  }

  return (
    <>
      <div className="mx-auto w-full max-w-xl px-4 pb-72">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-6 pb-4">
          <h1 className="font-display text-[2rem] leading-none">재고 보고</h1>
          <SegmentedControl label="보고자" options={REPORTER_OPTIONS} value={reporter} onChange={setReporter} size="sm" />
        </header>

        <nav className="sticky top-0 z-10 -mx-4 bg-steel/95 px-4 py-2 backdrop-blur">
          <SegmentedControl
            label="품목 분류"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(next) => {
              setCategory(next);
              setExpandedId(null);
            }}
            optionClassName="font-display text-[17px]"
          />
        </nav>

        <div className="pt-3">
          <ItemGrid
            items={visibleItems}
            levelOf={draft.levelOf}
            expandedId={expandedId}
            onExpand={setExpandedId}
            onChoose={choose}
            onRemove={remove}
          />
        </div>
      </div>

      <ReportTicket
        lines={lines}
        reporterName={reporter}
        memo={memo}
        onMemoChange={setMemo}
        onRemove={draft.remove}
        onSubmit={handleSubmit}
        pending={pending || tearing}
        tearing={tearing}
      />
      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}
