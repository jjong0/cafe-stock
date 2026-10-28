"use client";

import { useCallback, useSyncExternalStore } from "react";
import { REPORTER_NAMES } from "../schemas";

export type ReporterName = (typeof REPORTER_NAMES)[number];

const STORAGE_KEY = "cafe-stock:reporter";
const DEFAULT: ReporterName = REPORTER_NAMES[0];
const listeners = new Set<() => void>();
// 저장소를 쓸 수 없을 때도 이번 화면에서는 선택이 유지되도록 메모리에 둔다
let memory: ReporterName = DEFAULT;

function isReporterName(value: string | null): value is ReporterName {
  return REPORTER_NAMES.some((name) => name === value);
}

function read(): ReporterName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isReporterName(stored) ? stored : memory;
  } catch {
    return memory; // 사생활 보호 모드 등에서 저장소 접근이 막힐 수 있다
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 새로고침해도 마지막 보고자가 유지되어야 다른 직원 이름으로 잘못 보고되지 않는다.
// 서버 렌더링 값은 기본값으로 두고 브라우저에서만 저장값을 읽어 hydration 불일치를 피한다.
export function useReporterName() {
  const reporter = useSyncExternalStore(subscribe, read, () => DEFAULT);

  const setReporter = useCallback((name: ReporterName) => {
    memory = name;
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // 저장에 실패해도 memory에 남아 있어 이번 화면에서는 반영된다
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [reporter, setReporter] as const;
}
