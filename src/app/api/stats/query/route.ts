import { NextResponse } from "next/server";
import { z } from "zod";
import { runStatsQuery } from "@/features/stats/query";
import { handleRouteError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";

const QuerySchema = z.object({ question: z.string().trim().min(1).max(200) });

// 호출 제한은 AI로 해석할 때만 runStatsQuery 안에서 센다. 추천 질문은 AI를 부르지 않아 차감하지 않는다
export async function POST(request: Request) {
  try {
    const sessionId = await getSessionId();
    const { question } = QuerySchema.parse(await request.json());
    return NextResponse.json(await runStatsQuery(sessionId, question));
  } catch (err) {
    return handleRouteError(err);
  }
}
