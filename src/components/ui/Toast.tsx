"use client";

import { useEffect } from "react";
import { cx } from "@/lib/cx";

export type ToastMessage = { id: number; text: string; tone: "success" | "error" };

type ToastProps = {
  message: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
};

export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      {message && (
        <p
          key={message.id}
          className={cx(
            "pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg",
            message.tone === "success" ? "bg-ink text-thermal" : "bg-stamp text-white",
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
