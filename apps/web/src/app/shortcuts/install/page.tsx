'use client';

import React, { useState } from 'react';
import { Smartphone, Download, Settings, CheckCircle, AlertCircle, Apple, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleShortcutsDeepLink } from '@/lib/shortcuts-deep-link-handler';

export default function ShortcutsInstallPage() {
  const [activeTab, setActiveTab] = useState('ios');

  const handleInstallImageShortcut = () => {
    // 使用iCloud快捷指令链接
    const icloudUrl = 'https://www.icloud.com/shortcuts/54101f6b4e5448cf8d20945f2daa1df4';

    // 直接打开iCloud快捷指令链接
    window.open(icloudUrl, '_blank');
  };

  const copyInstallLink = () => {
    const icloudUrl = 'https://www.icloud.com/shortcuts/54101f6b4e5448cf8d20945f2daa1df4';

    navigator.clipboard.writeText(icloudUrl).then(() => {
      alert('安装链接已复制到剪贴板');
    }).catch(() => {
      alert('复制失败，请手动复制');
    });
  };



  const handleGetAndroidToken = async () => {
    try {
      // 调用深度链接处理器获取Android token
      await handleShortcutsDeepLink('zhiweijz://smart-accounting?type=android-token&source=web');
    } catch (error) {
      console.error('获取Android Token失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            自动化截图记账
          </h1>
          <p className="text-lg text-gray-600">
            支持iOS快捷指令和Android MacroDroid
          </p>
        </div>

        {/* 平台选择 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ios" className="flex items-center gap-2">
              <Apple className="w-4 h-4" />
              iOS 快捷指令
            </TabsTrigger>
            <TabsTrigger value="android" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Android MacroDroid
            </TabsTrigger>
          </TabsList>

          {/* iOS 快捷指令内容 */}
          <TabsContent value="ios" className="space-y-6">
            {/* iOS系统要求 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  iOS系统要求
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    iOS 14.0 或更高版本
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    iPhone 8 或更新机型（支持轻点背面）
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    已安装"只为记账"App并完成登录
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* iOS快捷指令安装 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  智能图片记账快捷指令
                </CardTitle>
                <CardDescription>
                  对象存储版本 - 支持完整质量图片上传，无URL长度限制
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 功能特点 */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">完整质量图片</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">对象存储上传</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">智能识别记账</span>
                  </div>
                </div>

                {/* 安装按钮 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleInstallImageShortcut} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    打开快捷指令
                  </Button>
                  <Button variant="outline" onClick={copyInstallLink} className="flex-1">
                    复制安装链接
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Android MacroDroid内容 */}
          <TabsContent value="android" className="space-y-6">
            {/* Android系统要求 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Android系统要求
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Android 7.0 或更高版本
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    已安装MacroDroid应用
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    已安装"只为记账"App并完成登录
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Android配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  MacroDroid自动化配置
                </CardTitle>
                <CardDescription>
                  通过MacroDroid实现Android平台的自动截图记账功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 功能特点 */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">自动截图</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">HTTP上传</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">智能识别记账</span>
                  </div>
                </div>

                {/* 获取配置按钮 */}
                <div className="text-center">
                  <Button onClick={handleGetAndroidToken} size="lg" className="w-full sm:w-auto">
                    <Settings className="w-4 h-4 mr-2" />
                    获取MacroDroid配置信息
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    点击获取Token和详细配置步骤
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
