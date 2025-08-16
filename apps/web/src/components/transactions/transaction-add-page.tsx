'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { useTransactionFormStore } from '@/store/transaction-form-store';
import { useTransactionStore } from '@/store/transaction-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { triggerTransactionChange } from '@/store/dashboard-store';
import { tagApi } from '@/lib/api/tag-api';
import { apiClient } from '@/lib/api-client';
import { AmountInput } from './amount-input';
import { TransactionTypeToggle } from './transaction-type-toggle';
import { CategorySelector } from './category-selector';
import { TransactionDetails } from './transaction-details';
import { StepIndicator } from './step-indicator';
import { getIconClass } from '@/lib/utils';
import { TransactionType } from '@/types';
import { toast } from 'sonner';
import './transaction-add.css';

export function TransactionAddPage() {
  const router = useRouter();
  const {
    currentStep,
    amount,
    type,
    categoryId,
    categoryName,
    categoryIcon,
    description,
    date,
    time,
    budgetId,
    tagIds,
    attachments,
    isMultiBudget,
    budgetAllocation,
    goToStep,
    resetForm,
    fillSmartAccountingResult,
    setShowKeyboardInitially,
  } = useTransactionFormStore();

  const { createTransaction } = useTransactionStore();
  const { categories, fetchCategories, isLoading: isCategoriesLoading } = useCategoryStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { budgets, fetchActiveBudgets } = useBudgetStore();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 获取数据
  useEffect(() => {
    fetchAccountBooks();
  }, [fetchAccountBooks]);

  // 当账本变化时，重新获取分类和预算
  useEffect(() => {
    if (currentAccountBook?.id) {
      console.log('当前账本变化，重新获取分类和预算:', currentAccountBook.id);
      fetchCategories(undefined, currentAccountBook.id);
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [fetchCategories, fetchActiveBudgets, currentAccountBook?.id]);

  // 检查智能记账结果
  useEffect(() => {
    const smartResult = sessionStorage.getItem('smartAccountingResult');
    if (smartResult) {
      try {
        const result = JSON.parse(smartResult);
        console.log('智能记账结果:', result);

        // 使用store方法填充表单数据
        fillSmartAccountingResult(result);

        // 清除sessionStorage
        sessionStorage.removeItem('smartAccountingResult');

        toast.success('智能识别结果已自动填充');
      } catch (error) {
        console.error('解析智能记账结果失败:', error);
        sessionStorage.removeItem('smartAccountingResult');
      }
    }
  }, [fillSmartAccountingResult]);

  // 监听步骤变化，当进入第二步时自动显示虚拟键盘
  useEffect(() => {
    if (currentStep === 2) {
      console.log('进入第二步，自动显示虚拟键盘');
      setShowKeyboardInitially(true);
    } else {
      setShowKeyboardInitially(false);
    }
  }, [currentStep, setShowKeyboardInitially]);

  // 根据记账类型筛选分类
  const filteredCategories = categories.filter((category) => category.type === type);

  // 处理返回按钮点击
  const handleBackClick = () => {
    router.back();
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      // 验证必填字段
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('请输入有效的金额');
        setSubmitting(false);
        return;
      }

      if (!categoryId) {
        toast.error('请选择分类');
        setSubmitting(false);
        return;
      }

      if (!currentAccountBook?.id) {
        toast.error('请先选择账本');
        setSubmitting(false);
        return;
      }

      // 合并日期和时间，使用本地时区避免UTC转换问题
      const [hours, minutes] = time.split(':');
      const [year, month, day] = date.split('-');
      const transactionDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // 月份从0开始
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0,
        0,
      );

      // 准备提交数据
      const transactionData = {
        amount: parseFloat(amount),
        type,
        categoryId,
        description: description || undefined,
        date: transactionDate.toISOString(),
        accountBookId: currentAccountBook.id,
        budgetId: budgetId || undefined,
        // 多人预算分摊相关数据
        isMultiBudget,
        budgetAllocation: isMultiBudget ? budgetAllocation : undefined,
      };

      console.log('准备提交交易数据:', {
        ...transactionData,
        isMultiBudget,
        budgetAllocationLength: budgetAllocation?.length || 0,
        budgetAllocation: budgetAllocation
      });

      // 提交数据
      const createdTransaction = await createTransaction(transactionData);
      console.log('createTransaction 返回结果:', createdTransaction);

      // 提交成功
      if (createdTransaction) {
        // 如果有选择标签，为新创建的记账添加标签
        if (tagIds.length > 0) {
          try {
            await tagApi.addTransactionTags(createdTransaction.id, { tagIds });
            console.log('成功为记账添加标签:', tagIds);
          } catch (error) {
            console.error('添加记账标签失败:', error);
            // 标签添加失败不影响记账创建成功的提示
          }
        }

        // 如果有附件，关联到新创建的记账
        if (attachments.length > 0) {
          try {
            for (const attachment of attachments) {
              // 如果是临时附件，需要关联到记账
              if (attachment.id.startsWith('temp-')) {
                await apiClient.post(`/transactions/${createdTransaction.id}/attachments/link`, {
                  fileId: attachment.fileId,
                  attachmentType: attachment.attachmentType,
                  description: attachment.description,
                });
              }
            }
            console.log('成功关联附件到记账:', attachments.length);
          } catch (error) {
            console.error('关联附件失败:', error);
            // 附件关联失败不影响记账创建成功的提示
          }
        }

        toast.success('记账记录已添加');
        resetForm();

        console.log('手动记账成功，准备触发记账变化事件');

        // 触发记账变化事件，让仪表盘自动刷新
        triggerTransactionChange(currentAccountBook.id);

        // 延迟跳转，确保事件能够被处理
        setTimeout(() => {
          console.log('延迟跳转到仪表盘页面');
          router.push('/dashboard');
        }, 100);
      } else {
        throw new Error('创建记账失败，服务器未返回有效响应');
      }
    } catch (error: any) {
      console.error('创建记账失败:', error);

      // 提取详细的错误信息
      let errorMessage = '创建记账失败，请重试';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.error('详细错误信息:', errorMessage);
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="添加记账"
      showBackButton={true}
      onBackClick={handleBackClick}
      showBottomNav={false}
    >
      <div style={{ padding: '0 16px' }}> {/* 减少从20px到16px */}
        {/* iOS 风格记账类型切换 */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--background-secondary)',
            borderRadius: '10px', /* 减少从12px到10px */
            padding: '3px', /* 减少从4px到3px */
            marginBottom: '16px', /* 减少从24px到16px */
          }}
        >
          <button
            onClick={() => useTransactionFormStore.getState().setType('EXPENSE')}
            disabled={submitting}
            style={{
              flex: 1,
              height: '36px', /* 减少从40px到36px */
              borderRadius: '7px', /* 减少从8px到7px */
              border: 'none',
              backgroundColor: type === 'EXPENSE' ? '#ef4444' : 'transparent',
              color: type === 'EXPENSE' ? 'white' : 'var(--text-color)',
              fontSize: '15px', /* 减少从16px到15px */
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            支出
          </button>
          <button
            onClick={() => useTransactionFormStore.getState().setType('INCOME')}
            disabled={submitting}
            style={{
              flex: 1,
              height: '36px', /* 减少从40px到36px */
              borderRadius: '7px', /* 减少从8px到7px */
              border: 'none',
              backgroundColor: type === 'INCOME' ? '#10b981' : 'transparent',
              color: type === 'INCOME' ? 'white' : 'var(--text-color)',
              fontSize: '15px', /* 减少从16px到15px */
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            收入
          </button>
        </div>

        {/* 使用 AmountInput 组件替代内联金额输入 */}
        <AmountInput />

        {/* iOS 风格步骤指示器 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '16px 0', /* 减少从24px到16px */
            gap: '12px', /* 减少从16px到12px */
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px', /* 减少从8px到6px */
            }}
          >
            <div
              style={{
                width: '20px', /* 减少从24px到20px */
                height: '20px', /* 减少从24px到20px */
                borderRadius: '10px', /* 减少从12px到10px */
                backgroundColor: currentStep >= 1 ? 'var(--primary-color)' : 'var(--border-color)',
                color: currentStep >= 1 ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px', /* 减少从12px到11px */
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
            >
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span
              style={{
                fontSize: '13px', /* 减少从14px到13px */
                fontWeight: '500',
                color: currentStep >= 1 ? 'var(--primary-color)' : 'var(--text-secondary)',
              }}
            >
              选择分类
            </span>
          </div>

          <div
            style={{
              width: '28px', /* 减少从32px到28px */
              height: '2px',
              backgroundColor: currentStep >= 2 ? 'var(--primary-color)' : 'var(--border-color)',
              borderRadius: '1px',
              transition: 'all 0.3s ease',
            }}
          ></div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px', /* 减少从8px到6px */
            }}
          >
            <div
              style={{
                width: '20px', /* 减少从24px到20px */
                height: '20px', /* 减少从24px到20px */
                borderRadius: '10px', /* 减少从12px到10px */
                backgroundColor: currentStep >= 2 ? 'var(--primary-color)' : 'var(--border-color)',
                color: currentStep >= 2 ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px', /* 减少从12px到11px */
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
            >
              2
            </div>
            <span
              style={{
                fontSize: '13px', /* 减少从14px到13px */
                fontWeight: '500',
                color: currentStep >= 2 ? 'var(--primary-color)' : 'var(--text-secondary)',
              }}
            >
              记账详情
            </span>
          </div>
        </div>

        {/* 第一步：分类选择 */}
        {currentStep === 1 && (
          <CategorySelector categories={filteredCategories} isLoading={isCategoriesLoading} />
        )}

        {/* 第二步：记账详情 */}
        {currentStep === 2 && (
          <div className="step-content" id="step-details">
            {/* 显示选中的分类 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px', /* 减少从12px到10px */
                padding: '12px', /* 减少从16px到12px */
                backgroundColor: 'var(--background-color)',
                border: '1px solid var(--primary-color)',
                borderRadius: '10px', /* 减少从12px到10px */
                marginBottom: '12px', /* 减少从16px到12px */
              }}
            >
              <div
                style={{
                  width: '42px', /* 减少从48px到42px */
                  height: '42px', /* 减少从48px到42px */
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px', /* 减少从18px到16px */
                }}
              >
                <i className={getIconClass(categoryIcon || '')}></i>
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: '15px', /* 减少从16px到15px */
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                }}
              >
                {categoryName || '未选择分类'}
              </span>
              <button
                onClick={() => goToStep(1)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '6px 12px', /* 减少从8px 16px到6px 12px */
                  borderRadius: '6px',
                  fontSize: '13px', /* 减少从14px到13px */
                  cursor: 'pointer',
                }}
              >
                更改
              </button>
            </div>

            <TransactionDetails onSubmit={handleSubmit} isSubmitting={submitting} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
