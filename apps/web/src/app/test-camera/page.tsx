'use client';

import { useState, useEffect } from 'react';
import { platformFilePicker } from '@/lib/platform-file-picker';
import { getDeviceCapabilities } from '@/lib/file-upload-utils';
import { getPlatformInfo } from '@/lib/platform-detection';

export default function TestCameraPage() {
  const [mounted, setMounted] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState<any>(null);
  const [platformCapabilities, setPlatformCapabilities] = useState<any>(null);
  const [platformInfo, setPlatformInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 获取设备能力
    const deviceCaps = getDeviceCapabilities();
    setDeviceCapabilities(deviceCaps);
    
    // 获取平台信息
    const platInfo = getPlatformInfo();
    setPlatformInfo(platInfo);
    
    // 异步获取平台能力
    platformFilePicker.checkCapabilities().then(setPlatformCapabilities);
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCameraPlugin = async () => {
    setIsLoading(true);
    addTestResult('🧪 开始测试Camera插件...');
    
    try {
      const result = await platformFilePicker.takePhoto({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      if (result) {
        addTestResult(`✅ 拍照成功: ${result.source}, 文件大小: ${result.file.size} bytes`);
      } else {
        addTestResult('❌ 拍照失败: 未获取到图片');
      }
    } catch (error) {
      addTestResult(`❌ 拍照失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGalleryPlugin = async () => {
    setIsLoading(true);
    addTestResult('🧪 开始测试Gallery插件...');
    
    try {
      const result = await platformFilePicker.pickFromGallery({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      if (result) {
        addTestResult(`✅ 相册选择成功: ${result.source}, 文件大小: ${result.file.size} bytes`);
      } else {
        addTestResult('❌ 相册选择失败: 未获取到图片');
      }
    } catch (error) {
      addTestResult(`❌ 相册选择失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!mounted) {
    return <div className="p-4">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Camera插件测试页面</h1>
        
        {/* 环境信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">环境信息</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">设备能力</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(deviceCapabilities, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">平台信息</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(platformInfo, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-2">平台能力</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(platformCapabilities, null, 2)}
            </pre>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">功能测试</h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testCameraPlugin}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? '测试中...' : '测试相机'}
            </button>
            
            <button
              onClick={testGalleryPlugin}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? '测试中...' : '测试相册'}
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清除结果
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">测试结果</h2>
          
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">暂无测试结果...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
