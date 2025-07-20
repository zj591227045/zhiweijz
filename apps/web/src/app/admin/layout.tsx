'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { EnhancedVersionProvider } from '@/components/version/EnhancedVersionProvider';
import { AutoVersionChecker } from '@/components/version/AutoVersionChecker';
import MobileNotSupported from '@/components/admin/MobileNotSupported';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  // 如果是登录页面，只包裹AuthGuard但不显示布局
  if (pathname === '/admin/login') {
    return <AdminAuthGuard>{children}</AdminAuthGuard>;
  }

  return (
    <AdminAuthGuard>
      <EnhancedVersionProvider
        enabled={true}
        autoCheck={true}
        checkInterval={12 * 60 * 60 * 1000} // 管理端12小时检查一次
        checkOnLogin={true}
        checkOnVisibilityChange={true}
        showIndicator={true}
        showNetworkStatus={true}
        indicatorPosition="top-right"
        onUpdateAvailable={(updateInfo) => {
          console.log('[Admin] 发现新版本:', updateInfo.latestVersion?.version);
        }}
      >
        <div className="flex h-screen bg-gray-50">
          {/* 侧边栏 */}
          <AdminSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isMobile={isMobile}
          />

          {/* 主要内容区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部头部 */}
            <AdminHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} isMobile={isMobile} />

            {/* 内容区域 */}
            <main className="flex-1 overflow-y-auto">
              <div className="p-6">{children}</div>
            </main>
          </div>

          {/* 移动端遮罩层 */}
          {isMobile && isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </div>

        {/* 管理端版本检查器 */}
        <AutoVersionChecker
          checkOnMount={true}
          checkOnLogin={true}
          checkOnFocus={true}
          checkOnVisibilityChange={true}
          checkOnNetworkReconnect={true}
          checkInterval={12 * 60 * 60 * 1000} // 12小时
          minCheckInterval={10 * 60 * 1000} // 10分钟最小间隔
          debug={process.env.NODE_ENV === 'development'}
          onCheckTriggered={(reason) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Admin] 版本检查触发:', reason);
            }
          }}
        />
      </EnhancedVersionProvider>
    </AdminAuthGuard>
  );
}
