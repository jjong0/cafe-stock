import type { Metadata } from "next";
import { Do_Hyeon, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

// 한글 글리프는 unicode-range로 필요할 때 받으므로 latin만 preload한다
const display = Do_Hyeon({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-do-hyeon",
});

const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex-sans-kr",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "카페 재고 보고",
  description: "떨어진 재고를 버튼으로 보고하고, 사장님이 한눈에 확인합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
