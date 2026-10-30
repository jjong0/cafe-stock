import { NextResponse } from "next/server";
import { IssueActionSchema, IssueIdSchema } from "@/features/issues/schemas";
import { transitionIssue } from "@/features/issues/server";
import { handleRouteError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";

export async function PATCH(request: Request, ctx: RouteContext<"/api/issues/[id]">) {
  try {
    const sessionId = await getSessionId();
    const issueId = IssueIdSchema.parse((await ctx.params).id);
    const { action } = IssueActionSchema.parse(await request.json());
    const issue = await transitionIssue(sessionId, issueId, action);
    return NextResponse.json({ issue });
  } catch (err) {
    return handleRouteError(err);
  }
}
