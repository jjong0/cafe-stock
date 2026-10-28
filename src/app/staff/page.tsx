import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemListSkeleton } from "@/features/report/components/ItemListSkeleton";
import { StaffReportView } from "@/features/report/components/StaffReportView";
import { ItemsResponseSchema } from "@/features/report/schemas";
import { getItemsWithOpenIssues } from "@/features/report/server";
import { getSessionId } from "@/lib/session";

export const metadata: Metadata = { title: "재고 보고 · 직원" };

export default function StaffPage() {
  return (
    <main className="flex-1">
      <Suspense fallback={<ItemListSkeleton />}>
        <StaffReport />
      </Suspense>
    </main>
  );
}

// 세션 쿠키와 DB를 읽는 요청 시점 데이터라 Suspense 안에서 렌더링한다(Cache Components 규칙)
async function StaffReport() {
  const sessionId = await getSessionId();
  const { items } = ItemsResponseSchema.parse({ items: await getItemsWithOpenIssues(sessionId) });
  return <StaffReportView initialItems={items} />;
}
