// 서버에서 이슈를 불러오는 동안 같은 자리에 같은 높이로 보여 레이아웃이 밀리지 않게 한다
export function IssueListSkeleton() {
  return (
    <div aria-busy="true" aria-label="이슈를 불러오는 중" className="mx-auto w-full max-w-4xl px-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-md bg-surface" />
        <div className="h-10 w-72 rounded-xl bg-surface" />
      </div>
      <ul className="mt-4">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex h-[88px] items-center justify-between border-b border-line">
            <div className="h-5 w-40 animate-pulse rounded bg-surface" />
            <div className="h-10 w-44 animate-pulse rounded-lg bg-surface" />
          </li>
        ))}
      </ul>
    </div>
  );
}
