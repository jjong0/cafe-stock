"use client";

import { useEffect } from "react";
import { cx } from "@/lib/cx";

export type ToastMessage = { id: number; text: string; tone: "success" | "error" };

let nextId = 0;
// 같은 문구가 연달아 와도 다시 뜨도록 메시지마다 새 id를 붙인다
export function toastMessage(text: string, tone: ToastMessage["tone"]): ToastMessage {
  nextId += 1;
  return { id: nextId, text, tone };
}

type ToastProps = {
  message: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
};

// 성공은 잠깐 보였다 사라지고, 오류는 놓치지 않도록 닫을 때까지 남는다
export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  const persistent = message?.tone === "error";

  useEffect(() => {
    if (!message || persistent) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, persistent, onDismiss, durationMs]);

  return (
    <div
      aria-live={persistent ? "assertive" : "polite"}
      role={persistent ? "alert" : "status"}
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      {message && (
        <div
          key={message.id}
          className={cx(
            "pointer-events-auto flex max-w-md items-center gap-3 rounded-xl py-3 pl-4 text-[15px] font-medium",
            persistent ? "bg-out pr-1.5 text-white" : "bg-fg/90 pr-4 text-white",
          )}
        >
          <p>{message.text}</p>
          {persistent && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold hover:bg-white/15"
            >
              닫기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
