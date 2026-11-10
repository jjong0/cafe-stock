import type { Metadata } from "next";
import { StatsView } from "@/features/stats/components/StatsView";

export const metadata: Metadata = { title: "재고 통계 · 사장님" };

export default function StatsPage() {
  return (
    <main className="flex-1">
      <StatsView />
    </main>
  );
}
