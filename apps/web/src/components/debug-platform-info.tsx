'use client';

import { useState, useEffect } from 'react';
import { getPlatformInfo } from '@/lib/platform-detection';

/**
 * 平台信息调试组件
 * 显示当前平台检测结果和CSS变量值
 */
export function DebugPlatformInfo() {
  const [platformInfo, setPlatformInfo] = useState<any>(null);
  const [safeAreaInfo, setSafeAreaInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 获取平台信息
    const info = getPlatformInfo();
    setPlatformInfo(info);

    // 获取安全区域信息
    const getSafeAreaInfo = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      return {
        top: computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0px',
        bottom: computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
        left: computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0px',
        right: computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0px',
        bodyClasses: Array.from(document.body.classList),
        htmlClasses: Array.from(document.documentElement.classList),
      };
    };

    // 延迟获取安全区域信息，确保CSS已加载
    setTimeout(() => {
      setSafeAreaInfo(getSafeAreaInfo());
    }, 1000);
  }, []);

  if (!platformInfo) return null;

  return (
    <>
      {/* 调试按钮 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          top: platformInfo.isIOS ? 'calc(env(safe-area-inset-top, 0px) + 10px)' : '10px',
          right: '10px',
          zIndex: 999999,
          background: '#007AFF',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {isVisible ? '隐藏' : '调试'}
      </button>

      {/* 调试信息面板 */}
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: platformInfo.isIOS ? 'calc(env(safe-area-inset-top, 0px) + 50px)' : '50px',
            right: '10px',
            width: '300px',
            maxHeight: '80vh',
            overflow: 'auto',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 999998,
            fontFamily: 'monospace',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#007AFF' }}>平台检测信息</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <strong>平台检测结果:</strong>
            <div>iOS: {platformInfo.isIOS ? '✅' : '❌'}</div>
            <div>Android: {platformInfo.isAndroid ? '✅' : '❌'}</div>
            <div>Capacitor: {platformInfo.isCapacitor ? '✅' : '❌'}</div>
            <div>Mobile: {platformInfo.isMobile ? '✅' : '❌'}</div>
            <div>Has Notch: {platformInfo.hasNotch ? '✅' : '❌'}</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>屏幕信息:</strong>
            <div>宽度: {platformInfo.screenSize?.width}px</div>
            <div>高度: {platformInfo.screenSize?.height}px</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>User Agent:</strong>
            <div style={{ wordBreak: 'break-all', fontSize: '10px' }}>
              {platformInfo.userAgent}
            </div>
          </div>

          {safeAreaInfo && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <strong>安全区域:</strong>
                <div>Top: {safeAreaInfo.top}</div>
                <div>Bottom: {safeAreaInfo.bottom}</div>
                <div>Left: {safeAreaInfo.left}</div>
                <div>Right: {safeAreaInfo.right}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong>Body Classes:</strong>
                <div style={{ fontSize: '10px' }}>
                  {safeAreaInfo.bodyClasses.join(', ')}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong>HTML Classes:</strong>
                <div style={{ fontSize: '10px' }}>
                  {safeAreaInfo.htmlClasses.join(', ')}
                </div>
              </div>
            </>
          )}

          <button
            onClick={() => {
              // 刷新信息
              const info = getPlatformInfo();
              setPlatformInfo(info);
              
              const computedStyle = getComputedStyle(document.documentElement);
              setSafeAreaInfo({
                top: computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0px',
                bottom: computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
                left: computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0px',
                right: computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0px',
                bodyClasses: Array.from(document.body.classList),
                htmlClasses: Array.from(document.documentElement.classList),
              });
            }}
            style={{
              background: '#34C759',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            刷新信息
          </button>
        </div>
      )}
    </>
  );
}
