"use client";

import { useEffect, useState } from "react";

// 서버가 넘긴 기준 시각으로 첫 렌더링을 맞춰 hydration 불일치를 피하고, 이후 주기적으로 갱신한다
export function useNow(initialNow: number, intervalMs = 60_000): number {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
