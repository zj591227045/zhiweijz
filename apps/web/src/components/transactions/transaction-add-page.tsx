"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { useTransactionFormStore } from "@/store/transaction-form-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useCategoryStore } from "@/store/category-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { useBudgetStore } from "@/store/budget-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { AmountInput } from "./amount-input";
import { TransactionTypeToggle } from "./transaction-type-toggle";
import { CategorySelector } from "./category-selector";
import { TransactionDetails } from "./transaction-details";
import { StepIndicator } from "./step-indicator";
import { getIconClass } from "@/lib/utils";
import { TransactionType } from "@/types";
import { toast } from "sonner";
import "./transaction-add.css";

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
    goToStep,
    resetForm
  } = useTransactionFormStore();

  const { createTransaction } = useTransactionStore();
  const { categories, fetchCategories, isLoading: isCategoriesLoading } = useCategoryStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { budgets, fetchActiveBudgets } = useBudgetStore();
  const { refreshDashboardData } = useDashboardStore();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 获取数据
  useEffect(() => {
    fetchCategories();
    fetchAccountBooks();
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [fetchCategories, fetchAccountBooks, fetchActiveBudgets, currentAccountBook?.id]);

  // 检查智能记账结果
  useEffect(() => {
    const smartResult = sessionStorage.getItem('smartAccountingResult');
    if (smartResult) {
      try {
        const result = JSON.parse(smartResult);
        // 预填充表单数据
        // 这里可以根据智能识别结果预填充表单
        console.log("智能记账结果:", result);
        sessionStorage.removeItem('smartAccountingResult');
      } catch (error) {
        console.error("解析智能记账结果失败:", error);
      }
    }
  }, []);

  // 根据交易类型筛选分类
  const filteredCategories = categories.filter(category => category.type === type);

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
        toast.error("请输入有效的金额");
        setSubmitting(false);
        return;
      }

      if (!categoryId) {
        toast.error("请选择分类");
        setSubmitting(false);
        return;
      }

      if (!currentAccountBook?.id) {
        toast.error("请先选择账本");
        setSubmitting(false);
        return;
      }

      // 合并日期和时间
      const [hours, minutes] = time.split(":");
      const transactionDate = new Date(date);
      transactionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // 准备提交数据
      const transactionData = {
        amount: parseFloat(amount),
        type,
        categoryId,
        description: description || undefined,
        date: transactionDate.toISOString(),
        accountBookId: currentAccountBook.id,
        budgetId: budgetId || undefined,
      };

      // 提交数据
      const success = await createTransaction(transactionData);

      // 提交成功
      if (success) {
        toast.success("交易记录已添加");
        resetForm();
        
        // 刷新仪表盘数据
        if (currentAccountBook?.id) {
          refreshDashboardData(currentAccountBook.id);
        }
        
        router.push("/dashboard");
      } else {
        throw new Error("创建交易失败，服务器未返回有效响应");
      }
    } catch (error) {
      console.error("创建交易失败:", error);
      setSubmitError("创建交易失败，请重试");
      toast.error("创建交易失败，请重试");
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
      <div className="transaction-add-content">
        {/* 交易类型切换 */}
        <TransactionTypeToggle />

        {/* 金额输入 */}
        <AmountInput />

        {/* 步骤指示器 */}
        <StepIndicator />

        {/* 第一步：分类选择 */}
        {currentStep === 1 && (
          <CategorySelector
            categories={filteredCategories}
            isLoading={isCategoriesLoading}
          />
        )}

        {/* 第二步：交易详情 */}
        {currentStep === 2 && (
          <div className="step-content" id="step-details">
            <div className="selected-category">
              <div className="category-icon-wrapper">
                <i className={getIconClass(categoryIcon || "")}></i>
              </div>
              <span>{categoryName || "未选择分类"}</span>
              <button className="change-category-btn" onClick={() => goToStep(1)}>
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
