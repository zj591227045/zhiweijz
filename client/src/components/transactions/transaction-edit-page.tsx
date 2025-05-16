"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTransactionEditStore } from "@/store/transaction-edit-store";
import { useTransactionDetail, useUpdateTransaction } from "@/hooks/use-transaction-detail";
import { getCategories, getAccountBooks } from "@/lib/api/transaction-service";
import { TransactionType } from "@/types";
import { formatDateForAPI, cn } from "@/lib/utils";
import { TransactionTypeToggle } from "./transaction-type-toggle";
import { CategorySelector } from "./transaction-edit/category-selector";
import { StepIndicator } from "./transaction-edit/step-indicator";

// 获取图标类名
function getIconClass(iconName: string): string {
  if (!iconName) return "fas fa-question";

  // 如果图标名称已经包含完整的类名，则直接返回
  if (iconName.startsWith("fa-")) {
    return `fas ${iconName}`;
  }

  // 根据图标名称映射到Font Awesome图标
  const iconMap: Record<string, string> = {
    restaurant: "fa-utensils",
    shopping: "fa-shopping-bag",
    transport: "fa-bus",
    home: "fa-home",
    clothing: "fa-tshirt",
    entertainment: "fa-gamepad",
    medical: "fa-heartbeat",
    education: "fa-graduation-cap",
    gift: "fa-gift",
    travel: "fa-plane",
    communication: "fa-mobile-alt",
    // 添加更多图标映射...
  };

  return `fas ${iconMap[iconName] || "fa-question"}`;
}

// 金额输入组件
function AmountInput() {
  const { amount, setAmount } = useTransactionEditStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // 处理金额输入
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 只允许输入数字和小数点
    if (/^$|^[0-9]+\.?[0-9]*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <div className="amount-input-container">
      <span className="currency-symbol">¥</span>
      <input
        ref={inputRef}
        type="text"
        className="amount-input"
        placeholder="0.00"
        value={amount}
        onChange={handleAmountChange}
        inputMode="decimal"
      />
    </div>
  );
}

export function TransactionEditPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params?.id as string;

  const {
    originalTransaction,
    amount, type, categoryId, categoryName, categoryIcon, description,
    date, time, accountBookId, familyId, familyMemberId, notes,
    currentStep, isSubmitting,
    setOriginalTransaction, setAccountBookId, resetForm, setSubmitting, setSubmitError,
    setDescription, setDate, setTime, setNotes, goToStep
  } = useTransactionEditStore();

  // 获取交易详情
  const { data: transaction, isLoading: isTransactionLoading, isError: isTransactionError } = useTransactionDetail(transactionId);

  // 获取分类列表
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => getCategories(type),
  });

  // 获取账本列表
  const { data: accountBooksData } = useQuery({
    queryKey: ["accountBooks"],
    queryFn: getAccountBooks,
  });

  // 更新交易的mutation
  const updateTransaction = useUpdateTransaction();

  // 当交易数据加载完成后，设置表单初始值
  useEffect(() => {
    if (transaction && !originalTransaction) {
      setOriginalTransaction(transaction);
    }
  }, [transaction, originalTransaction, setOriginalTransaction]);

  // 当账本数据加载完成后，设置默认账本
  useEffect(() => {
    if (accountBooksData && accountBooksData.length > 0 && !accountBookId) {
      setAccountBookId(accountBooksData[0].id);
    }
  }, [accountBooksData, accountBookId, setAccountBookId]);

  // 组件卸载时重置表单
  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

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

      if (!accountBookId) {
        toast.error("请选择账本");
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
        date: formatDateForAPI(transactionDate),
        accountBookId,
        familyId: familyId || undefined,
        familyMemberId: familyMemberId || undefined,
        notes: notes || undefined,
      };

      // 提交数据
      await updateTransaction.mutateAsync({
        id: transactionId,
        data: transactionData,
      });

      // 提交成功
      toast.success("交易记录已更新");
      router.push(`/transactions/${transactionId}`);
    } catch (error) {
      console.error("更新交易失败:", error);
      toast.error("更新交易失败，请重试");
      setSubmitError("更新交易失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 如果正在加载交易数据，显示加载状态
  if (isTransactionLoading) {
    return (
      <div className="app-container">
        <header className="header">
          <button className="icon-button back-button" onClick={handleBackClick}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="header-title">编辑交易</div>
          <div></div>
        </header>
        <div className="main-content">
          <div className="loading-state">加载中...</div>
        </div>
      </div>
    );
  }

  // 如果加载交易数据出错，显示错误状态
  if (isTransactionError) {
    return (
      <div className="app-container">
        <header className="header">
          <button className="icon-button back-button" onClick={handleBackClick}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="header-title">编辑交易</div>
          <div></div>
        </header>
        <div className="main-content">
          <div className="error-state">加载交易数据失败，请重试</div>
          <button className="retry-button" onClick={() => router.refresh()}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="header">
        <button className="icon-button back-button" onClick={handleBackClick}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-title">编辑交易</div>
        <div></div> {/* 占位，保持标题居中 */}
      </header>

      {/* 主要内容区域 */}
      <main className="main-content">
        {/* 交易类型切换 */}
        <TransactionTypeToggle />

        {/* 金额输入 */}
        <AmountInput />

        {/* 步骤指示器 */}
        <StepIndicator />

        {/* 第一步：分类选择 */}
        {currentStep === 1 && (
          <CategorySelector
            categories={categories || []}
            isLoading={isCategoriesLoading}
          />
        )}

        {/* 第二步：交易详情 */}
        {currentStep === 2 && (
          <div className="step-content" id="step-details">
            <h3 className="step-title">填写详情</h3>
            <div className="selected-category">
              <div className="category-icon-wrapper">
                <i className={getIconClass(categoryIcon || "")}></i>
              </div>
              <span>{categoryName || "未选择分类"}</span>
              <button className="change-category-btn" onClick={() => goToStep(1)}>
                更改
              </button>
            </div>

            <div className="transaction-form">
              <div className="form-group">
                <label className="form-label">描述</label>
                <div className="form-input">
                  <input
                    type="text"
                    placeholder="添加描述..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">日期</label>
                <div className="form-input">
                  <input
                    type="date"
                    value={date.toISOString().split('T')[0]}
                    onChange={(e) => setDate(new Date(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">时间</label>
                <div className="form-input">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">账本</label>
                <div className="form-input">
                  <select
                    value={accountBookId || ""}
                    onChange={(e) => setAccountBookId(e.target.value)}
                  >
                    <option value="" disabled>
                      选择账本
                    </option>
                    {accountBooksData?.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">备注</label>
                <div className="form-input">
                  <textarea
                    placeholder="添加备注..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部按钮 */}
      <div className="bottom-button-container">
        {/* 第一步按钮 */}
        {currentStep === 1 && (
          <button
            className="next-button"
            onClick={() => goToStep(2)}
          >
            下一步
          </button>
        )}

        {/* 第二步按钮 */}
        {currentStep === 2 && (
          <div className="step2-buttons">
            <button
              className="back-button"
              onClick={() => goToStep(1)}
              disabled={isSubmitting}
            >
              上一步
            </button>
            <button
              className="save-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
