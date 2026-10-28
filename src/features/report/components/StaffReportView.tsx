"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api-client";
import { CATEGORY_OPTIONS } from "../constants";
import { useReportDraft } from "../hooks/useReportDraft";
import { useReporterName, type ReporterName } from "../hooks/useReporterName";
import { useSentReports } from "../hooks/useSentReports";
import { useSubmitReports } from "../hooks/useSubmitReports";
import { REPORTER_NAMES, type Category, type Item, type Level, type SubmittedIssue } from "../schemas";
import { ItemList } from "./ItemList";
import { NotificationBell } from "./NotificationBell";
import { ReportBar, type SelectedLine } from "./ReportBar";
import { SentReportsPanel } from "./SentReportsPanel";

export function StaffReportView({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<Category>("bean_milk");
  const [reporter, setReporter] = useReporterName();
  const [memo, setMemo] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelId = useId();
  const headerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const draft = useReportDraft();
  const sent = useSentReports();
  const { submit, pending } = useSubmitReports(setItems);

  const visibleItems = useMemo(() => items.filter((item) => item.category === category), [items, category]);
  const lines = useMemo<SelectedLine[]>(() => {
    const nameById = new Map(items.map((item) => [item.id, item.name]));
    return draft.entries.map((entry) => ({ ...entry, name: nameById.get(entry.itemId) ?? "" }));
  }, [items, draft.entries]);

  // 패널 밖을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!panelOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setPanelOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPanelOpen(false);
      bellRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen]);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = (text: string, tone: ToastMessage["tone"]) => setToast({ id: Date.now(), text, tone });

  function toggle(itemId: string, level: Level) {
    if (draft.levelOf(itemId) === level) draft.remove(itemId);
    else draft.setLevel(itemId, level);
  }

  function togglePanel() {
    if (!panelOpen) sent.markRead();
    setPanelOpen(!panelOpen);
  }

  async function handleSubmit() {
    const trimmedMemo = memo.trim() || undefined;
    let issues: SubmittedIssue[];
    try {
      issues = await submit({ reporterName: reporter, entries: draft.entries, memo: trimmedMemo });
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "보고를 보내지 못했습니다. 다시 보내 주세요.", "error");
      return;
    }
    const issueIdByItem = new Map(issues.map((issue) => [issue.itemId, issue.id]));
    sent.add({
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
      reporterName: reporter,
      memo: trimmedMemo,
      lines: lines.flatMap((line) => {
        const issueId = issueIdByItem.get(line.itemId);
        return issueId ? [{ ...line, issueId }] : [];
      }),
    });
    draft.clear();
    setMemo("");
    showToast(`${lines.length}개 품목을 보고했습니다.`, "success");
  }

  return (
    <>
      <div className="sticky top-0 z-20 bg-bg">
        <div ref={headerRef} className="relative mx-auto w-full max-w-xl">
          <header className="flex items-center justify-between gap-2 py-2 pr-2 pl-4">
            <h1 className="text-[22px] font-bold">재고 보고</h1>
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-2 text-[14px] text-fg-weak">
                <span className="sr-only sm:not-sr-only">보고자</span>
                <select
                  value={reporter}
                  onChange={(event) => {
                    const next = REPORTER_NAMES.find((name) => name === event.target.value);
                    if (next) setReporter(next satisfies ReporterName);
                  }}
                  aria-label="보고자"
                  className="h-9 rounded-lg bg-surface px-2.5 text-[15px] font-semibold text-fg"
                >
                  {REPORTER_NAMES.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <NotificationBell
                ref={bellRef}
                hasUnread={sent.hasUnread}
                open={panelOpen}
                panelId={panelId}
                onClick={togglePanel}
              />
            </div>
          </header>
          {panelOpen && <SentReportsPanel id={panelId} reports={sent.reports} items={items} />}
        </div>
        <nav>
          <Tabs label="품목 분류" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} className="mx-auto max-w-xl px-2" />
        </nav>
      </div>

      <div className={`mx-auto w-full max-w-xl px-4 ${lines.length > 0 ? "pb-48" : "pb-8"}`}>
        <ItemList items={visibleItems} levelOf={draft.levelOf} onToggle={toggle} />
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
