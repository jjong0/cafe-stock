"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";

const ROLES = [
  { href: "/staff", label: "직원", match: (path: string) => path.startsWith("/staff") },
  { href: "/owner", label: "사장님", match: (path: string) => path.startsWith("/owner") },
] as const;

// 로그인 없는 데모라 역할을 상단 토글로 바꾼다(설계 2절)
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-[15px] font-bold">
          카페 재고 보고
        </Link>
        <nav aria-label="역할 전환" className="flex gap-1 rounded-lg bg-surface p-0.5">
          {ROLES.map((role) => {
            const active = role.match(pathname);
            return (
              <Link
                key={role.href}
                href={role.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "rounded-md px-3 py-1 text-[14px] transition-colors",
                  active ? "bg-bg font-semibold text-fg shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-fg-weak hover:text-fg",
                )}
              >
                {role.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
