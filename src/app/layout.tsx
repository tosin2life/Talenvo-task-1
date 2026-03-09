import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreHydration } from "@/components/StoreHydration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collaborative Knowledge Board",
  description:
    "A collaborative workspace for managing ideas, documentation, and execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <nav className="flex items-center gap-3 border-b border-white/10 bg-indigo-700 px-4 py-3">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white hover:text-blue-200 transition-colors"
          >
            Knowledge Board
          </Link>
        </nav>
        <StoreHydration>{children}</StoreHydration>
      </body>
    </html>
  );
}

