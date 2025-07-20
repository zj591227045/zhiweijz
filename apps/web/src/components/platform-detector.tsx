'use client';

import { useEffect } from 'react';
import { initPlatformDetection, getPlatformInfo } from '@/lib/platform-detection';
import { initializeHapticFeedback } from '@/lib/haptic-feedback';

/**
 * 平台检测组件
 * 在应用启动时自动检测平台并应用相应的CSS类名
 */
export function PlatformDetector() {
  useEffect(() => {
    // 初始化平台检测
    initPlatformDetection();

    // 初始化振动反馈功能
    initializeHapticFeedback();

    // 输出平台信息用于调试
    const platformInfo = getPlatformInfo();
    console.log('🔍 当前平台信息:', platformInfo);

    // 如果是iOS设备，添加CSS类名以启用iOS适配样式
    if (platformInfo.isIOS) {
      console.log('🍎 检测到iOS设备，应用CSS类名以启用iOS适配');

      // 添加iOS类名，让CSS样式生效
      const applyIOSClasses = () => {
        document.documentElement.classList.add('ios-app');
        document.body.classList.add('ios-app');
        console.log('✅ iOS类名已添加，CSS适配样式应该生效');
      };

      // 立即执行
      applyIOSClasses();

      // 监听DOM变化，确保新添加的元素也能获得正确的类名
      const observer = new MutationObserver((mutations) => {
        let needsReapply = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (
                  element.matches('header, .header, .modal-header') ||
                  element.querySelector('header, .header, .modal-header')
                ) {
                  needsReapply = true;
                }
              }
            });
          }
        });

        if (needsReapply) {
          console.log('🔄 检测到新的header元素，确保iOS类名存在');
          setTimeout(applyIOSClasses, 50);
        }
      });

      // 开始观察DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 清理函数
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
