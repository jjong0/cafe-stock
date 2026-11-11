"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";

const TABS = [
  { href: "/owner", label: "미처리 이슈" },
  { href: "/owner/stats", label: "통계" },
] as const;

export function OwnerTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="사장님 메뉴" className="border-b border-line">
      <div className="mx-auto flex w-full max-w-4xl gap-5 px-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "-mb-px border-b-2 py-3 text-[15px] transition-colors",
                active ? "border-fg font-semibold text-fg" : "border-transparent text-fg-weak hover:text-fg",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
