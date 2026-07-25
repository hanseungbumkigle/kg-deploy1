import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "나와 닮은 코코비 캐릭터 찾기",
  description: "간단한 질문에 답하면 당신과 꼭 닮은 코코비 캐릭터를 찾아드려요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
