'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';

export default function TestViewportPage() {
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [viewportInfo, setViewportInfo] = useState<any>({});
  const [capacitorInfo, setCapacitorInfo] = useState<any>({});

  useEffect(() => {
    // 获取设备信息
    const getDeviceInfo = () => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      const isMobile = /Mobi|Android/i.test(userAgent);
      
      return {
        userAgent,
        isIOS,
        isAndroid,
        isMobile,
        platform: navigator.platform,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      };
    };

    // 获取视口信息
    const getViewportInfo = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      return {
        viewportContent: viewport?.getAttribute('content') || 'Not found',
        documentWidth: document.documentElement.clientWidth,
        documentHeight: document.documentElement.clientHeight,
        bodyWidth: document.body.clientWidth,
        bodyHeight: document.body.clientHeight,
      };
    };

    // 获取Capacitor信息
    const getCapacitorInfo = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          const { Capacitor } = await import('@capacitor/core');
          return {
            isNativePlatform: Capacitor.isNativePlatform(),
            platform: Capacitor.getPlatform(),
            isPluginAvailable: {
              StatusBar: Capacitor.isPluginAvailable('StatusBar'),
              Keyboard: Capacitor.isPluginAvailable('Keyboard'),
              Camera: Capacitor.isPluginAvailable('Camera'),
            }
          };
        }
      } catch (error) {
        return { error: 'Capacitor not available' };
      }
      return { error: 'Not in Capacitor environment' };
    };

    setDeviceInfo(getDeviceInfo());
    setViewportInfo(getViewportInfo());
    getCapacitorInfo().then(setCapacitorInfo);

    // 监听窗口大小变化
    const handleResize = () => {
      setViewportInfo(getViewportInfo());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const testZoom = () => {
    // 尝试通过JavaScript设置缩放（这应该被阻止）
    try {
      (document.body.style as any).zoom = '1.5';
      alert('如果页面被放大了，说明缩放没有被完全禁用');
    } catch (error) {
      alert('缩放被成功阻止');
    }
  };

  const resetZoom = () => {
    try {
      (document.body.style as any).zoom = '1';
    } catch (error) {
      // ignore
    }
  };

  return (
    <PageContainer title="视口缩放测试" activeNavItem="settings">
      <div className="space-y-6">
        {/* 测试说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            缩放测试说明
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            在移动设备上尝试双指缩放或双击缩放此页面。如果配置正确，页面应该无法被缩放。
          </p>
        </div>

        {/* 设备信息 */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">设备信息</h3>
          <div className="space-y-2 text-sm">
            <div><strong>平台:</strong> {deviceInfo.platform}</div>
            <div><strong>是否iOS:</strong> {deviceInfo.isIOS ? '是' : '否'}</div>
            <div><strong>是否Android:</strong> {deviceInfo.isAndroid ? '是' : '否'}</div>
            <div><strong>是否移动设备:</strong> {deviceInfo.isMobile ? '是' : '否'}</div>
            <div><strong>屏幕尺寸:</strong> {deviceInfo.screenWidth} × {deviceInfo.screenHeight}</div>
            <div><strong>窗口尺寸:</strong> {deviceInfo.windowWidth} × {deviceInfo.windowHeight}</div>
            <div><strong>设备像素比:</strong> {deviceInfo.devicePixelRatio}</div>
          </div>
        </div>

        {/* 视口信息 */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">视口信息</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Viewport Meta:</strong></div>
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs break-all">
              {viewportInfo.viewportContent}
            </div>
            <div><strong>文档尺寸:</strong> {viewportInfo.documentWidth} × {viewportInfo.documentHeight}</div>
            <div><strong>Body尺寸:</strong> {viewportInfo.bodyWidth} × {viewportInfo.bodyHeight}</div>
          </div>
        </div>

        {/* Capacitor信息 */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Capacitor信息</h3>
          <div className="space-y-2 text-sm">
            {capacitorInfo.error ? (
              <div className="text-gray-500">{capacitorInfo.error}</div>
            ) : (
              <>
                <div><strong>原生平台:</strong> {capacitorInfo.isNativePlatform ? '是' : '否'}</div>
                <div><strong>平台:</strong> {capacitorInfo.platform}</div>
                <div><strong>可用插件:</strong></div>
                <ul className="ml-4 space-y-1">
                  {Object.entries(capacitorInfo.isPluginAvailable || {}).map(([plugin, available]) => (
                    <li key={plugin}>
                      {plugin}: {available ? '✅' : '❌'}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">缩放测试</h3>
          <div className="space-y-3">
            <button
              onClick={testZoom}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              测试JavaScript缩放
            </button>
            <button
              onClick={resetZoom}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              重置缩放
            </button>
          </div>
        </div>

        {/* 测试内容 */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">测试内容</h3>
          <div className="space-y-4">
            <p className="text-sm">
              这是一段测试文本。在移动设备上尝试双指缩放或双击此文本。
              如果配置正确，页面应该无法被缩放。
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded text-center">
                <div className="text-red-600 dark:text-red-400 font-semibold">红色区域</div>
                <div className="text-xs mt-1">尝试缩放此区域</div>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded text-center">
                <div className="text-green-600 dark:text-green-400 font-semibold">绿色区域</div>
                <div className="text-xs mt-1">尝试缩放此区域</div>
              </div>
            </div>
            <input
              type="text"
              placeholder="测试输入框（应该可以正常使用）"
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
