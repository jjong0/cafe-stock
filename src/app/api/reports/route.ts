import { NextResponse } from "next/server";
import { SubmitReportsSchema } from "@/features/report/schemas";
import { assertActiveItems, submitReports } from "@/features/report/server";
import { handleRouteError } from "@/lib/errors";
import { checkReportRateLimit } from "@/lib/rate-limit";
import { getSessionId } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionId = await getSessionId();
    const input = SubmitReportsSchema.parse(await request.json());
    await assertActiveItems(input.entries.map((entry) => entry.itemId));
    await checkReportRateLimit(sessionId);
    const issues = await submitReports(sessionId, input);
    return NextResponse.json({ issues }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
