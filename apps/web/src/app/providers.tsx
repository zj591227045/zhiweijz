'use client';

import { Providers } from "@zhiweijz/web";
import { Toaster } from "sonner";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
      <Toaster position="top-center" />
    </Providers>
  );
}
