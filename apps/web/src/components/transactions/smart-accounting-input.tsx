'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api-client';

interface SmartAccountingInputProps {
  accountBookId?: string;
  onSuccess?: (result: any) => void;
}

interface SmartAccountingResult {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  description?: string;
  date?: string;
}

// 复用智能记账进度管理器
declare global {
  interface Window {
    smartAccountingProgressManager?: any;
  }
}

// 获取全局进度管理器实例
const getProgressManager = () => {
  if (typeof window === 'undefined') return null;
  return window.smartAccountingProgressManager;
};

export function SmartAccountingInput({ accountBookId, onSuccess }: SmartAccountingInputProps) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 处理智能识别
  const handleSmartAccounting = async () => {
    if (!description.trim()) {
      toast.error('请输入描述');
      return;
    }

    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    try {
      setIsProcessing(true);
      toast.info('正在进行智能识别，请稍候...');

      // 调用智能记账API
      const response = await fetchApi(`/api/ai/smart-accounting`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          accountBookId,
        }),
      });

      if (response.ok) {
        const result: SmartAccountingResult = await response.json();

        // 调用成功回调
        onSuccess?.(result);

        toast.success('智能识别成功');

        // 清空输入
        setDescription('');
      } else {
        const error = await response.json();
        // 特殊处理"消息与记账无关"的情况
        if (error.info && error.info.includes('记账无关')) {
          toast.info('您的描述似乎与记账无关，请尝试描述具体的消费或收入情况');
        } else {
          toast.error(error.message || error.error || '智能识别失败，请手动填写');
        }
      }
    } catch (error) {
      console.error('智能记账失败:', error);
      toast.error('智能识别失败，请手动填写');
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理直接添加记账 - 优化版本，使用顶部通知
  const handleDirectAdd = async () => {
    if (!description.trim()) {
      toast.error('请输入描述');
      return;
    }

    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 获取进度管理器
    const progressManager = getProgressManager();
    if (!progressManager) {
      // 如果进度管理器不可用，回退到原有逻辑
      try {
        setIsProcessing(true);
        toast.info('正在处理，请稍候...');

        const response = await fetchApi(`/api/ai/smart-accounting/direct`, {
          method: 'POST',
          body: JSON.stringify({
            description,
            accountBookId,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          toast.success('记账成功');
          setDescription('');
          router.push('/transactions');
        } else {
          const error = await response.json();
          // 特殊处理"消息与记账无关"的情况
          if (error.info && error.info.includes('记账无关')) {
            toast.info('您的描述似乎与记账无关，请尝试描述具体的消费或收入情况');
          } else {
            toast.error(error.message || error.error || '记账失败，请手动填写');
          }
        }
      } catch (error) {
        console.error('直接添加记账失败:', error);
        toast.error('记账失败，请手动填写');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 生成唯一的进度ID
    const progressId = `direct-add-input-${Date.now()}`;
    
    try {
      // 显示初始进度通知
      progressManager.showProgress(progressId, '正在分析您的描述...', 'info');

      // 后台异步处理
      setTimeout(() => {
        progressManager.updateProgress(progressId, '正在识别记账类型和金额...');
      }, 1000);
      
      setTimeout(() => {
        progressManager.updateProgress(progressId, '正在匹配最佳分类...');
      }, 2000);
      
      setTimeout(() => {
        progressManager.updateProgress(progressId, '正在创建记账记录...');
      }, 3000);

      // 调用直接添加记账API
      const response = await fetchApi(`/api/ai/smart-accounting/direct`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          accountBookId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // 显示成功通知
        progressManager.showProgress(progressId, '记账成功！数据已更新', 'success');
        
        // 清空输入
        setDescription('');
        
      } else {
        const error = await response.json();
        // 特殊处理"消息与记账无关"的情况
        if (error.info && error.info.includes('记账无关')) {
          progressManager.showProgress(progressId, '您的描述似乎与记账无关，请尝试描述具体的消费或收入情况', 'info');
        } else {
          progressManager.showProgress(progressId, error.message || error.error || '记账失败，请手动填写', 'error');
        }
      }
    } catch (error) {
      console.error('直接添加记账失败:', error);
      
      // 显示错误通知
      let errorMessage = '记账失败，请重试';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      progressManager.showProgress(progressId, errorMessage, 'error');
    }
  };

  return (
    <div className="smart-accounting-container">
      <div className="smart-accounting-header">
        <h3 className="smart-accounting-title">智能记账</h3>
        <p className="smart-accounting-subtitle">输入一句话，自动识别记账信息</p>
      </div>

      <div className="smart-accounting-input-wrapper">
        <textarea
          className="smart-accounting-textarea"
          placeholder="例如：昨天在沃尔玛买了日用品，花了128.5元"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isProcessing}
        />
      </div>

      <div className="smart-accounting-buttons">
        <button
          className="smart-accounting-button identify-button"
          onClick={handleSmartAccounting}
          disabled={isProcessing || !description.trim()}
        >
          {isProcessing ? '识别中...' : '智能识别'}
        </button>

        <button
          className="smart-accounting-button direct-button"
          onClick={handleDirectAdd}
          disabled={!description.trim()}
        >
          直接添加
        </button>
      </div>
    </div>
  );
}
