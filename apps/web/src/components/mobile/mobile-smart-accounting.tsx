/**
 * 移动端智能记账组件
 * 优化快捷指令和移动端智能记账体验
 */

'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAccountBookStore } from '@/store/account-book-store';
import { apiClient } from '@/lib/api-client';
import { Loader2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';

interface MobileSmartAccountingProps {
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ProcessingState {
  isProcessing: boolean;
  step: string;
  progress: number;
}

export function MobileSmartAccounting({ 
  onSuccess, 
  onError, 
  className = '' 
}: MobileSmartAccountingProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    step: '',
    progress: 0
  });
  
  const { currentAccountBook } = useAccountBookStore();

  // 监听快捷指令处理状态
  useEffect(() => {
    // 检查是否有待处理的快捷指令数据
    const checkPendingShortcuts = () => {
      const pendingData = sessionStorage.getItem('shortcuts-pending-data');
      if (pendingData) {
        try {
          const data = JSON.parse(pendingData);
          sessionStorage.removeItem('shortcuts-pending-data');
          handleShortcutsData(data);
        } catch (error) {
          console.error('解析快捷指令数据失败:', error);
        }
      }
    };

    checkPendingShortcuts();
  }, []);

  /**
   * 处理快捷指令数据
   */
  const handleShortcutsData = async (data: { type: string; data: string; accountId?: string }) => {
    if (!currentAccountBook?.id && !data.accountId) {
      toast.error('请先选择账本');
      onError?.('未选择账本');
      return;
    }

    setProcessingState({
      isProcessing: true,
      step: data.type === 'image' ? '正在识别图片内容...' : '正在分析记账信息...',
      progress: 20
    });

    try {
      // 更新处理步骤
      setTimeout(() => {
        setProcessingState(prev => ({
          ...prev,
          step: '正在匹配分类和预算...',
          progress: 50
        }));
      }, 1000);

      setTimeout(() => {
        setProcessingState(prev => ({
          ...prev,
          step: '正在创建记账记录...',
          progress: 80
        }));
      }, 2000);

      // 调用智能记账直接添加API
      const response = await apiClient.post(
        `/ai/account/${data.accountId || currentAccountBook?.id}/smart-accounting/direct`,
        {
          description: data.data,
          source: 'shortcuts-mobile',
          isFromImageRecognition: data.type === 'image' // 如果是图片类型，设置图片识别标识
        },
        { timeout: 120000 }
      );

      setProcessingState(prev => ({
        ...prev,
        step: '记账完成！',
        progress: 100
      }));

      // 显示成功消息
      toast.success('快捷指令记账成功！', {
        description: `已成功创建记账记录`,
        duration: 3000
      });

      onSuccess?.(response.id);

      // 重置状态
      setTimeout(() => {
        setProcessingState({
          isProcessing: false,
          step: '',
          progress: 0
        });
      }, 1500);

    } catch (error: any) {
      console.error('快捷指令记账失败:', error);
      
      let errorMessage = '记账失败，请稍后重试';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      setProcessingState({
        isProcessing: false,
        step: '',
        progress: 0
      });

      toast.error('快捷指令记账失败', {
        description: errorMessage,
        duration: 5000
      });

      onError?.(errorMessage);
    }
  };

  /**
   * 手动触发智能记账（用于测试）
   */
  const handleManualTest = async () => {
    // 创建一个测试用的Base64图片数据（1x1像素的透明PNG）
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const testData = {
      type: 'image',
      data: testImageData,
      accountId: currentAccountBook?.id
    };

    await handleShortcutsData(testData);
  };

  if (!processingState.isProcessing) {
    return (
      <div className={`mobile-smart-accounting ${className}`}>
        {/* 快捷指令状态指示器 */}
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
          <span className="text-sm text-blue-700">
            快捷指令记账已就绪
          </span>
        </div>

        {/* 测试按钮（开发环境） */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleManualTest}
            className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            测试快捷指令记账
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`mobile-smart-accounting-processing ${className}`}>
      {/* 处理中状态 */}
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* 进度指示器 */}
        <div className="w-full max-w-xs mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>处理中</span>
            <span>{processingState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
        </div>

        {/* 状态图标和文字 */}
        <div className="flex items-center mb-4">
          {processingState.progress < 100 ? (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {processingState.step}
          </span>
        </div>

        {/* 提示信息 */}
        <p className="text-xs text-gray-500 text-center">
          {processingState.progress < 100 
            ? '请稍候，正在处理您的快捷指令请求...'
            : '记账记录已成功创建！'
          }
        </p>
      </div>
    </div>
  );
}

/**
 * 快捷指令状态监听Hook
 * 用于在其他组件中监听快捷指令处理状态
 */
export function useShortcutsStatus() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // 监听快捷指令处理事件
    const handleShortcutsEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      if (type === 'processing') {
        setIsProcessing(true);
        setLastResult(null);
      } else if (type === 'success') {
        setIsProcessing(false);
        setLastResult({ success: true, message: data.message });
      } else if (type === 'error') {
        setIsProcessing(false);
        setLastResult({ success: false, message: data.message });
      }
    };

    window.addEventListener('shortcuts-event', handleShortcutsEvent as EventListener);

    return () => {
      window.removeEventListener('shortcuts-event', handleShortcutsEvent as EventListener);
    };
  }, []);

  return {
    isProcessing,
    lastResult,
    clearResult: () => setLastResult(null)
  };
}

/**
 * 触发快捷指令事件的工具函数
 */
export function emitShortcutsEvent(type: 'processing' | 'success' | 'error', data?: any) {
  const event = new CustomEvent('shortcuts-event', {
    detail: { type, data }
  });
  window.dispatchEvent(event);
}
