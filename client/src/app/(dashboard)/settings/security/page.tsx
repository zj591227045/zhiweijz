"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { SecurityPage } from "@/components/security/security-page";
import { useSecurityStore } from "@/store/security-store";

export default function AccountSecurityPage() {
  const { fetchSecurity } = useSecurityStore();

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  return (
    <PageContainer 
      title="账户安全" 
      showBackButton={true}
      activeNavItem="profile"
    >
      <SecurityPage />
    </PageContainer>
  );
}
