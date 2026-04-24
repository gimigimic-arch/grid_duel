import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GRID DUEL",
  description: "トランプ × 3×3 制圧カードゲーム",
  openGraph: {
    title: "GRID DUEL",
    description: "トランプ × 3×3 制圧カードゲーム",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GRID DUEL",
    description: "トランプ × 3×3 制圧カードゲーム",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950">{children}</body>
    </html>
  );
}
