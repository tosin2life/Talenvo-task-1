import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { StoreHydration } from "@/components/StoreHydration";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ui/Toast";
import { NavBar } from "@/components/NavBar";

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
        <NavBar />
        <ErrorBoundary>
          <StoreHydration>{children}</StoreHydration>
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
