import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/auth/auth-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "只为记账 - 简单、高效的个人财务管理工具",
  description: "只为记账是一款简单、高效的个人财务管理工具，帮助您轻松管理个人和家庭财务。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
