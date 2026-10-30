# 설계 문서 — 카페 재고 부족 보고 서비스

## 1. 배경과 목표

**현재 방식**: 직원이 재고가 부족하거나 없는 품목을 단톡방에 올리고 사장님이 확인한다.

**문제**
- 메시지가 대화에 묻혀 놓친다
- 같은 품목을 여러 직원이 중복 보고한다
- 사장님이 확인·처리했는지 상태를 알 수 없다
- 어떤 품목이 자주 떨어지는지 기록이 남지 않는다

**해결**
- 직원: 품목·상태를 **버튼으로** 빠르고 정확하게 보고 (AI 없음)
- 사장님: **AI 일일 브리핑**과 **자연어 통계**로 정리된 정보를 확인

**AI 배치 원칙**
- 입력 단계는 버튼이 더 빠르고 정확하므로 AI를 쓰지 않는다.
- AI는 정보를 소비하는 쪽(요약, 우선순위, 질문 해석)에만 둔다.
- AI는 제안만 하고, 숫자와 사실은 코드가 DB에서 계산한다.

**범위 밖**: 발주(주문 수량 추천, 주문서 작성), 로그인·권한 관리.

## 2. 사용자와 화면

데모에서는 로그인 없이 상단 토글로 **직원 / 사장님** 역할을 전환한다.

### 직원 화면 `/staff` (모바일 우선)
- 카테고리 탭: 원두·우유 / 시럽·소스 / 컵·부자재 / 디저트
- 품목 버튼 그리드. 열린 이슈가 있는 품목은 "부족" 또는 "품절" 배지 표시
- 품목 선택 → 부족 / 품절 선택 → 하단 바에 선택 목록 누적 → 메모(선택) → 제출
- 보고자 이름은 데모용 선택식 (직원A, 직원B, 직원C)
- 제출 성공 시 토스트, 선택 목록 초기화, 배지 갱신

### 사장님 화면 `/owner` (데스크톱 우선)
- 상단: AI 브리핑 카드 (생성 버튼, 마지막 생성 시각, 로딩 시 스켈레톤)
- 브리핑의 우선순위 항목 클릭 시 해당 이슈로 스크롤
- 본문: 미처리 이슈 목록 (품목명, 단계, 보고 횟수, 최초 보고 시각, 경과 시간, 보고 내역 펼치기)
- 이슈별 버튼: 확인 → 처리완료
- 필터: 전체 / 미확인 / 확인됨

### 통계 화면 `/owner/stats`
- 자연어 질문 입력 + 추천 질문 칩
  - "이번 달 가장 자주 떨어진 품목은?"
  - "요일별 품절 횟수 보여줘"
  - "카테고리별 평균 처리 시간은?"
- 차트와 함께 질문 해석 결과 표시 (예: "최근 30일 · 품목별 · 보고 횟수 · 상위 5개")
- 지원하지 않는 질문은 이유와 추천 질문 안내

## 3. 도메인 모델

### 보고(report)와 이슈(issue)
- **보고**: 직원이 버튼을 눌러 제출한 개별 기록
- **이슈**: 품목별로 "현재 처리가 필요한 상태" 하나

### 규칙
1. 품목에 미처리(`open` 또는 `acknowledged`) 이슈가 있으면 새 보고는 그 이슈에 연결된다 → 중복 보고 병합
2. 미처리 이슈가 없으면 새 이슈를 생성한다
3. `low` 이슈에 `out` 보고가 들어오면 이슈 단계를 `out`으로 올린다. 반대로 내리지는 않는다
4. 상태 흐름: `open → acknowledged → resolved` (역방향 전이 없음)
5. `resolved` 이후 새 보고는 새 이슈를 만든다

## 4. 공개 데모 구조

- 첫 방문 시 `src/proxy.ts`에서 익명 `session_id` 쿠키(httpOnly, 30일) 발급
- 방문자가 만든 보고·이슈·브리핑은 `session_id`로 분리 → 방문자끼리 데이터가 섞이지 않음
- 공용 시드 데이터는 `session_id = null`, 읽기 전용
- 화면과 통계는 **시드 데이터 + 현재 세션 데이터**를 합쳐 보여준다
- 단, 미처리 이슈 목록과 병합 규칙은 **현재 세션 데이터만** 대상으로 한다 (시드의 과거 이슈는 모두 `resolved`)

