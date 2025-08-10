'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAccountBookStore } from '@/store/account-book-store';
import { useRouter } from 'next/navigation';
import { SmartAccountingProgressManager } from '@/components/transactions/smart-accounting-dialog';
import { triggerTransactionChange } from '@/store/dashboard-store';

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

        // 显示处理提示
        toast.info('正在识别分享的图片...');

        // 调用图片识别API
        await processSharedImage(file, currentAccountBook.id);

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

/**
 * 处理分享的图片 - 完全复用智能记账模态框的图片记账逻辑
 */
async function processSharedImage(imageFile: File, accountBookId: string) {
  try {
    console.log('📷 [ShareImageHandler] 开始处理分享图片:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      accountBookId
    });

    // 复用智能记账模态框的图片识别逻辑
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('accountBookId', accountBookId);

    const response = await apiClient.post('/ai/smart-accounting/vision', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });

    if (response && response.data && response.data.text) {
      const recognizedText = response.data.text;
      const imageFileInfo = response.data.fileInfo; // 获取图片文件信息
      console.log('🖼️ [ShareImageHandler] 图片识别成功，开始直接记账', {
        hasFileInfo: !!imageFileInfo
      });

      // 生成唯一进度ID
      const progressId = `share-image-direct-add-${Date.now()}`;

      // 获取智能记账进度管理器实例
      const progressManager = SmartAccountingProgressManager.getInstance();

      // 显示进度通知
      progressManager.showProgress(progressId, '正在分析分享图片记账信息...');

      // 调用直接添加记账API（带图片识别标识）- 完全复用智能记账模态框逻辑
      try {
        const requestBody: any = {
          description: recognizedText,
          source: 'share_image_recognition',
          isFromImageRecognition: true
        };

        // 如果有文件信息，添加附件文件ID
        if (response.data?.fileInfo?.id) {
          requestBody.attachmentFileId = response.data.fileInfo.id;
          console.log('🖼️ [ShareImageHandler] 添加附件文件ID:', response.data.fileInfo.id);
        }

        const directAddResponse = await apiClient.post(
          `/ai/account/${accountBookId}/smart-accounting/direct`,
          requestBody,
          { timeout: 60000 },
        );

        if (directAddResponse && directAddResponse.requiresUserSelection && directAddResponse.records) {
          // 需要用户选择记录 - 复用智能记账模态框的逻辑
          console.log('📝 [分享图片记账] 需要用户选择记录:', directAddResponse.records.length);
          progressManager.updateProgress(progressId, '检测到多条记账记录，请选择需要导入的记录');

          // 触发记录选择事件，让主界面处理
          window.dispatchEvent(new CustomEvent('showRecordSelection', {
            detail: {
              records: directAddResponse.records,
              source: 'share_image_recognition',
              progressId: progressId
            }
          }));
        } else if (directAddResponse && (directAddResponse.success || directAddResponse.id)) {
          // 直接添加成功 - 复用智能记账模态框的成功处理逻辑
          // 判断条件：有success字段且为true，或者有id字段（表示记录创建成功）
          console.log('📝 [分享图片记账] 记账成功:', directAddResponse);
          progressManager.showProgress(progressId, '分享图片识别记账成功！', 'success');

          // 触发记账变化事件，让仪表盘和记账列表自动刷新
          triggerTransactionChange(accountBookId);
        } else {
          console.error('📝 [分享图片记账] 记账失败:', directAddResponse);
          progressManager.showProgress(progressId, '记账失败，请重试', 'error');
        }
      } catch (directAddError: any) {
        console.error('分享图片记账直接添加失败:', directAddError);

        // 处理特定错误类型 - 复用智能记账模态框的错误处理逻辑
        if (directAddError.response?.status === 402) {
          progressManager.showProgress(progressId, '记账点余额不足', 'error');
        } else if (
          directAddError.response?.data?.info &&
          directAddError.response.data.info.includes('记账无关')
        ) {
          progressManager.showProgress(progressId, '图片内容与记账无关，请重试', 'error');
        } else {
          progressManager.showProgress(progressId, '记账失败，请手动填写', 'error');
        }
      }
    } else {
      console.error('📷 [ShareImageHandler] 图片识别失败，没有返回文本');
      toast.error('图片识别失败，请重试');
    }

  } catch (error: any) {
    console.error('📷 [ShareImageHandler] 处理分享图片失败:', error);

    let errorMessage = '图片识别失败，请重试';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
  }
}
