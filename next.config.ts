import type { NextConfig } from "next";

// 모든 응답에 붙이는 보안 헤더. 다른 사이트가 iframe으로 감싸 버튼을 누르게 하는 클릭재킹 등을 막는다.
// 스크립트 출처까지 제한하는 전체 CSP는 Next.js 인라인 스크립트에 nonce가 필요해 여기서는 frame-ancestors만 둔다
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
