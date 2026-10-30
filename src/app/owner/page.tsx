import type { Metadata } from "next";
import { Suspense } from "react";
import { IssueListSkeleton } from "@/features/issues/components/IssueListSkeleton";
import { OwnerIssuesView } from "@/features/issues/components/OwnerIssuesView";
import { listIssues } from "@/features/issues/server";
import { getSessionId } from "@/lib/session";

export const metadata: Metadata = { title: "미처리 이슈 · 사장님" };

export default function OwnerPage() {
  return (
    <main className="flex-1">
      <Suspense fallback={<IssueListSkeleton />}>
        <OwnerIssues />
      </Suspense>
    </main>
  );
}

// 세션 쿠키와 DB를 읽는 요청 시점 데이터라 Suspense 안에서 렌더링한다(Cache Components 규칙)
async function OwnerIssues() {
  const sessionId = await getSessionId();
  const issues = await listIssues(sessionId, "all");
  // 경과 시간을 서버와 브라우저가 같은 기준으로 그리도록 기준 시각을 넘긴다.
  // 서버 컴포넌트는 요청마다 한 번만 렌더링되므로 여기서 시각을 읽어도 결과가 흔들리지 않는다
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <OwnerIssuesView initialIssues={issues} serverNow={serverNow} />;
}
