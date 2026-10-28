// 서버에서 품목을 불러오는 동안 같은 자리에 같은 높이로 보여 레이아웃이 밀리지 않게 한다
export function ItemListSkeleton() {
  return (
    <div aria-busy="true" aria-label="품목을 불러오는 중" className="mx-auto w-full max-w-xl px-4">
      <div className="flex items-center justify-between pt-5 pb-2">
        <div className="h-7 w-24 rounded-md bg-surface" />
        <div className="h-9 w-32 rounded-lg bg-surface" />
      </div>
      <div className="h-12 border-b border-line" />
      <ul>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex min-h-[68px] items-center justify-between border-b border-line">
            <div className="h-5 w-28 animate-pulse rounded bg-surface" />
            <div className="h-10 w-[126px] animate-pulse rounded-lg bg-surface" />
          </li>
        ))}
      </ul>
    </div>
  );
}
