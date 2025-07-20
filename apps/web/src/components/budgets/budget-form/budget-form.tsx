'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBudgetFormStore } from '@/store/budget-form-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useTokenMonitor } from '@/hooks/use-token-monitor';
import { apiClient } from '@/lib/api-client';
import { BasicInfoSection } from './basic-info-section';
import { TimeSettingsSection } from './time-settings-section';
import { CategoryBudgetSection } from './category-budget-section';
import { BudgetTypeCard } from './budget-type-card';
import { RolloverInfoSection } from './rollover-info-section';
import '@/styles/budget-form.css';

interface BudgetFormProps {
  mode: 'create' | 'edit';
  budgetId?: string;
}

export function BudgetForm({ mode, budgetId }: BudgetFormProps) {
  const router = useRouter();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { currentAccountBook } = useAccountBookStore();

  // 使用token监控Hook
  const { isTokenValid, isRefreshing, refreshToken } = useTokenMonitor({
    autoRedirect: true, // 在独立页面中自动跳转
    onTokenRefreshed: () => {
      console.log('✅ 预算表单：Token刷新成功');
      // Token刷新成功后，如果是编辑模式且有budgetId，重新加载数据
      if (mode === 'edit' && budgetId && budgetId !== 'placeholder') {
        loadBudgetData(budgetId);
      }
    },
  });
  const {
    mode: formMode,
    budgetType,
    enableRollover,
    setMode,
    setBudgetId,
    setCategories,
    loadBudgetData,
    submitForm,
    isLoading,
    isSubmitting,
    resetForm,
    errors,
  } = useBudgetFormStore();

  // 设置表单模式
  useEffect(() => {
    setMode(mode);
    if (mode === 'edit' && budgetId) {
      setBudgetId(budgetId);

      // 如果是占位符，不执行数据加载
      if (budgetId === 'placeholder') {
        return;
      }

      // 检查token有效性
      if (!isTokenValid) {
        console.warn('⚠️ Token无效');
        return;
      }

      loadBudgetData(budgetId);
    } else {
      resetForm();
    }
  }, [mode, budgetId, isTokenValid, setMode, setBudgetId, loadBudgetData, resetForm]);

  // 加载初始数据
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsDataLoading(true);

        // 加载分类数据
        const categoriesResponse = await apiClient.get('/categories?type=EXPENSE');
        const categories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];

        // 设置数据到store
        setCategories(categories);
      } catch (error) {
        console.error('加载初始数据失败:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadInitialData();
  }, [setCategories]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountBook) {
      console.error('没有选择账本');
      return;
    }
    const success = await submitForm(currentAccountBook.id);
    if (success) {
      // 添加短暂延迟确保数据刷新完成
      setTimeout(() => {
        router.push('/budgets');
      }, 100);
    }
  };

  // 处理取消
  const handleCancel = () => {
    router.push('/budgets');
  };

  // 检查token有效性
  if (!isTokenValid) {
    return (
      <div className="budget-form">
        <div className="form-section">
          <div className="error-message">
            <i className="fas fa-lock"></i>
            <span>Token已失效，请重新登录</span>
            {isRefreshing ? (
              <button type="button" className="retry-button" disabled>
                <span className="loading-spinner"></span>
                刷新中...
              </button>
            ) : (
              <div className="button-group">
                <button type="button" onClick={refreshToken} className="retry-button">
                  <i className="fas fa-redo"></i>
                  重试
                </button>
                <button
                  type="button"
                  onClick={() => (window.location.href = '/auth/login')}
                  className="retry-button"
                >
                  <i className="fas fa-sign-in-alt"></i>
                  登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 如果正在加载，显示加载状态
  if (isLoading || isDataLoading) {
    return (
      <div className="budget-form">
        <div className="form-section">
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  // 如果是占位符，显示占位符信息
  if (mode === 'edit' && budgetId === 'placeholder') {
    return (
      <div className="budget-form">
        <div className="form-section">
          <div className="placeholder-message">
            <i className="fas fa-info-circle"></i>
            <span>
              这是一个静态导出的占位符页面。在实际应用中，请通过正确的路由访问预算编辑页面。
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      {/* 错误提示 */}
      {errors.general && (
        <div className="form-section">
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{errors.general}</span>
            {mode === 'edit' && budgetId && budgetId !== 'placeholder' && (
              <button
                type="button"
                onClick={() => loadBudgetData(budgetId)}
                className="retry-button"
                disabled={isLoading}
              >
                <i className="fas fa-redo"></i>
                重试
              </button>
            )}
          </div>
        </div>
      )}

      {/* 预算类型说明 - 仅在创建模式显示 */}
      {mode === 'create' && (
        <div className="form-section">
          <BudgetTypeCard />
        </div>
      )}

      {/* 基本信息区块 */}
      <BasicInfoSection />

      {/* 时间设置区块 */}
      <TimeSettingsSection />

      {/* 分类预算区块 */}
      <CategoryBudgetSection />

      {/* 结转信息区块 - 仅个人预算且启用结转时显示 */}
      {formMode === 'edit' && budgetType === 'PERSONAL' && enableRollover && (
        <RolloverInfoSection />
      )}

      {/* 提交按钮 */}
      <div className="form-section">
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="loading-spinner"></span>
              {mode === 'create' ? '保存中...' : '更新中...'}
            </>
          ) : mode === 'create' ? (
            '保存预算'
          ) : (
            '保存修改'
          )}
        </button>
      </div>
    </form>
  );
}