## 5. DB 스키마 (Supabase)

```sql
create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('bean_milk','syrup_sauce','supplies','dessert')),
  sort_order int not null default 0,
  active boolean not null default true
);

create table stock_issues (
  id uuid primary key default gen_random_uuid(),
  session_id text,                       -- null = 공용 시드 데이터
  item_id uuid not null references items(id),
  level text not null check (level in ('low','out')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  opened_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- 세션·품목당 미처리 이슈는 하나만
create unique index one_open_issue
  on stock_issues (coalesce(session_id, ''), item_id)
  where status <> 'resolved';

create table stock_reports (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  issue_id uuid not null references stock_issues(id),
  item_id uuid not null references items(id),
  level text not null check (level in ('low','out')),
  reporter_name text not null,
  memo text,
  created_at timestamptz not null default now()
);
create index on stock_reports (session_id, created_at);
create index on stock_reports (item_id, created_at);

create table briefings (
  session_id text not null,
  facts_hash text not null,              -- 입력 데이터가 같으면 재생성하지 않음
  content jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (session_id, facts_hash)
);

create table api_usage (
  key text not null,                     -- 용도별 키, 6절 참고
  day date not null,
  count int not null default 0,
  primary key (key, day)
);
```

### 보안
- 모든 테이블 RLS 활성화, anon·authenticated 정책 없음 (전부 차단)
- DB 접근은 Next.js 서버에서 service role 키로만

### Postgres 함수 (RPC)
- `submit_reports(p_session_id, p_reporter_name, p_entries jsonb, p_memo)`
  - 한 트랜잭션에서 entries마다: 미처리 이슈 조회(`for update`) → 없으면 생성, `low`→`out` 상향 → 보고 삽입
  - 동시 제출 시 이슈 중복 생성을 막는 것이 목적
- `increment_usage(p_key, p_day, p_limit)` → 증가 후 `count <= limit`이면 true
  - 세션 키와 global 키를 모두 확인

## 6. 호출 제한

| 대상 | 한도 | `api_usage.key` |
|---|---|---|
| 세션당 AI 호출 | 하루 20회 | `ai:session:<id>` |
| 전체 AI 호출 | 하루 500회 | `ai:global` |
| 세션당 보고 제출 | 하루 100회 | `report:session:<id>` |

- 키는 용도별로 나눈다. 세션 키를 하나로 쓰면 보고 제출이 AI 호출 한도를 함께 소진한다

- 전체 한도가 실제 비용 보호 장치 (세션 쿠키는 삭제하면 초기화되므로)
- 초과 시 `429` + `{ error: { code: 'RATE_LIMITED', message } }`
- 브리핑 캐시 적중 시에는 호출 횟수를 차감하지 않는다

## 7. AI ① 일일 브리핑

### 흐름
1. 코드가 facts를 집계한다
   - 미처리 이슈: `itemId`, 품목명, 단계, 보고 수, 경과 시간(시간 단위)
   - 반복 품목: 최근 7일 보고가 3회 이상인 품목과 횟수
   - 오늘 처리완료된 품목
2. facts를 정렬된 JSON으로 만들어 해시 → `briefings` 캐시 조회 → 있으면 반환
3. 없으면 호출 제한 확인 → Claude 호출 (`generateObject` + 스키마)
4. 검증: Zod 통과 + **모든 `itemId`가 facts에 존재**하는지 확인. 없는 항목은 제거. Zod 실패 시 1회 재시도, 그래도 실패하면 오류 응답
5. 저장 후 반환. 화면의 품목명은 DB 값으로 표시

### 출력 스키마
```ts
const BriefingSchema = z.object({
  summary: z.string().max(200),
  priorities: z
    .array(z.object({ itemId: z.string().uuid(), reason: z.string().max(80) }))
    .max(5),
  recurring: z
    .array(z.object({ itemId: z.string().uuid(), note: z.string().max(80) }))
    .max(3),
});
```

