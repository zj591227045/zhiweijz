'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useAccountBookStore } from '@/store/account-book-store';
import { useRouter } from 'next/navigation';

/**
 * 分享图片处理组件
 * 监听来自Android分享的图片并自动进行识别记账
 */
export function ShareImageHandler() {
  const { currentAccountBook } = useAccountBookStore();
  const router = useRouter();

  useEffect(() => {
    const handleShareImageRecognition = async (event: CustomEvent) => {
      try {
        console.log('📷 [ShareImageHandler] 接收到分享图片识别事件:', event.detail);

        // 同时输出到Android logcat
        if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.LogBridge) {
          (window as any).Capacitor.Plugins.LogBridge.logInfo({
            message: '📷 [ShareImageHandler] 接收到分享图片识别事件',
            tag: 'ShareImageHandler'
          });
        }

        const { file, source } = event.detail;

        if (!file || source !== 'share') {
          console.log('📷 [ShareImageHandler] 无效的分享图片数据');
          if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.LogBridge) {
            (window as any).Capacitor.Plugins.LogBridge.logWarn({
              message: '📷 [ShareImageHandler] 无效的分享图片数据',
              tag: 'ShareImageHandler'
            });
          }
          return;
        }

        // 检查是否有当前账本
        if (!currentAccountBook?.id) {
          toast.error('请先选择账本');
          // 导航到账本选择页面
          router.push('/account-books');
          return;
        }

        // 将分享图片数据保存到sessionStorage，供智能记账模态框使用
        const shareImageData = {
          type: 'share-image',
          file: file,
          accountBookId: currentAccountBook.id,
          source: 'share'
        };

        // 将File对象转换为可序列化的格式
        const reader = new FileReader();
        reader.onload = function(e) {
          const shareImageDataForStorage = {
            type: 'share-image',
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: e.target?.result, // base64 data URL
            accountBookId: currentAccountBook.id,
            source: 'share'
          };

          sessionStorage.setItem('shareImageData', JSON.stringify(shareImageDataForStorage));
          console.log('📷 [ShareImageHandler] 分享图片数据已保存到sessionStorage');

          // 触发打开智能记账模态框的事件
          window.dispatchEvent(new CustomEvent('openSmartAccountingDialog', {
            detail: { source: 'share-image' }
          }));
        };
        reader.readAsDataURL(file);

      } catch (error) {
        console.error('📷 [ShareImageHandler] 处理分享图片失败:', error);
        toast.error('图片识别失败，请重试');
      }
    };

    // 监听分享图片识别事件
    window.addEventListener('shareImageRecognition', handleShareImageRecognition as EventListener);

    console.log('📷 [ShareImageHandler] 分享图片处理器已初始化');

    return () => {
      window.removeEventListener('shareImageRecognition', handleShareImageRecognition as EventListener);
      console.log('📷 [ShareImageHandler] 分享图片处理器已清理');
    };
  }, [currentAccountBook?.id, router]);

  return null; // 这是一个无UI的处理组件
}
