import type { Ref } from "react";

type NotificationBellProps = {
  hasUnread: boolean;
  open: boolean;
  panelId: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
};

// 새로 보낸 보고가 있으면 빨간 점을 켠다. 눌러서 보낸 기록을 열면 꺼진다
export function NotificationBell({ hasUnread, open, panelId, onClick, ref }: NotificationBellProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={hasUnread ? "보낸 보고 알림, 새 알림 있음" : "보낸 보고 알림"}
      className="relative grid size-11 place-items-center rounded-full text-fg active:bg-surface"
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <path
          d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {hasUnread && <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-out ring-2 ring-bg" />}
    </button>
  );
}
