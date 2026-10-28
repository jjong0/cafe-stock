"use client";

import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";
import { SentReportSchema, type SentReport } from "../schemas";

// 보낸 보고를 이 브라우저에만 기록한다. 서버의 보고 내역 조회는 사장님 화면(T8) 범위라 여기선 쓰지 않는다
const STORAGE_KEY = "cafe-stock:sent-reports";
const MAX_ENTRIES = 20;
const StoredSchema = z.object({ reports: z.array(SentReportSchema), lastReadAt: z.string().nullable() });
type Stored = z.infer<typeof StoredSchema>;

const EMPTY: Stored = { reports: [], lastReadAt: null };
const listeners = new Set<() => void>();
let memory: Stored = EMPTY;
let cachedRaw: string | null = null;

// useSyncExternalStore는 값이 같으면 같은 참조를 받아야 하므로 원문이 바뀔 때만 다시 파싱한다
function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return memory;
    cachedRaw = raw;
    const parsed = raw ? StoredSchema.safeParse(JSON.parse(raw)) : null;
    memory = parsed?.success ? parsed.data : EMPTY;
  } catch {
    // 저장소를 쓸 수 없으면 메모리 값만 쓴다
  }
  return memory;
}

function write(next: Stored) {
  memory = next;
  try {
    cachedRaw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // 저장에 실패해도 memory에 남아 이번 화면에서는 보인다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSentReports() {
  const stored = useSyncExternalStore(subscribe, read, () => EMPTY);
  const hasUnread = stored.reports.some((report) => !stored.lastReadAt || report.sentAt > stored.lastReadAt);

  const add = useCallback((report: SentReport) => {
    const current = read();
    write({ ...current, reports: [report, ...current.reports].slice(0, MAX_ENTRIES) });
  }, []);

  const markRead = useCallback(() => {
    write({ ...read(), lastReadAt: new Date().toISOString() });
  }, []);

  return { reports: stored.reports, hasUnread, add, markRead };
}
