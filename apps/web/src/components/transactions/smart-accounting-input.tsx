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
        toast.error(error.message || '智能识别失败，请手动填写');
      }
    } catch (error) {
      console.error('智能记账失败:', error);
      toast.error('智能识别失败，请手动填写');
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理直接添加记账
  const handleDirectAdd = async () => {
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
      toast.info('正在处理，请稍候...');

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
        toast.success('记账成功');

        // 清空输入
        setDescription('');

        // 跳转到交易列表
        router.push('/transactions');
      } else {
        const error = await response.json();
        toast.error(error.message || '记账失败，请手动填写');
      }
    } catch (error) {
      console.error('直接添加记账失败:', error);
      toast.error('记账失败，请手动填写');
    } finally {
      setIsProcessing(false);
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
          disabled={isProcessing || !description.trim()}
        >
          {isProcessing ? '添加中...' : '直接添加'}
        </button>
      </div>
    </div>
  );
}
