import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ガムトーク おだいボックス",
  description: "ライトニングトーク会用お題箱アプリケーション",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
