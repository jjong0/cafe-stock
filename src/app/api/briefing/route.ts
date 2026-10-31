import { NextResponse } from "next/server";
import { getBriefing } from "@/features/briefing/server";
import { handleRouteError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";

// 요청 본문이 없어 검증할 입력은 세션뿐이다. 호출 제한은 캐시를 확인한 뒤 getBriefing 안에서 센다
export async function POST() {
  try {
    const sessionId = await getSessionId();
    const result = await getBriefing(sessionId);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
