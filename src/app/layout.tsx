import type { Metadata } from "next";
import Link from "next/link";
import { Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { StoreHydration } from "@/components/StoreHydration";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const montserrat = Montserrat({
  variable: "--font-montserrat",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('knowledge-board-theme');document.documentElement.setAttribute('data-theme',(t==='light'||t==='dark')?t:'light');})();`,
          }}
        />
        <nav className="flex items-center justify-between gap-3 border-b border-white/10 bg-indigo-700 px-4 py-3">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white hover:text-blue-200 transition-colors"
          >
            Knowledge Board
          </Link>
          <ThemeToggle />
        </nav>
        <ErrorBoundary>
          <StoreHydration>{children}</StoreHydration>
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