### 프롬프트 원칙
- facts에 있는 정보만 사용, 추측 금지
- 우선순위 기준: 품절 > 부족, 경과 시간이 긴 순, 보고 수가 많은 순
- 발주 수량이나 주문 제안 금지
- 미처리 이슈가 없으면 summary에 그 사실만 쓰고 배열은 비움

### 설계 판단
- 스트리밍 대신 구조화 응답 + 스켈레톤 UI: 우선순위 항목을 클릭 가능한 UI로 쓰려면 완성된 JSON이 필요
- facts 해시 캐시: 데이터 변화가 없으면 재호출하지 않아 비용 절감

## 8. AI ② 자연어 통계

### 흐름
1. 질문 + 오늘 날짜 + 품목 목록(id, 이름, 카테고리)을 Claude에 전달
2. `ChartSpec` 반환 → Zod 검증, `itemIds`가 실제 품목인지 확인
3. `supported: false`면 이유와 추천 질문 반환
4. 서버 코드가 spec대로 집계 (`src/features/stats/aggregate.ts`)
5. `{ spec, data }` 반환 → 클라이언트에서 Recharts 렌더링

### 스키마
```ts
const ChartSpecSchema = z.discriminatedUnion('supported', [
  z.object({
    supported: z.literal(true),
    metric: z.enum(['report_count', 'out_count', 'avg_resolve_hours']),
    groupBy: z.enum(['item', 'category', 'weekday', 'date']),
    dateRange: z.object({ from: z.string(), to: z.string() }), // YYYY-MM-DD
    itemIds: z.array(z.string().uuid()).optional(),
    topN: z.number().int().min(1).max(10).optional(),
    chartType: z.enum(['bar', 'line']),
    title: z.string().max(40),
  }),
  z.object({ supported: z.literal(false), reason: z.string().max(100) }),
]);
```

### 지표 정의
- `report_count`: 기간 내 보고 수
- `out_count`: 기간 내 `level = 'out'` 보고 수
- `avg_resolve_hours`: 기간 내 `resolved` 이슈의 `resolved_at - opened_at` 평균(시간)

### 범위 제한
- 미래 예측, 발주 수량 질문은 `supported: false`
- `dateRange`는 최대 90일. 초과 시 서버에서 잘라내고 해석 결과에 표시

## 9. API 라우트

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/api/items` | — | 품목 목록 + 현재 세션의 미처리 이슈 단계 |
| POST | `/api/reports` | `{ reporterName, entries: [{ itemId, level }], memo? }` | 갱신된 이슈 목록 |
| GET | `/api/issues?status=` | `status`: `open` \| `acknowledged` \| `all` | 이슈 + 보고 내역 |
| PATCH | `/api/issues/[id]` | `{ action: 'acknowledge' \| 'resolve' }` | 갱신된 이슈 |
| POST | `/api/briefing` | — | `{ briefing, cached, generatedAt }` |
| POST | `/api/stats/query` | `{ question }` | `{ spec, data }` |

- 모든 라우트: 세션 쿠키 확인 → Zod 요청 검증 → 호출 제한 → 처리
- 상태 전이 위반(예: `resolved`를 `acknowledge`)은 `409`
- 다른 세션의 이슈 수정 시도는 `404`

## 10. 시드 데이터

- 품목 25개 (카테고리별 5~7개). 예: 우유, 오트우유, 원두(블렌드), 바닐라시럽, 헤이즐넛시럽, 초코소스, 연유, 아이스컵(L), 핫컵, 컵홀더, 빨대, 캐리어, 크로플 생지 등
- 지난 30일 보고 약 150건, 이슈는 모두 `resolved`
- 의도된 패턴 (통계·브리핑 데모용)
  - 우유: 주말(토·일) 품절 집중
  - 바닐라시럽: 주 2~3회 반복 부족
  - 컵홀더: 처리 시간이 긴 편
- 시드 생성 스크립트: `scripts/seed.ts` (재실행 시 시드 데이터만 지우고 다시 생성)

## 11. 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=        # 서버에서만 사용하지만 URL은 공개돼도 무방
SUPABASE_SERVICE_ROLE_KEY=       # 서버 전용, 절대 클라이언트 노출 금지
ANTHROPIC_API_KEY=               # 서버 전용
```

