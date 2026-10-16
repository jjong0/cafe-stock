// 공용 시드 데이터(session_id = null) 생성. 재실행하면 시드 보고·이슈만 지우고 다시 만든다.
// 실행: npm run seed
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Category = "bean_milk" | "syrup_sauce" | "supplies" | "dessert";
type Level = "low" | "out";

const ITEM_NAMES: Record<Category, string[]> = {
  bean_milk: ["우유", "오트우유", "저지방우유", "원두(블렌드)", "원두(싱글오리진)", "원두(디카페인)", "생크림"],
  syrup_sauce: ["바닐라시럽", "헤이즐넛시럽", "카라멜시럽", "초코소스", "카라멜소스", "연유"],
  supplies: ["아이스컵(L)", "아이스컵(M)", "핫컵", "컵뚜껑", "컵홀더", "빨대", "캐리어"],
  dessert: ["크로플 생지", "베이글", "치즈케이크", "쿠키", "마들렌"],
};

// 방문자 세션 데이터가 품목을 참조하므로, 재실행해도 품목 ID가 바뀌지 않게 이름에서 만든다
function stableUuid(name: string): string {
  const b = createHash("sha1").update(`cafe-stock:item:${name}`).digest();
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.subarray(0, 16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// 재실행해도 같은 패턴이 나오도록 고정 시드 난수를 쓴다
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261016);
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];

const HOUR = 60 * 60 * 1000;
const KST_OFFSET = 9 * HOUR;
const REPORTERS = ["직원A", "직원B", "직원C"] as const;
const MEMOS = ["오후 피크 전에 부탁드려요", "내일 오전분까지 부족해요", "창고에도 없어요"] as const;

const items = Object.entries(ITEM_NAMES).flatMap(([category, names]) =>
  names.map((name, i) => ({ id: stableUuid(name), name, category, sort_order: i, active: true })),
);
const itemId = (name: string) => {
  const item = items.find((it) => it.name === name);
  if (!item) throw new Error(`unknown item: ${name}`);
  return item.id;
};

type IssueRow = {
  id: string;
  session_id: null;
  item_id: string;
  level: Level;
  status: "resolved";
  opened_at: string;
  acknowledged_at: string;
  resolved_at: string;
};
type ReportRow = {
  session_id: null;
  issue_id: string;
  item_id: string;
  level: Level;
  reporter_name: string;
  memo: string | null;
  created_at: string;
};

const issues: IssueRow[] = [];
const reports: ReportRow[] = [];

type IssuePlan = { item: string; levels: Level[]; resolveHours: [number, number] };

// dayStartUtc: 한국 시간 기준 그날 0시의 UTC 시각
function addIssue(dayStartUtc: number, plan: IssuePlan) {
  const openedMs = dayStartUtc + between(8, 19) * HOUR; // 영업시간 중 보고
  const resolvedMs = openedMs + between(...plan.resolveHours) * HOUR;
  // 시드 이슈는 모두 처리완료여야 하므로 처리 시각이 미래가 되는 이슈는 만들지 않는다
  if (resolvedMs > Date.now()) return;
  const ackMs = openedMs + between(0.1, 0.3) * (resolvedMs - openedMs);
  const id = randomUUID();

  issues.push({
    id,
    session_id: null,
    item_id: itemId(plan.item),
    level: plan.levels.includes("out") ? "out" : "low",
    status: "resolved",
    opened_at: new Date(openedMs).toISOString(),
    acknowledged_at: new Date(ackMs).toISOString(),
    resolved_at: new Date(resolvedMs).toISOString(),
  });

  // 첫 보고는 이슈가 열린 시각, 이후 중복 보고는 처리 전에 들어온다
  plan.levels.forEach((level, i) => {
    const createdMs = i === 0 ? openedMs : between(openedMs, resolvedMs - 0.1 * HOUR);
    reports.push({
      session_id: null,
      issue_id: id,
      item_id: itemId(plan.item),
      level,
      reporter_name: pick(REPORTERS),
      memo: rand() < 0.2 ? pick(MEMOS) : null,
      created_at: new Date(createdMs).toISOString(),
    });
  });
}

const repeat = (level: Level, min: number, max: number): Level[] => Array(intBetween(min, max)).fill(level);
const OTHER_ITEMS = items.map((it) => it.name).filter((n) => !["우유", "바닐라시럽", "컵홀더"].includes(n));

const nowKst = new Date(Date.now() + KST_OFFSET);
const todayStartUtc = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate()) - KST_OFFSET;

// 컵홀더는 처리가 1~2일 걸리므로 이전 이슈가 끝난 뒤에만 연다
let cupHolderFreeAt = 0;

// 오늘은 제외: 시드 이슈는 모두 처리완료여야 하는데 오늘 열린 이슈는 아직 처리 전일 수 있다
for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
  const dayStartUtc = todayStartUtc - daysAgo * 24 * HOUR;
  const weekday = new Date(dayStartUtc + KST_OFFSET).getUTCDay(); // 0 = 일요일
  const isWeekend = weekday === 0 || weekday === 6;

  // 우유: 주말 품절 집중
  if (isWeekend ? rand() < 0.9 : rand() < 0.15) {
    const levels: Level[] = isWeekend ? ["low", ...repeat("out", 2, 3)] : repeat("low", 1, 2);
    addIssue(dayStartUtc, { item: "우유", levels, resolveHours: [1, 4] });
  }

  // 바닐라시럽: 주 2~3회 반복 부족. 확률만 쓰면 주마다 편차가 커서 화·금은 고정으로 둔다
  if (weekday === 2 || weekday === 5 || rand() < 0.1) {
    addIssue(dayStartUtc, { item: "바닐라시럽", levels: repeat("low", 2, 3), resolveHours: [2, 6] });
  }

  // 컵홀더: 처리 시간이 긴 편
  if (dayStartUtc >= cupHolderFreeAt && rand() < 0.35) {
    addIssue(dayStartUtc, { item: "컵홀더", levels: repeat("low", 1, 3), resolveHours: [24, 48] });
    cupHolderFreeAt = dayStartUtc + 3 * 24 * HOUR;
  }

  for (const item of OTHER_ITEMS) {
    if (rand() < 0.075) {
      const levels: Level[] = rand() < 0.25 ? ["out"] : repeat("low", 1, 2);
      addIssue(dayStartUtc, { item, levels, resolveHours: [1, 6] });
    }
  }
}

async function run() {
  const { error: itemsError } = await supabase.from("items").upsert(items);
  if (itemsError) throw itemsError;

  // 보고가 이슈를 참조하므로 보고부터 지운다
  const { error: delReportsError } = await supabase.from("stock_reports").delete().is("session_id", null);
  if (delReportsError) throw delReportsError;
  const { error: delIssuesError } = await supabase.from("stock_issues").delete().is("session_id", null);
  if (delIssuesError) throw delIssuesError;

  const { error: issuesError } = await supabase.from("stock_issues").insert(issues);
  if (issuesError) throw issuesError;
  const { error: reportsError } = await supabase.from("stock_reports").insert(reports);
  if (reportsError) throw reportsError;

  console.log(`items ${items.length}, issues ${issues.length}, reports ${reports.length}`);
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
