import { NextResponse, type NextRequest } from "next/server";
import { IssueFilterSchema } from "@/features/issues/schemas";
import { listIssues } from "@/features/issues/server";
import { handleRouteError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const filter = IssueFilterSchema.parse(request.nextUrl.searchParams.get("status") ?? undefined);
    const issues = await listIssues(sessionId, filter);
    return NextResponse.json({ issues });
  } catch (err) {
    return handleRouteError(err);
  }
}
