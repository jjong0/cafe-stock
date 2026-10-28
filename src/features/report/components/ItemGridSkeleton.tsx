// 서버에서 품목을 불러오는 동안 같은 자리에 같은 크기로 보여 레이아웃이 밀리지 않게 한다
export function ItemGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="품목을 불러오는 중" className="mx-auto w-full max-w-xl px-4">
      <div className="flex items-end justify-between pt-6 pb-4">
        <div className="h-8 w-28 rounded-md bg-steel-deep" />
        <div className="h-10 w-48 rounded-xl bg-steel-deep" />
      </div>
      <div className="my-2 h-13 rounded-xl bg-steel-deep" />
      <ul className="grid grid-cols-2 gap-2.5 pt-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="min-h-28 animate-pulse rounded-xl bg-counter/60" />
        ))}
      </ul>
    </div>
  );
}
