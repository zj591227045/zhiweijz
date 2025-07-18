'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VersionUpdate } from '@/components/settings/VersionUpdate';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  PlayIcon, 
  StopIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  RefreshCwIcon
} from '@heroicons/react/24/outline';
import { useAdminApi } from '@/hooks/useAdminApi';

interface AppVersion {
  id: string;
  platform: 'WEB' | 'IOS' | 'ANDROID';
  version: string;
  buildNumber: number;
  versionCode: number;
  releaseNotes?: string;
  downloadUrl?: string;
  appStoreUrl?: string;
  isForceUpdate: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy?: string;
}

interface VersionStats {
  totalVersions: number;
  platformStats: Record<string, number>;
  latestVersions: Record<string, AppVersion>;
}

const platformNames = {
  WEB: '网页版',
  IOS: 'iOS',
  ANDROID: 'Android'
};

const platformIcons = {
  WEB: ComputerDesktopIcon,
  IOS: DevicePhoneMobileIcon,
  ANDROID: DevicePhoneMobileIcon
};

export default function VersionManagementPage() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [stats, setStats] = useState<VersionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const { adminApi } = useAdminApi();

  // 新版本表单数据
  const [formData, setFormData] = useState({
    platform: '',
    version: '',
    buildNumber: '',
    versionCode: '',
    releaseNotes: '',
    downloadUrl: '',
    appStoreUrl: '',
    isForceUpdate: false,
    isEnabled: true,
    publishNow: false
  });

  // 获取版本列表
  const fetchVersions = async () => {
    try {
      const response = await adminApi.get('/api/admin/version', {
        params: {
          platform: selectedPlatform || undefined,
          limit: 50
        }
      });
      setVersions(response.data || []);
    } catch (error) {
      console.error('获取版本列表失败:', error);
      alert('获取版本列表失败');
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await adminApi.get('/api/admin/version/stats');
      setStats(response.data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
      alert('获取统计信息失败');
    }
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchVersions(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, [selectedPlatform]);

  // 创建版本
  const handleCreateVersion = async () => {
    try {
      if (!formData.platform || !formData.version || !formData.buildNumber || !formData.versionCode) {
        alert('请填写必填字段');
        return;
      }

      await adminApi.post('/api/admin/version', {
        platform: formData.platform,
        version: formData.version,
        buildNumber: parseInt(formData.buildNumber),
        versionCode: parseInt(formData.versionCode),
        releaseNotes: formData.releaseNotes || undefined,
        downloadUrl: formData.downloadUrl || undefined,
        appStoreUrl: formData.appStoreUrl || undefined,
        isForceUpdate: formData.isForceUpdate,
        isEnabled: formData.isEnabled,
        publishNow: formData.publishNow
      });

      alert('版本创建成功');
      setShowCreateDialog(false);
      resetForm();
      await Promise.all([fetchVersions(), fetchStats()]);
    } catch (error: any) {
      console.error('创建版本失败:', error);
      alert(error.response?.data?.message || '创建版本失败');
    }
  };

  // 发布版本
  const handlePublishVersion = async (id: string) => {
    try {
      await adminApi.post(`/api/admin/version/${id}/publish`);
      alert('版本发布成功');
      await Promise.all([fetchVersions(), fetchStats()]);
    } catch (error: any) {
      console.error('发布版本失败:', error);
      alert(error.response?.data?.message || '发布版本失败');
    }
  };

  // 取消发布版本
  const handleUnpublishVersion = async (id: string) => {
    try {
      await adminApi.post(`/api/admin/version/${id}/unpublish`);
      alert('版本已取消发布');
      await Promise.all([fetchVersions(), fetchStats()]);
    } catch (error: any) {
      console.error('取消发布失败:', error);
      alert(error.response?.data?.message || '取消发布失败');
    }
  };

  // 删除版本
  const handleDeleteVersion = async (id: string) => {
    if (!confirm('确定要删除此版本吗？此操作无法撤销。')) {
      return;
    }

    try {
      await adminApi.delete(`/api/admin/version/${id}`);
      alert('版本删除成功');
      await Promise.all([fetchVersions(), fetchStats()]);
    } catch (error: any) {
      console.error('删除版本失败:', error);
      alert(error.response?.data?.message || '删除版本失败');
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      platform: '',
      version: '',
      buildNumber: '',
      versionCode: '',
      releaseNotes: '',
      downloadUrl: '',
      appStoreUrl: '',
      isForceUpdate: false,
      isEnabled: true,
      publishNow: false
    });
    setEditingVersion(null);
  };

  // 渲染统计卡片
  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总版本数</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVersions}</div>
          </CardContent>
        </Card>

        {Object.entries(stats.platformStats).map(([platform, count]) => {
          const Icon = platformIcons[platform as keyof typeof platformIcons];
          return (
            <Card key={platform}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {platformNames[platform as keyof typeof platformNames]}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                {stats.latestVersions[platform] && (
                  <p className="text-xs text-muted-foreground">
                    最新: {stats.latestVersions[platform].version}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 渲染版本列表
  const renderVersionList = () => {
    if (isLoading) {
      return <div className="text-center py-8">加载中...</div>;
    }

    if (versions.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          暂无版本信息
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {versions.map((version) => {
          const Icon = platformIcons[version.platform];
          return (
            <Card key={version.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">
                        {platformNames[version.platform]} {version.version}
                      </CardTitle>
                      <CardDescription>
                        构建号: {version.buildNumber} | 版本码: {version.versionCode}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {version.isForceUpdate && (
                      <Badge variant="destructive">强制更新</Badge>
                    )}
                    {version.publishedAt ? (
                      <Badge variant="default">已发布</Badge>
                    ) : (
                      <Badge variant="secondary">未发布</Badge>
                    )}
                    {!version.isEnabled && (
                      <Badge variant="outline">已禁用</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {version.releaseNotes && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {version.releaseNotes}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    创建时间: {new Date(version.createdAt).toLocaleString()}
                    {version.publishedAt && (
                      <>
                        {' | '}
                        发布时间: {new Date(version.publishedAt).toLocaleString()}
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {version.publishedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnpublishVersion(version.id)}
                      >
                        <StopIcon className="h-4 w-4 mr-1" />
                        取消发布
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePublishVersion(version.id)}
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        发布
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVersion(version.id)}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 渲染创建版本对话框
  const renderCreateDialog = () => {
    if (!showCreateDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>创建新版本</CardTitle>
            <CardDescription>
              添加新的应用版本信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform">平台 *</Label>
              <Select 
                value={formData.platform} 
                onValueChange={(value) => setFormData({...formData, platform: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">网页版</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="version">版本号 *</Label>
              <Input
                id="version"
                placeholder="例如: 1.0.0"
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buildNumber">构建号 *</Label>
                <Input
                  id="buildNumber"
                  type="number"
                  placeholder="例如: 1"
                  value={formData.buildNumber}
                  onChange={(e) => setFormData({...formData, buildNumber: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="versionCode">版本码 *</Label>
                <Input
                  id="versionCode"
                  type="number"
                  placeholder="例如: 1000"
                  value={formData.versionCode}
                  onChange={(e) => setFormData({...formData, versionCode: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="releaseNotes">更新说明</Label>
              <Textarea
                id="releaseNotes"
                placeholder="描述此版本的更新内容..."
                value={formData.releaseNotes}
                onChange={(e) => setFormData({...formData, releaseNotes: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="downloadUrl">下载链接 (Android)</Label>
              <Input
                id="downloadUrl"
                placeholder="APK下载链接"
                value={formData.downloadUrl}
                onChange={(e) => setFormData({...formData, downloadUrl: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="appStoreUrl">App Store链接 (iOS)</Label>
              <Input
                id="appStoreUrl"
                placeholder="App Store链接"
                value={formData.appStoreUrl}
                onChange={(e) => setFormData({...formData, appStoreUrl: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isForceUpdate"
                checked={formData.isForceUpdate}
                onCheckedChange={(checked) => setFormData({...formData, isForceUpdate: checked})}
              />
              <Label htmlFor="isForceUpdate">强制更新</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isEnabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({...formData, isEnabled: checked})}
              />
              <Label htmlFor="isEnabled">启用版本</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="publishNow"
                checked={formData.publishNow}
                onCheckedChange={(checked) => setFormData({...formData, publishNow: checked})}
              />
              <Label htmlFor="publishNow">立即发布</Label>
            </div>
          </CardContent>
          <div className="flex justify-end space-x-2 p-6 pt-0">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleCreateVersion}>
              创建版本
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">版本管理</h1>
          <p className="text-muted-foreground">
            管理应用的版本发布和更新
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => Promise.all([fetchVersions(), fetchStats()])}
            disabled={isLoading}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            新建版本
          </Button>
        </div>
      </div>

      {/* 管理端版本检测 */}
      <VersionUpdate isAdmin={true} />

      {renderStatsCards()}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" onClick={() => setSelectedPlatform('')}>
            全部
          </TabsTrigger>
          <TabsTrigger value="web" onClick={() => setSelectedPlatform('web')}>
            网页版
          </TabsTrigger>
          <TabsTrigger value="ios" onClick={() => setSelectedPlatform('ios')}>
            iOS
          </TabsTrigger>
          <TabsTrigger value="android" onClick={() => setSelectedPlatform('android')}>
            Android
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderVersionList()}
        </TabsContent>
        <TabsContent value="web" className="mt-6">
          {renderVersionList()}
        </TabsContent>
        <TabsContent value="ios" className="mt-6">
          {renderVersionList()}
        </TabsContent>
        <TabsContent value="android" className="mt-6">
          {renderVersionList()}
        </TabsContent>
      </Tabs>

      {renderCreateDialog()}
    </div>
  );
}