## 12. 폴더 구조

```
src/
├─ app/
│  ├─ layout.tsx                 # 역할 전환 헤더
│  ├─ page.tsx                   # 서비스 소개 + 역할 선택
│  ├─ staff/page.tsx
│  ├─ owner/page.tsx
│  ├─ owner/stats/page.tsx
│  └─ api/
│     ├─ items/route.ts
│     ├─ reports/route.ts
│     ├─ issues/route.ts
│     ├─ issues/[id]/route.ts
│     ├─ briefing/route.ts
│     └─ stats/query/route.ts
├─ components/
│  └─ ui/         # 기능과 무관한 재사용 UI (Button, Tabs, SegmentedControl, Tag, Toast)
├─ features/
│  ├─ report/     # 품목 그리드, 선택 바, 제출
│  ├─ issues/     # 이슈 목록, 상태 변경
│  ├─ briefing/   # facts 집계, 브리핑 카드
│  └─ stats/      # 질문 입력, aggregate.ts, 차트
├─ lib/
│  ├─ supabase/server.ts         # service role 클라이언트 (server-only)
│  ├─ supabase/database.types.ts # npm run db:types로 생성
│  ├─ ai/
│  │  ├─ client.ts
│  │  ├─ prompts.ts
│  │  └─ schemas.ts
│  ├─ session.ts
│  ├─ rate-limit.ts
│  └─ errors.ts
└─ proxy.ts                     # Next.js 16에서 middleware.ts → proxy.ts
supabase/
└─ migrations/                   # 스키마, RPC
scripts/
└─ seed.ts
docs/
└─ DESIGN.md
```

## 13. 작업 목록

한 번에 한 항목씩 진행한다. 완료하면 체크한다.

### 1주차 — 기반과 직원 화면
- [x] T1. 프로젝트 초기화 (Next.js, TS strict, Tailwind, ESLint, `typecheck` 스크립트)
- [x] T2. Supabase 마이그레이션: 테이블, 인덱스, RLS
- [x] T3. `submit_reports`, `increment_usage` RPC
- [x] T4. 시드 스크립트
- [x] T5. `lib/supabase/server.ts`, `lib/session.ts`, `proxy.ts`, `lib/errors.ts`
- [x] T6. `GET /api/items`, `POST /api/reports`
- [x] T7. 직원 화면 UI (카테고리 탭, 품목 그리드, 선택 바, 제출)

### 2주차 — 사장님 화면과 브리핑
- [x] T8. `GET /api/issues`, `PATCH /api/issues/[id]`
- [x] T9. 사장님 이슈 목록 UI (필터, 상태 변경, 보고 내역)
- [x] T10. `lib/rate-limit.ts`
- [x] T11. 브리핑 facts 집계 + 해시
- [ ] T12. `POST /api/briefing` (Claude 호출, 검증, 캐시)
- [ ] T13. 브리핑 카드 UI (스켈레톤, 오류, 우선순위 클릭 스크롤)

### 3주차 — 통계와 배포
- [ ] T14. `aggregate.ts` (지표 3종 × groupBy 4종) + 단위 테스트
- [ ] T15. `POST /api/stats/query`
- [ ] T16. 통계 화면 UI (질문 입력, 추천 칩, 해석 결과, 차트)
- [ ] T17. 역할 전환 헤더, 소개 페이지, 반응형 점검
- [ ] T18. Vercel 배포, 환경 변수, 호출 제한 실동작 확인

### 4주차 — 정리
- [ ] T19. 코드 리뷰와 리팩터링 (사용자 주도)
- [ ] T20. README (문제 정의 → AI 배치 원칙 → 설계 판단 → 트러블슈팅 → Claude Code 활용 방식)
