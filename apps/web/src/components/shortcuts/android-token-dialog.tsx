import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Smartphone, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface AndroidTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenData: {
    token: string;
    uploadUrl: string;
    checkTokenUrl: string;
    expiresIn: number;
    expiresAt: number;
    macrodroidConfig: {
      httpMethod: string;
      contentType: string;
      authorizationHeader: string;
      fileFieldName: string;
      bodyParameters: {
        accountBookId: string;
      };
    };
  } | null;
}

export function AndroidTokenDialog({ open, onOpenChange, tokenData }: AndroidTokenDialogProps) {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(label));
      toast.success(`${label}已复制到剪贴板`);
      
      // 3秒后重置复制状态
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(label);
          return newSet;
        });
      }, 3000);
    } catch (error) {
      toast.error('复制失败，请手动复制');
    }
  };

  const formatExpiryTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}小时`;
  };

  if (!tokenData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Android MacroDroid 配置信息
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Token信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                认证Token
              </CardTitle>
              <CardDescription>
                用于MacroDroid访问只为记账API的认证令牌
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 mr-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Token</div>
                  <div className="text-xs text-gray-500 font-mono break-all">
                    {tokenData.token.substring(0, 50)}...
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(tokenData.token, 'Token')}
                  className="shrink-0"
                >
                  {copiedItems.has('Token') ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-4 text-sm">
                <Badge variant="secondary">
                  有效期: {formatDuration(tokenData.expiresIn)}
                </Badge>
                <Badge variant="outline">
                  过期时间: {formatExpiryTime(tokenData.expiresAt)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* MacroDroid配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                MacroDroid HTTP请求配置
              </CardTitle>
              <CardDescription>
                在MacroDroid中创建HTTP Request动作时使用以下配置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">请求URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                    {tokenData.uploadUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(tokenData.uploadUrl, 'URL')}
                  >
                    {copiedItems.has('URL') ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* HTTP方法 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">HTTP方法</label>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{tokenData.macrodroidConfig.httpMethod}</Badge>
                </div>
              </div>

              {/* Content-Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Content-Type</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                    {tokenData.macrodroidConfig.contentType}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(tokenData.macrodroidConfig.contentType, 'Content-Type')}
                  >
                    {copiedItems.has('Content-Type') ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Authorization Header */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Authorization头部</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                    {tokenData.macrodroidConfig.authorizationHeader}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(tokenData.macrodroidConfig.authorizationHeader, 'Authorization')}
                  >
                    {copiedItems.has('Authorization') ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 文件字段名 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">文件字段名</label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{tokenData.macrodroidConfig.fileFieldName}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 配置步骤 */}
          <Card>
            <CardHeader>
              <CardTitle>MacroDroid配置步骤</CardTitle>
              <CardDescription>
                按照以下步骤在MacroDroid中配置截图记账功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <div className="font-medium">创建新的Macro</div>
                    <div className="text-sm text-gray-600">在MacroDroid中创建一个新的自动化规则</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <div className="font-medium">设置触发器</div>
                    <div className="text-sm text-gray-600">选择合适的触发器，如手势、按钮点击或时间等</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <div className="font-medium">添加截图动作</div>
                    <div className="text-sm text-gray-600">添加"Take Screenshot"动作，保存截图到文件</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <div className="font-medium">添加HTTP请求动作</div>
                    <div className="text-sm text-gray-600">使用上面的配置信息设置HTTP Request动作</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    5
                  </div>
                  <div>
                    <div className="font-medium">测试配置</div>
                    <div className="text-sm text-gray-600">运行Macro测试截图记账功能是否正常工作</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              完成
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
