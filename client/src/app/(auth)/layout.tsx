"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";

function AuthLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard requireAuth={false}>
      {children}
    </AuthGuard>
  );
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={null}>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </Suspense>
  );
}
