import Link from "next/link";

const PROBLEMS = [
  { before: "단톡방 메시지가 대화에 묻혀 놓친다", after: "미처리 이슈가 목록으로 남고, 오래 방치된 건 빨간색으로 보인다" },
  { before: "같은 품목을 여러 직원이 중복 보고한다", after: "같은 품목 보고는 하나의 이슈로 합쳐지고 보고 횟수만 늘어난다" },
  { before: "사장님이 확인했는지 알 수 없다", after: "직원 화면에 '사장님 확인함'이 표시된다" },
  { before: "자주 떨어지는 품목이 기록으로 남지 않는다", after: "질문 한 줄로 품목별·요일별 통계를 차트로 본다" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-12 pb-20">
      <h1 className="text-[28px] font-bold leading-snug sm:text-[34px]">
        단톡방 대신,
        <br />
        버튼으로 재고 보고
      </h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-fg-sub">
        직원은 떨어진 품목을 버튼으로 보고하고, 사장님은 정리된 목록과 AI 브리핑으로 확인합니다.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <RoleCard
          href="/staff"
          title="직원으로 보고하기"
          points={["품목마다 부족·품절을 한 번에 선택", "여러 품목을 모아 메모와 함께 보내기", "보낸 보고의 확인 여부를 종 아이콘에서 보기"]}
        />
        <RoleCard
          href="/owner"
          title="사장님으로 확인하기"
          points={["미처리 이슈를 확인·처리완료로 정리", "AI 브리핑으로 먼저 처리할 품목 보기", "자연어 질문으로 통계 차트 보기"]}
        />
      </div>

      <section aria-labelledby="why" className="mt-14">
        <h2 id="why" className="text-[19px] font-bold">
          단톡방 보고에서 바뀌는 것
        </h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {PROBLEMS.map((problem) => (
            <li key={problem.before} className="grid gap-1 py-4 sm:grid-cols-2 sm:gap-6">
              <p className="text-[15px] text-fg-weak line-through decoration-fg-weak/40">{problem.before}</p>
              <p className="text-[15px]">{problem.after}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="demo" className="mt-14 rounded-2xl bg-surface p-5 text-[14px] leading-relaxed text-fg-sub">
        <h2 id="demo" className="text-[15px] font-semibold text-fg">
          데모 안내
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>로그인 없이 위 버튼으로 역할을 바꿔 가며 써 볼 수 있습니다.</li>
          <li>보낸 보고와 처리 기록은 이 브라우저에서만 보입니다. 다른 방문자와 섞이지 않습니다.</li>
          <li>통계에는 지난 30일치 예시 데이터가 함께 들어 있습니다.</li>
          <li>AI(Gemini)는 문장과 질문 해석만 맡고, 보고 수 같은 숫자는 모두 서버가 기록에서 계산합니다.</li>
        </ul>
      </section>
    </main>
  );
}

function RoleCard({ href, title, points }: { href: string; title: string; points: readonly string[] }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line p-5 transition-colors hover:border-fg/30 hover:bg-surface/50">
      <p className="flex items-center justify-between text-[17px] font-bold">
        {title}
        <span aria-hidden className="text-fg-weak transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </p>
      <ul className="mt-3 space-y-1.5 text-[14px] text-fg-sub">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </Link>
  );
}
