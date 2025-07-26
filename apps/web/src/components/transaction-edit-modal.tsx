'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/auth-store';
import { useTransactionStore } from '@/store/transaction-store';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { useBudgetStore } from '@/store/budget-store';
import { triggerTransactionChange } from '@/store/dashboard-store';
import { formatDateForInput, getIconClass } from '@/lib/utils';
import { TransactionType, UpdateTransactionData } from '@/types';
import { toast } from 'sonner';
import { budgetService } from '@/lib/api-services';
import { NumericKeyboard } from './transactions/numeric-keyboard';
import '../app/transactions/edit/[id]/transaction-edit.css';
import './transactions/transaction-add.css';
import './transactions/budget-selector.css';
import { MobileTagSection } from './tags/mobile-tag-section';
import { tagApi } from '@/lib/api/tag-api';
import { TagResponseDto } from '@/lib/api/types/tag.types';
import {
  TransactionAttachmentUpload,
  TransactionAttachment,
  TransactionAttachmentUploadRef,
} from './transactions/transaction-attachment-upload';
import { apiClient } from '@/lib/api-client';
import { useModalBackHandler } from '@/hooks/use-mobile-back-handler';
import { hapticPresets } from '@/lib/haptic-feedback';

interface TransactionEditModalProps {
  transactionId: string | null;
  transactionData: any;
  onClose: () => void;
  onSave: () => void;
}

// 预算显示类型定义
interface BudgetDisplay {
  id: string;
  name: string;
  amount: number;
  spent: number;
  rolloverAmount?: number;
  budgetType?: 'PERSONAL' | 'GENERAL';
  familyMemberName?: string;
  familyMemberId?: string;
  userId?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  period?: string;
}

