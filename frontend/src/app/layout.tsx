import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Shippori_Mincho_B1,
  Zen_Kaku_Gothic_New,
} from "next/font/google";
import "./globals.css";

const display = Shippori_Mincho_B1({
  variable: "--font-display",
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  preload: false,
});

const body = Zen_Kaku_Gothic_New({
  variable: "--font-body",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "scheduler — 時間帯まで決める日程調整",
  description:
    "日付×時間のマス目で予定を出し合う、会議日程調整アプリ。30分単位で参加可能な時間を集約します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
