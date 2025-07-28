'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useEnhancedVersion } from '@/components/version/EnhancedVersionProvider';

export default function VersionModalTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // 使用版本管理Hook
  const {
    isChecking,
    hasUpdate,
    updateInfo,
    error,
    showUpdateDialog,
    checkVersion,
    setShowUpdateDialog,
    clearError,
  } = useEnhancedVersion();

  // 添加测试结果
  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // 运行重复弹窗测试
  const runDuplicateModalTest = async () => {
    setIsTestRunning(true);
    setTestResults([]);
    
    addTestResult('开始重复弹窗测试...');

    try {
      // 测试1：检查是否只有一个版本管理实例
      addTestResult('测试1: 检查版本管理实例数量');
      
      // 通过检查DOM中的弹窗数量来验证
      const existingModals = document.querySelectorAll('[role="dialog"]');
      addTestResult(`当前页面中的对话框数量: ${existingModals.length}`);

      // 测试2：触发版本检查
      addTestResult('测试2: 触发版本检查');
      await checkVersion();
      
      // 等待一段时间让状态更新
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 测试3：检查状态
      addTestResult(`测试3: 检查版本状态 - isChecking: ${isChecking}, hasUpdate: ${hasUpdate}, showDialog: ${showUpdateDialog}`);
      
      // 测试4：如果有更新，检查弹窗数量
      if (showUpdateDialog) {
        const modalsAfterCheck = document.querySelectorAll('[role="dialog"]');
        addTestResult(`版本检查后的对话框数量: ${modalsAfterCheck.length}`);
        
        if (modalsAfterCheck.length > 1) {
          addTestResult('❌ 检测到重复弹窗！');
        } else {
          addTestResult('✅ 没有检测到重复弹窗');
        }
      } else {
        addTestResult('ℹ️ 当前没有可用更新或弹窗未显示');
      }

      // 测试5：多次快速检查版本
      addTestResult('测试5: 快速连续检查版本（防抖测试）');
      for (let i = 0; i < 3; i++) {
        checkVersion();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalModals = document.querySelectorAll('[role="dialog"]');
      addTestResult(`快速检查后的对话框数量: ${finalModals.length}`);

      addTestResult('✅ 重复弹窗测试完成');
      
    } catch (err) {
      addTestResult(`❌ 测试失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  // 手动显示弹窗测试
  const testManualShowDialog = () => {
    addTestResult('手动显示弹窗测试');
    setShowUpdateDialog(true);
    
    setTimeout(() => {
      const modals = document.querySelectorAll('[role="dialog"]');
      addTestResult(`手动显示后的对话框数量: ${modals.length}`);
    }, 500);
  };

  // 清理测试
  const clearTest = () => {
    setTestResults([]);
    setShowUpdateDialog(false);
    clearError();
    addTestResult('测试环境已清理');
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">版本弹窗重复问题测试</h1>
        
        {/* 当前状态 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              当前版本管理状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant={isChecking ? "default" : "secondary"}>
                  {isChecking ? "检查中" : "空闲"}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">检查状态</p>
              </div>
              
              <div className="text-center">
                <Badge variant={hasUpdate ? "destructive" : "secondary"}>
                  {hasUpdate ? "有更新" : "无更新"}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">更新状态</p>
              </div>
              
              <div className="text-center">
                <Badge variant={showUpdateDialog ? "default" : "secondary"}>
                  {showUpdateDialog ? "显示中" : "隐藏"}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">弹窗状态</p>
              </div>
              
              <div className="text-center">
                <Badge variant={error ? "destructive" : "secondary"}>
                  {error ? "有错误" : "正常"}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">错误状态</p>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {updateInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  发现版本: {updateInfo.latestVersion?.version} 
                  {updateInfo.isForceUpdate && " (强制更新)"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 测试控制 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
            <CardDescription>
              运行各种测试来验证重复弹窗问题是否已修复
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={runDuplicateModalTest}
                disabled={isTestRunning}
                className="flex items-center gap-2"
              >
                {isTestRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                运行重复弹窗测试
              </Button>
              
              <Button 
                onClick={testManualShowDialog}
                variant="outline"
              >
                手动显示弹窗
              </Button>
              
              <Button 
                onClick={checkVersion}
                variant="outline"
                disabled={isChecking}
              >
                手动检查版本
              </Button>
              
              <Button 
                onClick={clearTest}
                variant="outline"
              >
                清理测试
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 测试结果 */}
        <Card>
          <CardHeader>
            <CardTitle>测试结果</CardTitle>
            <CardDescription>
              实时显示测试过程和结果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center">暂无测试结果</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 修复说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-green-600" />
              修复说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-semibold text-green-800 mb-2">✅ 已修复的问题</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>移除了重复的 AutoVersionChecker 组件</li>
                  <li>统一使用 EnhancedVersionProvider 管理版本检查</li>
                  <li>避免了多个版本检查实例同时运行</li>
                  <li>确保只显示一个更新弹窗</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 mb-2">🔍 测试要点</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>检查页面中对话框元素的数量</li>
                  <li>验证快速连续检查不会产生多个弹窗</li>
                  <li>确认用户操作能正确响应</li>
                  <li>测试各种触发条件下的行为</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
