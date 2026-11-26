import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_ACCENT_COOKIE, THEME_MODE_COOKIE } from "@/lib/workspace-settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bug Tracking",
  description: "Private multi-project workbench and quick bug tracker",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const themeMode = cookieStore.get(THEME_MODE_COOKIE)?.value || "system";
  const themeAccent = cookieStore.get(THEME_ACCENT_COOKIE)?.value || "slate";
  const isExplicitDark = themeMode === "dark";

  return (
    <html
      lang="en"
      data-theme={themeMode}
      data-accent={themeAccent}
      className={`${geistSans.variable} ${geistMono.variable} ${isExplicitDark ? "dark" : ""} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
