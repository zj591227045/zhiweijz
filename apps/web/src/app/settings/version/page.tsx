'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { VersionCheckSettings } from '@/components/settings/VersionCheckSettings';

export default function VersionSettingsPage() {
  return (
    <PageContainer
      title="版本管理"
      showHeader={true}
      showBottomNav={true}
      activeNavItem="settings"
      className="pb-6"
    >
      <div className="max-w-2xl mx-auto">
        <VersionCheckSettings />
      </div>
    </PageContainer>
  );
}