// 预算选择器组件 - 使用添加记账页面的完整功能
function BudgetSelector({
  budgetId,
  setBudgetId,
  transactionDate,
  isEditMode = false,
}: {
  budgetId: string;
  setBudgetId: (id: string) => void;
  transactionDate: string;
  isEditMode?: boolean;
}) {
  const { currentAccountBook } = useAccountBookStore();
  const { user: currentUser } = useAuthStore();
  const [isBudgetSelectorOpen, setIsBudgetSelectorOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetDisplay | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [dateBudgets, setDateBudgets] = useState<BudgetDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originalBudgetId, setOriginalBudgetId] = useState<string>('');

  // 根据日期获取预算数据 - 使用与添加记账页面相同的API
  const fetchBudgetsByDate = useCallback(async (transactionDate: string, accountBookId: string) => {
    try {
      setIsLoading(true);
      console.log('根据日期获取预算:', { transactionDate, accountBookId });

      // 使用与添加记账页面相同的API
      const response = await budgetService.getBudgetsByDate(transactionDate, accountBookId);
      console.log('API响应完整信息:', response);

      // 检查响应格式
      if (!response || !Array.isArray(response)) {
        console.warn('预算API响应格式不正确:', response);
        setDateBudgets([]);
        return [];
      }

      // 转换预算数据格式
      const formattedBudgets: BudgetDisplay[] = response.map((budget: any) => ({
        id: budget.id,
        name: budget.name || budget.category?.name || '未知分类',
        amount: budget.amount,
        spent: budget.spent || 0,
        rolloverAmount: budget.rolloverAmount || 0,
        budgetType: budget.budgetType || 'PERSONAL',
        familyMemberName: budget.familyMemberName || budget.userName,
        familyMemberId: budget.familyMemberId,
        userId: budget.userId,
        userName: budget.userName,
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: budget.category,
        period: budget.period,
      }));

      console.log('格式化后的预算数据:', formattedBudgets);
      setDateBudgets(formattedBudgets);
      return formattedBudgets;
    } catch (error) {
      console.error('根据日期获取预算失败:', error);
      console.error('错误详情:', error);
      setDateBudgets([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 记录初始的budgetId（编辑模式下保持原始预算）
  useEffect(() => {
    if (isEditMode && budgetId && !originalBudgetId) {
      console.log('编辑模式：记录原始预算ID:', budgetId);
      setOriginalBudgetId(budgetId);
    }
  }, [budgetId, isEditMode, originalBudgetId]);

  // 监听日期和账本变化，重新获取预算
  useEffect(() => {
    if (transactionDate && currentAccountBook?.id) {
      console.log('日期或账本变化，重新获取预算:', {
        transactionDate,
        accountBookId: currentAccountBook.id,
      });
      fetchBudgetsByDate(transactionDate, currentAccountBook.id);

      // 编辑模式下不重置预算选择，保持原始预算
      if (!isEditMode) {
        setHasInitialized(false);
        setSelectedBudget(null);
        setBudgetId('');
      } else {
        console.log('编辑模式：保持原始预算选择，不重置');
        setHasInitialized(false);
        setSelectedBudget(null);
        // 不重置budgetId，保持原始值
      }
    }
  }, [transactionDate, currentAccountBook?.id, fetchBudgetsByDate, setBudgetId, isEditMode]);

  // 使用日期获取的预算数据
  const formattedBudgets: BudgetDisplay[] = dateBudgets;

  // 智能推荐预算的逻辑 - 在编辑模式下禁用
  const selectRecommendedBudget = useCallback(() => {
    if (isEditMode) {
      console.log('编辑模式：跳过智能推荐预算逻辑');
      return;
    }

    // 新增模式下的智能推荐逻辑可以在这里实现
    console.log('新增模式：可以执行智能推荐预算逻辑');
  }, [isEditMode]);

  // 当日期预算数据加载完成后，智能推荐预算
  useEffect(() => {
    selectRecommendedBudget();
  }, [selectRecommendedBudget]);

  // 根据budgetId查找选中的预算
  useEffect(() => {
    if (budgetId && formattedBudgets.length > 0 && !selectedBudget) {
      const budget = formattedBudgets.find((b) => b.id === budgetId);
      if (budget) {
        console.log(`找到匹配的预算: ${budget.id} - ${budget.name}`, { isEditMode });
        setSelectedBudget(budget);
      } else if (isEditMode && budgetId) {
        console.warn(`编辑模式：未在当前日期预算列表中找到原始预算 ${budgetId}`);
      }
    }
  }, [budgetId, formattedBudgets, selectedBudget, isEditMode]);

  // 处理预算选择
  const handleBudgetSelect = (budget: BudgetDisplay) => {
    setSelectedBudget(budget);
    setBudgetId(budget.id);
    setIsBudgetSelectorOpen(false);
  };

  // 处理清除预算选择
  const handleClearBudget = () => {
    setSelectedBudget(null);
    setBudgetId('');
    setIsBudgetSelectorOpen(false);
  };

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // 计算预算余额
  const calculateBudgetBalance = (budget: BudgetDisplay) => {
    const totalAmount = budget.amount + (budget.rolloverAmount || 0);
    return totalAmount - budget.spent;
  };

  // 获取预算显示名称
  const getBudgetDisplayName = (budget: BudgetDisplay) => {
    // 如果是个人预算且有家庭成员名称，显示成员名称
    if (budget.budgetType === 'PERSONAL' && budget.familyMemberName) {
      return budget.familyMemberName;
    }
    // 如果是通用预算，直接显示预算名称
    if (budget.budgetType === 'GENERAL') {
      return budget.name;
    }
    // 其他情况显示预算名称
    return budget.name;
  };

  // 获取预算有效期显示
  const getBudgetPeriod = (budget: BudgetDisplay) => {
    if (budget.startDate && budget.endDate) {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);

      // 如果是通用预算，显示包含年份的完整日期
      if (budget.budgetType === 'GENERAL') {
        const startStr = `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`;
        const endStr = `${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`;
        return `${startStr} - ${endStr}`;
      } else {
        // 个人预算只显示月/日
        const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
        const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
        return `${startStr} - ${endStr}`;
      }
    }
    return '未知周期';
  };

  // 判断预算是否推荐 - 编辑模式下不显示推荐标签
  const isRecommendedBudget = (budget: BudgetDisplay) => {
    // 编辑模式下不显示推荐标签
    if (isEditMode) {
      return false;
    }

    // 优先推荐与当前用户匹配的个人预算
    if (budget.familyMemberName === currentUser?.name && budget.budgetType === 'PERSONAL') {
      return true;
    }
    // 其次推荐没有familyMemberId的个人预算
    if (!budget.familyMemberId && budget.budgetType === 'PERSONAL') {
      return true;
    }
    return false;
  };

  // 获取预算状态
  const getBudgetStatus = (budget: BudgetDisplay) => {
    const balance = calculateBudgetBalance(budget);
    if (balance < 0) {
      return { status: 'over', text: '超支', color: '#ef4444' };
    } else if (balance / (budget.amount + (budget.rolloverAmount || 0)) < 0.2) {
      return { status: 'low', text: '余额不足', color: '#f59e0b' };
    } else {
      return { status: 'good', text: '正常', color: '#10b981' };
    }
  };

  return (
    <div className="budget-selector-container">
      {/* 预算选择器预览 - 使用添加记账页面的完整样式 */}
      <div className="budget-selector-preview" onClick={() => setIsBudgetSelectorOpen(true)}>
        <div className="budget-selector-icon">
          <i className="fas fa-wallet"></i>
        </div>
        <div className="budget-selector-info">
          {selectedBudget ? (
            <>
              <div className="budget-name">
                {getBudgetDisplayName(selectedBudget)}
                {isRecommendedBudget(selectedBudget) && (
                  <span className="recommended-badge">推荐</span>
                )}
              </div>
              <div className="budget-details">
                <span>余额: {formatAmount(calculateBudgetBalance(selectedBudget))}</span>
                <span className="budget-period">({getBudgetPeriod(selectedBudget)})</span>
              </div>
            </>
          ) : (
            <div className="budget-name">
              {transactionDate ? `选择 ${transactionDate} 的预算` : '请先选择日期'}
            </div>
          )}
        </div>
        <div className="budget-selector-arrow">
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>

      {/* 预算选择器弹窗 - 恢复原始样式 */}
      {isBudgetSelectorOpen && (
        <div className="budget-selector-overlay" onClick={() => setIsBudgetSelectorOpen(false)}>
          <div className="budget-selector-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="budget-selector-header">
              <h3>选择预算</h3>
              <button className="close-button" onClick={() => setIsBudgetSelectorOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="budget-selector-content">
              {isLoading ? (
                <div className="loading-state">加载中...</div>
              ) : formattedBudgets.length === 0 ? (
                <div className="no-budgets-message">
                  <i className="fas fa-info-circle"></i>
                  <span>
                    {transactionDate
                      ? `${transactionDate} 日期范围内没有可用的预算`
                      : '没有可用的预算'}
                  </span>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                    {transactionDate ? '请检查该日期是否在任何预算周期内' : '请先选择记账日期'}
                  </div>
                </div>
              ) : (
                <div className="budget-list">
                  {/* 不使用预算选项 */}
                  <div
                    className={`budget-item ${!selectedBudget ? 'active' : ''}`}
                    onClick={handleClearBudget}
                  >
                    <div className="budget-item-info">
                      <div className="budget-item-name">不使用预算</div>
                    </div>
                    {!selectedBudget && (
                      <div className="budget-item-check">
                        <i className="fas fa-check"></i>
                      </div>
                    )}
                  </div>

                  {/* 个人预算组 */}
                  {formattedBudgets.filter((b) => b.budgetType !== 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">个人预算</div>
                      {formattedBudgets
                        .filter((budget) => budget.budgetType !== 'GENERAL')
                        .map((budget) => {
                          const budgetStatus = getBudgetStatus(budget);
                          const isRecommended = isRecommendedBudget(budget);

                          return (
                            <div
                              key={budget.id}
                              className={`budget-item ${selectedBudget?.id === budget.id ? 'active' : ''} ${isRecommended ? 'recommended' : ''}`}
                              onClick={() => handleBudgetSelect(budget)}
                            >
                              <div className="budget-item-info">
                                <div className="budget-item-name">
                                  {getBudgetDisplayName(budget)}
                                  {isRecommended && (
                                    <span className="recommended-badge-small">推荐</span>
                                  )}
                                </div>
                                <div className="budget-item-details">
                                  <span>余额: {formatAmount(calculateBudgetBalance(budget))}</span>
                                  <span className="budget-period-small">
                                    ({getBudgetPeriod(budget)})
                                  </span>
                                </div>
                                <div
                                  className="budget-item-status"
                                  style={{ color: budgetStatus.color }}
                                >
                                  {budgetStatus.text}
                                </div>
                              </div>
                              {selectedBudget?.id === budget.id && (
                                <div className="budget-item-check">
                                  <i className="fas fa-check"></i>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </>
                  )}

                  {/* 通用预算组 */}
                  {formattedBudgets.filter((b) => b.budgetType === 'GENERAL').length > 0 && (
                    <>
                      <div className="budget-group-header">通用预算</div>
                      {formattedBudgets
                        .filter((budget) => budget.budgetType === 'GENERAL')
                        .map((budget) => {
                          const budgetStatus = getBudgetStatus(budget);
                          const isRecommended = isRecommendedBudget(budget);

                          return (
                            <div
                              key={budget.id}
                              className={`budget-item ${selectedBudget?.id === budget.id ? 'active' : ''} ${isRecommended ? 'recommended' : ''}`}
                              onClick={() => handleBudgetSelect(budget)}
                            >
                              <div className="budget-item-info">
                                <div className="budget-item-name">
                                  {getBudgetDisplayName(budget)}
                                  {isRecommended && (
                                    <span className="recommended-badge-small">推荐</span>
                                  )}
                                </div>
                                <div className="budget-item-details">
                                  <span>余额: {formatAmount(calculateBudgetBalance(budget))}</span>
                                  <span className="budget-period-small">
                                    ({getBudgetPeriod(budget)})
                                  </span>
                                </div>
                                <div
                                  className="budget-item-status"
                                  style={{ color: budgetStatus.color }}
                                >
                                  {budgetStatus.text}
                                </div>
                              </div>
                              {selectedBudget?.id === budget.id && (
                                <div className="budget-item-check">
                                  <i className="fas fa-check"></i>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionEditModal({
  transactionId,
  transactionData,
  onClose,
  onSave,
}: TransactionEditModalProps) {
  // 组件加载调试日志
  /* console.log('🔍 [TransactionEditModal] 组件初始化', {
    transactionId,
    transactionData,
    userAgent: navigator.userAgent,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    hasVisualViewport: !!window.visualViewport,
    viewportHeight: window.visualViewport?.height || window.innerHeight,
    documentHeight: document.documentElement.clientHeight,
    timestamp: new Date().toISOString()
  }); */

  const { isAuthenticated } = useAuthStore();
  const { transaction, isLoading, error, fetchTransaction, updateTransaction, deleteTransaction } =
    useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { fetchActiveBudgets } = useBudgetStore();

  // 表单状态
  const [formData, setFormData] = useState<UpdateTransactionData>({
    amount: 0,
    type: TransactionType.EXPENSE,
    categoryId: '',
    date: '',
    description: '',
  });

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [transactionTags, setTransactionTags] = useState<TagResponseDto[]>([]);

  const [budgetId, setBudgetId] = useState('');
  const [time, setTime] = useState('12:00');
  const [currentStep, setCurrentStep] = useState(2); // 默认进入第二步，与原有逻辑一致

  // 带有振动反馈的关闭处理函数
  const handleCloseWithHaptic = () => {
    hapticPresets.backButton();
    onClose();
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 附件上传组件的ref
  const attachmentUploadRef = useRef<TransactionAttachmentUploadRef>(null);

  // 删除相关状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 附件相关状态
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([]);

  // 移动端后退处理
  const { handleBack } = useModalBackHandler('transaction-edit-modal', onClose);

  // 虚拟键盘相关状态
  const [showNumericKeyboard, setShowNumericKeyboard] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  // 金额输入框引用
  const amountInputRef = useRef<HTMLInputElement>(null);

  // 当组件打开时，设置为编辑模式
  useEffect(() => {
    if (transactionId) {
      // 导入并使用 transaction form store 设置编辑模式
      const { setIsEditMode } =
        require('@/store/transaction-form-store').useTransactionFormStore.getState();
      setIsEditMode(true);

      return () => {
        // 组件卸载时重置编辑模式
        setIsEditMode(false);
      };
    }
  }, [transactionId]);

  // 初始化数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      fetchAccountBooks();
    }
  }, [isAuthenticated, fetchCategories, fetchAccountBooks]);

  // 获取预算数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id, fetchActiveBudgets]);

  // 获取真实记账数据
  useEffect(() => {
    if (transactionId && transactionId !== 'placeholder') {
      console.log('🔄 [TransactionEditModal] 开始获取记账数据:', transactionId);
      fetchTransaction(transactionId);
    }
  }, [transactionId, fetchTransaction]);

  // 使用获取到的记账数据或传入的数据初始化表单
  useEffect(() => {
    const dataToUse = transaction || transactionData;

    if (dataToUse) {
      console.log('🔄 [TransactionEditModal] 初始化表单数据:', dataToUse);

      const transactionDate = new Date(dataToUse.date);
      const hours = transactionDate.getHours().toString().padStart(2, '0');
      const minutes = transactionDate.getMinutes().toString().padStart(2, '0');

      const newFormData = {
        amount: dataToUse.amount,
        type: dataToUse.type,
        categoryId: dataToUse.categoryId || '',
        date: formatDateForInput(transactionDate),
        description: dataToUse.description || '',
      };

      console.log('🔄 [TransactionEditModal] 设置表单数据:', newFormData);
      setFormData(newFormData);
      setAmountInput(dataToUse.amount?.toString() || '');

      setBudgetId(dataToUse.budgetId || '');
      setTime(`${hours}:${minutes}`);
      setCurrentStep(2); // 直接进入详情步骤

      // 获取记账的标签和附件
      if (transactionId && transactionId !== 'placeholder') {
        // 获取标签
        tagApi
          .getTransactionTags(transactionId)
          .then((response) => {
            if (response.success) {
              setTransactionTags(response.data);
              setSelectedTagIds(response.data.map((tag) => tag.id));
            }
          })
          .catch((error) => {
            console.error('获取记账标签失败:', error);
          });

        // 获取附件
        console.log('📎 开始获取记账附件:', transactionId);
        apiClient
          .get(`/transactions/${transactionId}/attachments`)
          .then((data) => {
            console.log('📎 获取附件响应:', data);
            if (data.success) {
              console.log('📎 设置附件数据:', data.data);
              setAttachments(data.data || []);
            } else {
              console.warn('📎 获取附件失败，响应不成功:', data);
            }
          })
          .catch((error) => {
            console.error('📎 获取记账附件失败:', error);
          });
      }
    }
  }, [transaction, transactionData]);

  // 根据记账类型筛选分类
  const filteredCategories = categories.filter((category) => category.type === formData.type);

  // 获取选中的分类信息
  const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);

  // 处理表单提交
  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount?.toString() || '0');
    if (!formData.amount || amount <= 0) {
      setFormError('请输入有效的金额');
      return;
    }

    if (!formData.categoryId) {
      setFormError('请选择分类');
      return;
    }

    if (!formData.date) {
      setFormError('请选择日期');
      return;
    }

    if (!time) {
      setFormError('请选择时间');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const [hours, minutes] = time.split(':');
      const [year, month, day] = formData.date.split('-');
      const transactionDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0,
        0,
      );

      const updateData = {
        ...formData,
        amount,
        date: transactionDate.toISOString(),
        budgetId: budgetId || undefined,
      };

      const success = await updateTransaction(transactionId!, updateData);
      if (success) {
        toast.success('记账更新成功');

        // 更新记账标签
        if (transactionId && transactionId !== 'placeholder') {
          try {
            // 获取当前记账的标签
            const currentTagsResponse = await tagApi.getTransactionTags(transactionId);
            const currentTagIds = currentTagsResponse.success
              ? currentTagsResponse.data.map((tag) => tag.id)
              : [];

            // 计算需要添加和移除的标签
            const tagsToAdd = selectedTagIds.filter((id) => !currentTagIds.includes(id));
            const tagsToRemove = currentTagIds.filter((id) => !selectedTagIds.includes(id));

            // 添加新标签
            if (tagsToAdd.length > 0) {
              await tagApi.addTransactionTags(transactionId, { tagIds: tagsToAdd });
            }

            // 移除标签
            for (const tagId of tagsToRemove) {
              await tagApi.removeTransactionTag(transactionId, tagId);
            }
          } catch (error) {
            console.error('更新记账标签失败:', error);
            // 标签更新失败不影响记账更新成功的提示
          }
        }

        // 执行待删除的附件
        try {
          await attachmentUploadRef.current?.executePendingDeletes();
        } catch (error) {
          console.error('删除附件失败:', error);
          // 不影响记账保存成功的流程
        }

        // 触发记账变化事件，让仪表盘自动刷新
        if (currentAccountBook?.id) {
          triggerTransactionChange(currentAccountBook.id);
        }

        onSave();
      }
    } catch (error) {
      console.error('更新记账失败:', error);
      setFormError('更新记账失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 处理金额变化
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 只允许数字和小数点，最多两位小数
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmountInput(value);
      setFormData((prev) => ({
        ...prev,
        amount: parseFloat(value) || 0,
      }));
    }
  };

  // 虚拟键盘输入处理
  const handleKeyboardInput = (value: string) => {
    if (value === '=') {
      // 处理计算逻辑
      try {
        // 简单的计算器逻辑，支持 +、- 运算
        const result = Function('"use strict"; return (' + amountInput + ')')();
        if (typeof result === 'number' && !isNaN(result) && result >= 0) {
          const formattedResult = result.toFixed(2);
          setAmountInput(formattedResult);
          setFormData((prev) => ({
            ...prev,
            amount: result,
          }));
        }
      } catch (error) {
        console.warn('计算表达式无效:', amountInput);
      }
    } else {
      // 普通输入
      const newValue = amountInput + value;
      // 验证输入格式
      if (/^\d*\.?\d{0,2}$/.test(newValue) || /^[\d+\-.*]+$/.test(newValue)) {
        setAmountInput(newValue);
        // 如果是纯数字，更新表单数据
        const numericValue = parseFloat(newValue);
        if (!isNaN(numericValue)) {
          setFormData((prev) => ({
            ...prev,
            amount: numericValue,
          }));
        }
      }
    }
  };

  // 虚拟键盘删除处理
  const handleKeyboardDelete = () => {
    const newValue = amountInput.slice(0, -1);
    setAmountInput(newValue);
    setFormData((prev) => ({
      ...prev,
      amount: parseFloat(newValue) || 0,
    }));
  };

  // 虚拟键盘完成处理
  const handleKeyboardComplete = () => {
    setShowNumericKeyboard(false);
    // 确保最终值是有效的数字
    const finalValue = parseFloat(amountInput) || 0;
    setFormData((prev) => ({
      ...prev,
      amount: finalValue,
    }));
  };

  // 防止无限循环的标志
  const focusingRef = useRef(false);

  // 强制聚焦金额输入框的辅助函数
  const focusAmountInput = () => {
    // 防止无限循环
    if (focusingRef.current) {
      console.log('🔍 [focusAmountInput] 正在聚焦中，跳过');
      return;
    }

    console.log('🔍 [focusAmountInput] 开始执行', {
      inputRef: amountInputRef.current,
      activeElement: document.activeElement,
      documentHidden: document.hidden,
      visibilityState: document.visibilityState,
      timestamp: new Date().toISOString(),
    });

    // 检查页面是否可见
    if (document.hidden || document.visibilityState === 'hidden') {
      console.warn('🔍 [focusAmountInput] 页面不可见，跳过聚焦');
      return;
    }

    if (amountInputRef.current) {
      focusingRef.current = true;
      console.log('🔍 [focusAmountInput] 输入框引用存在，开始聚焦');

      // 移除只读属性（如果有的话）
      amountInputRef.current.removeAttribute('readonly');

      // 强制聚焦
      console.log('🔍 [focusAmountInput] 调用 focus()');
      amountInputRef.current.focus();

      // 检查是否成功聚焦
      setTimeout(() => {
        console.log('🔍 [focusAmountInput] 聚焦后状态', {
          activeElement: document.activeElement,
          isFocused: document.activeElement === amountInputRef.current,
        });
        focusingRef.current = false;
      }, 100);
    } else {
      console.warn('🔍 [focusAmountInput] 输入框引用不存在');
    }
  };

  // 处理金额输入框聚焦 - 显示虚拟键盘
  const handleAmountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('🔍 [AmountInput] onFocus 事件触发 - 显示虚拟键盘');
    e.preventDefault();
    e.stopPropagation();

    // 阻止系统键盘弹出
    if (amountInputRef.current) {
      amountInputRef.current.blur();
    }

    // 显示虚拟键盘
    setShowNumericKeyboard(true);

    // 初始化输入值
    setAmountInput(formData.amount?.toString() || '');
  };

  // 处理金额输入框点击 - 显示虚拟键盘
  const handleAmountClick = (e: React.MouseEvent<HTMLInputElement>) => {
    console.log('🔍 [AmountInput] onClick 事件触发 - 显示虚拟键盘');
    e.preventDefault();
    e.stopPropagation();

    // 阻止系统键盘弹出
    if (amountInputRef.current) {
      amountInputRef.current.blur();
    }

    // 显示虚拟键盘
    setShowNumericKeyboard(true);

    // 初始化输入值
    setAmountInput(formData.amount?.toString() || '');
  };

  // 处理记账类型变化
  const handleTypeChange = (type: TransactionType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      categoryId: '', // 重置分类选择
    }));
  };

  // 处理分类选择
  const handleCategorySelect = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryId,
    }));
    setCurrentStep(2);
  };

  // 处理删除记账
  const handleDeleteTransaction = async () => {
    if (!transactionId || transactionId === 'placeholder') {
      setFormError('无效的记账ID');
      return;
    }

    setIsDeleting(true);
    setFormError('');

    try {
      const success = await deleteTransaction(transactionId);
      if (success) {
        toast.success('记账删除成功');

        // 触发记账变化事件，让仪表盘自动刷新
        if (currentAccountBook?.id) {
          triggerTransactionChange(currentAccountBook.id);
        }

        // 关闭确认对话框并关闭模态框
        setShowDeleteConfirm(false);
        onSave(); // 调用 onSave 来刷新数据并关闭模态框
      }
    } catch (error) {
      console.error('删除记账失败:', error);
      setFormError('删除记账失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 隐藏仪表盘页面的头部，显示编辑记账的头部
  useEffect(() => {
    // 隐藏仪表盘的头部和底部导航
    const appContainer = document.querySelector('.app-container');
    const pageHeader = appContainer?.querySelector('.header');
    const bottomNav = document.querySelector('.bottom-nav');

    if (pageHeader) {
      (pageHeader as HTMLElement).style.display = 'none';
    }
    if (bottomNav) {
      (bottomNav as HTMLElement).style.display = 'none';
    }

    return () => {
      // 恢复显示
      if (pageHeader) {
        (pageHeader as HTMLElement).style.display = '';
      }
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
    };
  }, []);

  // 移动端键盘处理
  useEffect(() => {
    console.log('🔍 [KeyboardHandler] 初始化虚拟键盘检测', {
      hasVisualViewport: !!window.visualViewport,
      initialViewportHeight: window.visualViewport?.height || window.innerHeight,
      documentHeight: document.documentElement.clientHeight,
    });

    const handleResize = () => {
      // 检测键盘是否弹出（移动端视口高度变化）
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const documentHeight = document.documentElement.clientHeight;
      const heightRatio = viewportHeight / documentHeight;

      console.log('🔍 [KeyboardHandler] 视口大小变化', {
        viewportHeight,
        documentHeight,
        heightRatio,
        keyboardLikelyOpen: heightRatio < 0.75,
      });

      if (heightRatio < 0.75) {
        console.log('🔍 [KeyboardHandler] 检测到键盘可能已弹出');
        // 键盘可能已弹出，确保输入框可见
        if (amountInputRef.current) {
          setTimeout(() => {
            console.log('🔍 [KeyboardHandler] 滚动到输入框位置');
            amountInputRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 100);
        }
      } else {
        console.log('🔍 [KeyboardHandler] 键盘可能已收起');
      }
    };

    // 监听视口变化
    if (window.visualViewport) {
      console.log('🔍 [KeyboardHandler] 使用 visualViewport API');
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      console.log('🔍 [KeyboardHandler] 使用 window resize 事件');
      window.addEventListener('resize', handleResize);
    }

    return () => {
      console.log('🔍 [KeyboardHandler] 清理事件监听器');
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--background-color)',
        zIndex: 250, // 设置合理的层级，高于分类记账模态框的220
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // 移动端优化
        WebkitOverflowScrolling: 'touch',
        // 确保可以接收触摸事件
        touchAction: 'manipulation',
        // 尝试修复虚拟键盘问题
        transform: 'translateZ(0)', // 强制硬件加速
        WebkitTransform: 'translateZ(0)',
      }}
    >
      {/* 使用完全相同的应用容器结构 */}
      <div
        className="app-container"
        style={{
          maxWidth: 'none',
          margin: 0,
          width: '100%',
          height: '100vh',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          // 移动端优化
          WebkitOverflowScrolling: 'touch',
          // 确保输入框可以正常工作
          isolation: 'isolate',
        }}
      >
        {/* 编辑记账的头部 */}
        <div className="header">
          <button className="icon-button" onClick={handleCloseWithHaptic}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="header-title">编辑记账</div>
          <div style={{ width: '32px' }}></div>
        </div>

        {/* 主要内容 */}
        <div
          className="main-content"
          style={{
            overflowY: 'auto',
            // 移动端键盘优化
            WebkitOverflowScrolling: 'touch',
            // 大幅减少底部padding，移除多余空白
            paddingBottom: '0', /* 移除底部padding */
            // 防止键盘遮挡内容
            minHeight: 'calc(100vh - 60px)', // 减去头部高度
          }}
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
                onClick={() => handleTypeChange(TransactionType.EXPENSE)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  height: '36px', /* 减少从40px到36px */
                  borderRadius: '7px', /* 减少从8px到7px */
                  border: 'none',
                  backgroundColor:
                    formData.type === TransactionType.EXPENSE ? '#ef4444' : 'transparent',
                  color: formData.type === TransactionType.EXPENSE ? 'white' : 'var(--text-color)',
                  fontSize: '15px', /* 减少从16px到15px */
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                支出
              </button>
              <button
                onClick={() => handleTypeChange(TransactionType.INCOME)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  height: '36px', /* 减少从40px到36px */
                  borderRadius: '7px', /* 减少从8px到7px */
                  border: 'none',
                  backgroundColor:
                    formData.type === TransactionType.INCOME ? '#10b981' : 'transparent',
                  color: formData.type === TransactionType.INCOME ? 'white' : 'var(--text-color)',
                  fontSize: '15px', /* 减少从16px到15px */
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                收入
              </button>
            </div>

            {/* iOS 风格金额输入 */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '16px', /* 减少从24px到16px */
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px', /* 减少从8px到6px */
                  marginBottom: '6px', /* 减少从8px到6px */
                  padding: '12px', /* 减少从16px到12px */
                  backgroundColor: 'var(--background-secondary)',
                  borderRadius: '10px', /* 减少从12px到10px */
                  border: '1px solid var(--border-color)',
                  minHeight: '48px', /* 减少从60px到48px */
                  // 确保容器不会阻止点击事件
                  pointerEvents: 'auto',
                }}
                // 点击容器显示虚拟键盘
                onClick={(e) => {
                  console.log('🔍 [AmountContainer] 容器被点击 - 显示虚拟键盘');
                  e.stopPropagation();

                  // 显示虚拟键盘
                  setShowNumericKeyboard(true);

                  // 初始化输入值
                  setAmountInput(formData.amount?.toString() || '');
                }}
              >
                <span
                  style={{
                    fontSize: '20px', /* 减少从24px到20px */
                    fontWeight: '300',
                    color: 'var(--text-secondary)',
                    pointerEvents: 'none', // 防止符号阻止点击
                  }}
                >
                  ¥
                </span>
                <input
                  ref={amountInputRef}
                  type="text"
                  placeholder="0.00"
                  value={formData.amount || ''}
                  readOnly
                  onFocus={handleAmountFocus}
                  onClick={handleAmountClick}
                  disabled={isSubmitting}
                  style={{
                    fontSize: '24px', /* 减少从28px到24px */
                    fontWeight: '400',
                    color: 'var(--text-color)',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '180px', /* 减少从200px到180px */
                    padding: '6px', /* 减少从8px到6px */
                    cursor: 'pointer',
                    // 移动端优化
                    WebkitAppearance: 'none',
                    // 确保输入框可以接收点击事件
                    pointerEvents: 'auto',
                    // 防止用户选择
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    // 确保在移动端可以点击
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                />
              </div>
            </div>

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
                    backgroundColor:
                      currentStep >= 1 ? 'var(--primary-color)' : 'var(--border-color)',
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
                  backgroundColor:
                    currentStep >= 2 ? 'var(--primary-color)' : 'var(--border-color)',
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
                    backgroundColor:
                      currentStep >= 2 ? 'var(--primary-color)' : 'var(--border-color)',
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
              <div className="step-content">
                <h3 className="step-title">选择分类</h3>
                <div className="category-section">
                  <div className="category-grid">
                    {filteredCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`category-item ${formData.categoryId === category.id ? 'active' : ''} ${isSubmitting ? 'disabled' : ''}`}
                        onClick={() => !isSubmitting && handleCategorySelect(category.id)}
                      >
                        <div className="category-icon-wrapper">
                          <i className={getIconClass(category.icon)}></i>
                        </div>
                        <div className="category-name">{category.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 第二步：记账详情 */}
            {currentStep === 2 && (
              <div className="step-content">
                <h3 className="step-title">填写详情</h3>

                {/* 显示选中的分类 - 恢复原始样式 */}
                {selectedCategory && (
                  <div className="selected-category">
                    <div className="category-icon-wrapper">
                      <i className={getIconClass(selectedCategory.icon)}></i>
                    </div>
                    <span>{selectedCategory.name}</span>
                    <button className="change-category-btn" onClick={() => setCurrentStep(1)}>
                      更改
                    </button>
                  </div>
                )}

                {/* iOS 风格表单 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}> {/* 减少从16px到12px */}
                  {/* 描述输入 */}
                  <div
                    style={{
                      backgroundColor: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px', /* 减少从12px到10px */
                      padding: '12px', /* 减少从16px到12px */
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px', /* 减少从14px到13px */
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px', /* 减少从8px到6px */
                      }}
                    >
                      描述
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="添加描述..."
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '15px', /* 减少从16px到15px */
                        color: 'var(--text-color)',
                        padding: '0',
                      }}
                    />
                  </div>

                  {/* 日期和时间 - 并排布局 */}
                  <div style={{ display: 'flex', gap: '10px' }}> {/* 减少从12px到10px */}
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--background-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px', /* 减少从12px到10px */
                        padding: '12px', /* 减少从16px到12px */
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px', /* 减少从14px到13px */
                          fontWeight: '500',
                          color: 'var(--text-secondary)',
                          marginBottom: '6px', /* 减少从8px到6px */
                        }}
                      >
                        日期
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '15px', /* 减少从16px到15px */
                          color: 'var(--text-color)',
                          padding: '0',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--background-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px', /* 减少从12px到10px */
                        padding: '12px', /* 减少从16px到12px */
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px', /* 减少从14px到13px */
                          fontWeight: '500',
                          color: 'var(--text-secondary)',
                          marginBottom: '6px', /* 减少从8px到6px */
                        }}
                      >
                        时间
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '15px', /* 减少从16px到15px */
                          color: 'var(--text-color)',
                          padding: '0',
                        }}
                      />
                    </div>
                  </div>

                  {/* 预算选择（仅支出类型显示） */}
                  {formData.type === TransactionType.EXPENSE && (
                    <div
                      style={{
                        backgroundColor: 'var(--background-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px', /* 减少从12px到10px */
                        padding: '12px', /* 减少从16px到12px */
                      }}
                    >
                      <BudgetSelector
                        budgetId={budgetId}
                        setBudgetId={setBudgetId}
                        transactionDate={formData.date || ''}
                        isEditMode={true}
                      />
                    </div>
                  )}

                  {/* 移动端优化的标签选择 */}
                  {currentAccountBook?.id && (
                    <div
                      style={{
                        backgroundColor: 'var(--background-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px', /* 减少从12px到10px */
                        padding: '12px', /* 减少从16px到12px */
                        marginBottom: '12px', /* 减少从16px到12px */
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px', /* 减少从14px到13px */
                          fontWeight: '500',
                          color: 'var(--text-secondary)',
                          marginBottom: '8px', /* 减少从12px到8px */
                        }}
                      >
                        标签
                      </label>

                      {/* 使用移动端优化的标签组件 */}
                      <MobileTagSection
                        accountBookId={currentAccountBook.id}
                        categoryId={formData.categoryId}
                        description={formData.description}
                        amount={parseFloat(formData.amount) || undefined}
                        selectedTagIds={selectedTagIds}
                        onSelectionChange={setSelectedTagIds}
                        disabled={isSubmitting}
                        onTagSelectionComplete={() => {
                          // 标签选择完成时的自动保存逻辑可以在这里添加
                          console.log('标签选择完成，当前选中:', selectedTagIds);
                        }}
                      />
                    </div>
                  )}

                  {/* 附件上传 */}
                  <div
                    style={{
                      backgroundColor: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px', /* 减少从12px到10px */
                      padding: '12px', /* 减少从16px到12px */
                      marginBottom: '12px', /* 减少从16px到12px */
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px', /* 减少从14px到13px */
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px', /* 减少从12px到8px */
                      }}
                    >
                      附件
                    </label>

                    <TransactionAttachmentUpload
                      ref={attachmentUploadRef}
                      transactionId={transactionId || undefined}
                      initialAttachments={attachments}
                      disabled={isSubmitting}
                      onChange={setAttachments}
                    />
                  </div>
                </div>

                {/* 错误信息 */}
                {formError && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '10px', /* 减少从12px到10px */
                      margin: '12px 0', /* 减少从16px到12px */
                      color: '#dc2626',
                      fontSize: '13px', /* 减少从14px到13px */
                      textAlign: 'center',
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* iOS 风格操作按钮 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px', /* 减少从12px到10px */
                    marginTop: '16px', /* 减少间距 */
                    paddingBottom: '0', /* 移除底部padding，减少空白 */
                  }}
                >
                  {/* 保存和上一步按钮 */}
                  <div style={{ display: 'flex', gap: '10px' }}> {/* 减少从12px到10px */}
                    <button
                      onClick={() => setCurrentStep(1)}
                      disabled={isSubmitting || isDeleting}
                      style={{
                        flex: 1,
                        height: '44px', /* 减少从48px到44px */
                        borderRadius: '10px', /* 减少从12px到10px */
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--background-color)',
                        color: 'var(--text-color)',
                        fontSize: '15px', /* 减少从16px到15px */
                        fontWeight: '500',
                        cursor: isSubmitting || isDeleting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting || isDeleting ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      上一步
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || isDeleting}
                      style={{
                        flex: 2,
                        height: '44px', /* 减少从48px到44px */
                        borderRadius: '10px', /* 减少从12px到10px */
                        border: 'none',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        fontSize: '15px', /* 减少从16px到15px */
                        fontWeight: '600',
                        cursor: isSubmitting || isDeleting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting || isDeleting ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {isSubmitting ? '保存中...' : '保存'}
                    </button>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={
                      isSubmitting ||
                      isDeleting ||
                      !transactionId ||
                      transactionId === 'placeholder'
                    }
                    style={{
                      width: '100%',
                      height: '44px', /* 减少从48px到44px */
                      borderRadius: '10px', /* 减少从12px到10px */
                      border: '1px solid #ef4444',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      fontSize: '15px', /* 减少从16px到15px */
                      fontWeight: '500',
                      cursor:
                        isSubmitting ||
                        isDeleting ||
                        !transactionId ||
                        transactionId === 'placeholder'
                          ? 'not-allowed'
                          : 'pointer',
                      opacity:
                        isSubmitting ||
                        isDeleting ||
                        !transactionId ||
                        transactionId === 'placeholder'
                          ? 0.4
                          : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px', /* 减少从8px到6px */
                    }}
                  >
                    <i className="fas fa-trash" style={{ fontSize: '13px' }}></i> {/* 减少从14px到13px */}
                    删除记录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--background-color)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '340px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* 对话框头部 */}
              <div
                style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--text-color)',
                    margin: 0,
                  }}
                >
                  确认删除
                </h3>
              </div>

              {/* 对话框内容 */}
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '16px',
                  lineHeight: '1.5',
                }}
              >
                <p style={{ margin: '0 0 8px' }}>确定要删除这条记账记录吗？</p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#ef4444',
                    fontWeight: '500',
                  }}
                >
                  此操作不可恢复，请谨慎操作。
                </p>
              </div>

              {/* 对话框按钮 */}
              <div
                style={{
                  display: 'flex',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: '16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.6 : 1,
                    borderRight: '1px solid var(--border-color)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteTransaction}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: '16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 虚拟数字键盘 */}
      {showNumericKeyboard && (
        <NumericKeyboard
          onInput={handleKeyboardInput}
          onDelete={handleKeyboardDelete}
          onComplete={handleKeyboardComplete}
        />
      )}
    </div>,
    document.body,
  );
}
