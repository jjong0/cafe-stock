import { NextResponse } from "next/server";
import { getItemsWithOpenIssues } from "@/features/report/server";
import { handleRouteError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const items = await getItemsWithOpenIssues(sessionId);
    return NextResponse.json({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
