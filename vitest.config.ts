import { defineConfig } from "vitest/config";

export default defineConfig({
  // 앱 코드와 같은 @/ 경로 별칭을 tsconfig에서 그대로 읽는다
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
