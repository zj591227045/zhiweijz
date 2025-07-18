'use client';

import { useState, useEffect } from 'react';
import { PlatformPermissions } from '@/lib/platform-permissions';
import { platformFilePicker } from '@/lib/platform-file-picker';

export default function TestIOSPage() {
  const [mounted, setMounted] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [platformPermissions] = useState(new PlatformPermissions());

  useEffect(() => {
    setMounted(true);
    addTestResult('📱 iOS功能测试页面已加载');
    
    // 检查平台信息
    if (typeof window !== 'undefined') {
      const isCapacitor = !!(window as any).Capacitor;
      const platform = isCapacitor ? (window as any).Capacitor.getPlatform?.() : 'web';
      addTestResult(`🔍 检测平台: ${platform} (Capacitor: ${isCapacitor})`);
    }
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCameraPermission = async () => {
    setIsLoading(true);
    addTestResult('🔐 开始测试相机权限...');
    
    try {
      const checkResult = await platformPermissions.checkCameraPermission();
      addTestResult(`📋 相机权限检查结果: ${checkResult.status} - ${checkResult.message || '无附加信息'}`);
      
      if (checkResult.status !== 'granted') {
        const requestResult = await platformPermissions.requestCameraPermission();
        addTestResult(`🙋 相机权限请求结果: ${requestResult.status} - ${requestResult.message || '无附加信息'}`);
      }
    } catch (error) {
      addTestResult(`❌ 相机权限测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPhotosPermission = async () => {
    setIsLoading(true);
    addTestResult('🔐 开始测试相册权限...');
    
    try {
      const checkResult = await platformPermissions.checkPhotosPermission();
      addTestResult(`📋 相册权限检查结果: ${checkResult.status} - ${checkResult.message || '无附加信息'}`);
      
      if (checkResult.status !== 'granted') {
        const requestResult = await platformPermissions.requestPhotosPermission();
        addTestResult(`🙋 相册权限请求结果: ${requestResult.status} - ${requestResult.message || '无附加信息'}`);
      }
    } catch (error) {
      addTestResult(`❌ 相册权限测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTakePhoto = async () => {
    setIsLoading(true);
    addTestResult('📷 开始测试拍照功能...');
    
    try {
      const result = await platformFilePicker.takePhoto({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      if (result) {
        addTestResult(`✅ 拍照成功! 来源: ${result.source}, 文件大小: ${result.file.size} bytes`);
        addTestResult(`📂 文件信息: ${result.file.name} (${result.file.type})`);
      } else {
        addTestResult('❌ 拍照失败: 未获取到图片数据');
      }
    } catch (error) {
      addTestResult(`❌ 拍照功能测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSelectFromGallery = async () => {
    setIsLoading(true);
    addTestResult('🖼️ 开始测试相册选择功能...');
    
    try {
      const result = await platformFilePicker.pickFromGallery({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      if (result) {
        addTestResult(`✅ 相册选择成功! 来源: ${result.source}, 文件大小: ${result.file.size} bytes`);
        addTestResult(`📂 文件信息: ${result.file.name} (${result.file.type})`);
      } else {
        addTestResult('❌ 相册选择失败: 未获取到图片数据');
      }
    } catch (error) {
      addTestResult(`❌ 相册选择功能测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">iOS功能测试</h1>
        
        {/* 测试按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">功能测试</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testCameraPermission}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              🔐 测试相机权限
            </button>
            
            <button
              onClick={testPhotosPermission}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              🔐 测试相册权限
            </button>
            
            <button
              onClick={testTakePhoto}
              disabled={isLoading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              📷 测试拍照功能
            </button>
            
            <button
              onClick={testSelectFromGallery}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              🖼️ 测试相册选择
            </button>
          </div>
          
          <div className="mt-4 flex justify-center">
            <button
              onClick={clearResults}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              🗑️ 清空结果
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">测试结果</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length > 0 ? (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            ) : (
              <div className="text-gray-500">暂无测试结果...</div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">📝 使用说明</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 请在iOS设备或模拟器上运行此测试</li>
            <li>• 首次点击权限测试时，系统会弹出权限请求对话框</li>
            <li>• 如果权限被拒绝，请到设置→只为记账→权限中手动开启</li>
            <li>• 拍照和相册功能需要先获得相应权限才能正常工作</li>
            <li>• 测试结果会显示在下方的控制台区域</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
