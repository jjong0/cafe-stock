"use client";

import { useCallback, useMemo, useState } from "react";
import type { Level } from "../schemas";

export type DraftEntry = { itemId: string; level: Level };

// 제출 전 선택 목록. 고른 순서대로 보고표에 쌓이도록 배열로 둔다
export function useReportDraft() {
  const [entries, setEntries] = useState<DraftEntry[]>([]);

  const levelOf = useMemo(() => {
    const map = new Map(entries.map((entry) => [entry.itemId, entry.level]));
    return (itemId: string) => map.get(itemId);
  }, [entries]);

  const setLevel = useCallback((itemId: string, level: Level) => {
    setEntries((prev) =>
      prev.some((entry) => entry.itemId === itemId)
        ? prev.map((entry) => (entry.itemId === itemId ? { itemId, level } : entry))
        : [...prev, { itemId, level }],
    );
  }, []);

  const remove = useCallback((itemId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.itemId !== itemId));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, levelOf, setLevel, remove, clear };
}
