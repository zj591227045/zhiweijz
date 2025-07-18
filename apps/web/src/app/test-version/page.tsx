'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { versionApi } from '@/lib/api/version';
import { UrlConfigDebug } from '@/components/debug/UrlConfigDebug';

interface VersionCheckResult {
  platform: string;
  currentVersion: string;
  currentBuildNumber: number;
  hasUpdate: boolean;
  latestVersion?: any;
  updateMessage: string;
  error?: string;
}

export default function TestVersionPage() {
  const [results, setResults] = useState<VersionCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const platforms = [
    { name: 'web', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    { name: 'android', userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36' },
    { name: 'ios', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' }
  ];

  const checkAllPlatforms = async () => {
    setIsChecking(true);
    setResults([]);

    const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.5.1';
    const currentBuildNumber = parseInt(process.env.NEXT_PUBLIC_BUILD_NUMBER || '1');

    for (const platform of platforms) {
      try {
        const result = await versionApi.checkVersion({
          platform: platform.name as 'web' | 'ios' | 'android',
          currentVersion,
          currentBuildNumber
        });

        setResults(prev => [...prev, {
          platform: platform.name,
          currentVersion,
          currentBuildNumber,
          hasUpdate: result?.hasUpdate || false,
          latestVersion: result?.latestVersion,
          updateMessage: result?.updateMessage || '检查完成'
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          platform: platform.name,
          currentVersion,
          currentBuildNumber,
          hasUpdate: false,
          updateMessage: '',
          error: error instanceof Error ? error.message : '网络错误'
        }]);
      }
    }

    setIsChecking(false);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'web': return '🌐';
      case 'android': return '🤖';
      case 'ios': return '🍎';
      default: return '❓';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">版本检查测试</h1>
          <p className="text-muted-foreground">
            测试所有平台的版本检查功能
          </p>
        </div>
        <Button 
          onClick={checkAllPlatforms}
          disabled={isChecking}
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? '检查中...' : '检查所有平台'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map((platform) => {
          const result = results.find(r => r.platform === platform.name);
          
          return (
            <Card key={platform.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{getPlatformIcon(platform.name)}</span>
                  {platform.name.toUpperCase()}
                </CardTitle>
                <CardDescription>
                  当前版本: {process.env.NEXT_PUBLIC_APP_VERSION || '0.5.1'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!result && !isChecking && (
                  <p className="text-muted-foreground">点击检查按钮开始测试</p>
                )}
                
                {isChecking && !result && (
                  <p className="text-blue-600">检查中...</p>
                )}
                
                {result && (
                  <div className="space-y-2">
                    {result.error ? (
                      <Badge variant="destructive">错误: {result.error}</Badge>
                    ) : (
                      <>
                        <Badge variant={result.hasUpdate ? "default" : "secondary"}>
                          {result.hasUpdate ? '有更新' : '最新版本'}
                        </Badge>
                        
                        {result.latestVersion && (
                          <div className="text-sm space-y-1">
                            <p><strong>最新版本:</strong> {result.latestVersion.version}</p>
                            <p><strong>版本码:</strong> {result.latestVersion.versionCode}</p>
                            {result.latestVersion.releaseNotes && (
                              <p><strong>更新说明:</strong> {result.latestVersion.releaseNotes}</p>
                            )}
                            {result.latestVersion.downloadUrl && (
                              <p><strong>下载链接:</strong> 
                                <a href={result.latestVersion.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  点击下载
                                </a>
                              </p>
                            )}
                            {result.latestVersion.appStoreUrl && (
                              <p><strong>App Store:</strong> 
                                <a href={result.latestVersion.appStoreUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  前往下载
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground">
                          {result.updateMessage}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>测试说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• <strong>当前版本:</strong> {process.env.NEXT_PUBLIC_APP_VERSION || '0.5.1'} (版本码: {process.env.NEXT_PUBLIC_BUILD_NUMBER || '501'})</p>
            <p>• <strong>测试版本:</strong> 0.6.0 (版本码: 600)</p>
            <p>• <strong>预期结果:</strong> 所有平台都应该检测到有更新可用</p>
            <p>• <strong>版本比较:</strong> 基于版本码进行比较 (600 > 501)</p>
          </div>
        </CardContent>
      </Card>

      {/* URL配置调试 */}
      <UrlConfigDebug />
    </div>
  );
}
