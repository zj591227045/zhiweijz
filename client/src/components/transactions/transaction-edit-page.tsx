"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTransactionEditStore } from "@/store/transaction-edit-store";
import { useTransactionDetail, useUpdateTransaction } from "@/hooks/use-transaction-detail";
import { triggerTransactionChange } from "@/store/dashboard-store";
import { getCategories, getAccountBooks } from "@/lib/api/transaction-service";
import { TransactionType } from "@/types";
import { formatDateForAPI, cn, getCategoryIconClass } from "@/lib/utils";
import { TransactionTypeToggle } from "./transaction-type-toggle";
import { CategorySelector } from "./transaction-edit/category-selector";
import { StepIndicator } from "./transaction-edit/step-indicator";
import { NumericKeyboard } from "./numeric-keyboard";
import { BudgetSelector } from "./transaction-edit/budget-selector";

// 获取图标类名
function getIconClass(iconName: string): string {
  if (!iconName) return "fas fa-question";
  const iconClass = getCategoryIconClass(iconName);
  return `fas ${iconClass}`;
}

// 金额输入组件
function AmountInput() {
  const { amount, setAmount } = useTransactionEditStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // 处理金额输入
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 只允许输入数字和小数点
    if (/^$|^[0-9]+\.?[0-9]*$/.test(value)) {
      setAmount(value);
    }
  };

  // 处理输入框点击，显示虚拟键盘
  const handleInputClick = () => {
    setShowKeyboard(true);
  };

  // 处理键盘输入
  const handleKeyboardInput = (value: string) => {
    // 处理等号，执行计算
    if (value === "=") {
      try {
        // 使用 Function 构造函数安全地计算表达式
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${amount}`)();

        // 格式化结果，最多保留两位小数
        const formattedResult = parseFloat(result.toFixed(2)).toString();
        setAmount(formattedResult);
      } catch (error) {
        // 如果计算出错，保持原值不变
        console.error("计算错误:", error);
      }
      return;
    }

    // 处理数字和小数点输入
    if (value === "." && amount.includes(".")) {
      // 已经有小数点了，不再添加
      return;
    }

    // 处理加减号
    if (value === "+" || value === "-") {
      // 如果是第一个字符，或者前一个字符是运算符，则替换
      if (amount === "" || ["+", "-"].includes(amount.slice(-1))) {
        setAmount(value);
      } else {
        // 否则追加
        setAmount(amount + value);
      }
      return;
    }

    // 正常追加数字或小数点
    setAmount(amount + value);
  };

  // 处理删除
  const handleKeyboardDelete = () => {
    if (amount.length > 0) {
      setAmount(amount.slice(0, -1));
    }
  };

  // 处理完成
  const handleKeyboardComplete = () => {
    setShowKeyboard(false);
  };

  // 组件挂载时自动显示键盘
  useEffect(() => {
    if (inputRef.current) {
      // 自动显示键盘
      setShowKeyboard(true);
    }
  }, []);

  return (
    <>
      <div className="amount-input-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        position: 'relative',
        width: '100%'
      }}>
        <div className="amount-display" style={{
          position: 'relative',
          width: '80%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span className="currency-symbol" style={{
            position: 'absolute',
            left: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '24px',
            fontWeight: '500',
            zIndex: '1',
            paddingLeft: '8px'
          }}>¥</span>
          <input
            ref={inputRef}
            type="text"
            className="amount-input"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            onClick={handleInputClick}
            readOnly // 使用虚拟键盘输入，禁用系统键盘
            style={{
              fontSize: '32px',
              fontWeight: '600',
              border: 'none',
              background: 'none',
              width: '100%',
              paddingLeft: '30px',
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}
          />
        </div>
      </div>

      {showKeyboard && (
        <NumericKeyboard
          onInput={handleKeyboardInput}
          onDelete={handleKeyboardDelete}
          onComplete={handleKeyboardComplete}
        />
      )}
    </>
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
    budgetId, selectedBudget,
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
        budgetId: budgetId || undefined,
        notes: notes || undefined,
      };

      // 提交数据
      await updateTransaction.mutateAsync({
        id: transactionId,
        data: transactionData,
      });

      // 提交成功
      toast.success("交易记录已更新");
      
      // 触发交易变化事件，让仪表盘自动刷新
      if (accountBookId) {
        triggerTransactionChange(accountBookId);
      }
      
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



              {/* 预算选择器 */}
              <BudgetSelector />

              <div className="form-group">
                <label className="form-label">备注</label>
                <div className="form-input full-width">
                  <textarea
                    placeholder="添加备注..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="full-width-textarea"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部按钮 */}
      <div className="bottom-button-container">
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
