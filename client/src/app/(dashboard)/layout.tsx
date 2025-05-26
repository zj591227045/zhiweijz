"use client";

import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  );
}
