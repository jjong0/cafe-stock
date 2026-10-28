import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "카페 재고 보고",
  description: "떨어진 재고를 버튼으로 보고하고, 사장님이 한눈에 확인합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
