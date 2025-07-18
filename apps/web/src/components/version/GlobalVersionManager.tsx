import React, { useEffect, useState } from 'react';
import { VersionManager } from '@/components/version/VersionManager';
import { usePathname } from 'next/navigation';

interface GlobalVersionManagerProps {
  enabled?: boolean;
  autoCheckInterval?: number;
  onVersionChecked?: (hasUpdate: boolean) => void;
}

export function GlobalVersionManager({ 
  enabled = true, 
  autoCheckInterval = 60 * 60 * 1000, // 1小时
  onVersionChecked
}: GlobalVersionManagerProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [currentBuildNumber, setCurrentBuildNumber] = useState(1);
  const pathname = usePathname();

  useEffect(() => {
    // 检查是否在管理端
    setIsAdmin(pathname.startsWith('/admin'));
    
    // 获取当前版本信息
    if (typeof window !== 'undefined') {
      // 优先从环境变量获取
      const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
      const buildNumber = parseInt(process.env.NEXT_PUBLIC_BUILD_NUMBER || '1');
      
      setCurrentVersion(version);
      setCurrentBuildNumber(buildNumber);
      
      // 如果是Capacitor环境，尝试获取原生应用信息
      if (window.Capacitor?.Plugins?.App) {
        window.Capacitor.Plugins.App.getInfo().then((info: any) => {
          setCurrentVersion(info.version);
          setCurrentBuildNumber(parseInt(info.build));
        }).catch(() => {
          // 如果获取失败，使用默认值
          console.warn('Failed to get app info from Capacitor');
        });
      }
    }
  }, [pathname]);

  if (!enabled) {
    return null;
  }

  return (
    <VersionManager
      currentVersion={currentVersion}
      currentBuildNumber={currentBuildNumber}
      isAdmin={isAdmin}
      autoCheck={true}
      checkInterval={autoCheckInterval}
      onVersionChecked={onVersionChecked}
    />
  );
}