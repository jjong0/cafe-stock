import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, isValidSessionId } from "@/lib/session";

// 방문자별로 데이터를 분리하기 위한 익명 세션 쿠키를 발급한다
export function proxy(request: NextRequest) {
  if (isValidSessionId(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const sessionId = crypto.randomUUID();
  // 응답 쿠키만 설정하면 첫 요청의 페이지·API는 쿠키를 보지 못하므로 요청에도 넣어 전달한다
  request.cookies.set(SESSION_COOKIE, sessionId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
