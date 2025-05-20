"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Budget, useTransactionFormStore } from "@/store/transaction-form-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { useAuthStore } from "@/store/auth-store";
import { getCategories, createTransaction } from "@/lib/api/transaction-service";
import { TransactionType } from "@/types";
import { formatDateForAPI, cn } from "@/lib/utils";
import { NumericKeyboard } from "./numeric-keyboard";
import { BudgetSelector } from "./budget-selector";
import { budgetService } from "@/lib/api/budget-service";
import "./budget-selector.css";

// 交易类型切换组件
function TransactionTypeToggle() {
  const { type, setType } = useTransactionFormStore();

  return (
    <div className="transaction-type-toggle">
      <button
        className={cn("type-button expense", type === TransactionType.EXPENSE && "active")}
        onClick={() => setType(TransactionType.EXPENSE)}
      >
        支出
      </button>
      <button
        className={cn("type-button income", type === TransactionType.INCOME && "active")}
        onClick={() => setType(TransactionType.INCOME)}
      >
        收入
      </button>
    </div>
  );
}



// 金额输入组件
function AmountInput() {
  const { amount, setAmount } = useTransactionFormStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showKeyboard, setShowKeyboard] = useState(true); // 默认显示键盘

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

  // 组件挂载时自动聚焦和显示键盘
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
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

// 步骤指示器组件
function StepIndicator() {
  const { currentStep } = useTransactionFormStore();

  return (
    <div className="step-indicator">
      <div className={cn("step", currentStep === 1 && "active")}>
        1. 选择分类
      </div>
      <div className={cn("step", currentStep === 2 && "active")}>
        2. 填写详情
      </div>
    </div>
  );
}

// 分类选择器组件
function CategorySelector({ categories, isLoading }: { categories: any[], isLoading: boolean }) {
  const { categoryId, goToStep } = useTransactionFormStore();

  // 处理分类选择
  const handleCategorySelect = (category: any) => {
    useTransactionFormStore.getState().setCategory(
      category.id,
      category.name,
      category.icon || null
    );

    // 自动进入下一步
    setTimeout(() => {
      goToStep(2);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="step-content">
        <h3 className="step-title">选择分类</h3>
        <div className="category-section">
          <div className="text-center py-8">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content" id="step-category">
      <h3 className="step-title">选择分类</h3>
      <div className="category-section">
        <div className="category-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className={cn("category-item", category.id === categoryId && "active")}
              onClick={() => handleCategorySelect(category)}
            >
              <div className="category-icon-wrapper">
                <i className={getIconClass(category.icon)}></i>
              </div>
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



// 获取图标类名
function getIconClass(iconName: string | undefined) {
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
    daily: "fa-shopping-basket",
    sports: "fa-running",
    beauty: "fa-spa",
    child: "fa-baby",
    elder: "fa-user-friends",
    social: "fa-users",
    digital: "fa-laptop",
    car: "fa-car",
    repayment: "fa-hand-holding-usd",
    insurance: "fa-shield-alt",
    office: "fa-briefcase",
    repair: "fa-tools",
    interest: "fa-percentage",
    salary: "fa-money-bill-wave",
    "part-time": "fa-coins",
    investment: "fa-chart-line",
    bonus: "fa-gift",
    commission: "fa-hand-holding-usd",
    other: "fa-ellipsis-h",
  };

  return `fas ${iconMap[iconName] || "fa-question"}`;
}

export function TransactionAddPage() {
  const router = useRouter();
  const {
    amount, type, categoryId, categoryName, categoryIcon, description,
    date, time, accountBookId, familyId, familyMemberId, budgetId,
    currentStep, isSubmitting, selectedBudget,
    setAccountBookId, resetForm, setSubmitting, setSubmitError,
    setDescription, setDate, setTime, goToStep, setBudgets, setSelectedBudget
  } = useTransactionFormStore();

  // 获取全局账本状态
  const { currentAccountBook } = useAccountBookStore();

  // 获取分类列表
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => getCategories(type),
  });

  // 获取活跃预算列表
  const { data: activeBudgets } = useQuery({
    queryKey: ["activeBudgets", currentAccountBook?.id],
    queryFn: () => currentAccountBook?.id ? budgetService.getActiveBudgets(currentAccountBook.id) : Promise.resolve([]),
    enabled: !!currentAccountBook?.id,
  });

  // 当全局账本变化时，设置账本ID
  useEffect(() => {
    if (currentAccountBook && (!accountBookId || accountBookId !== currentAccountBook.id)) {
      console.log("设置账本ID:", currentAccountBook.id);
      setAccountBookId(currentAccountBook.id);
    }
  }, [currentAccountBook, accountBookId, setAccountBookId]);

  // 当活跃预算数据加载完成后，设置预算列表和默认预算
  useEffect(() => {
    if (activeBudgets && activeBudgets.length > 0) {
      console.log("获取到活跃预算:", activeBudgets);

      // 转换预算数据格式
      const formattedBudgets: Budget[] = activeBudgets.map(budget => ({
        id: budget.id,
        name: budget.name,
        amount: budget.amount,
        spent: budget.spent || 0,
        remaining: budget.remaining || (budget.amount - (budget.spent || 0)),
        percentage: budget.percentage || 0,
        userId: budget.userId,
        userName: budget.userName,
        familyMemberId: budget.familyMemberId,
        familyMemberName: budget.familyMemberName,
        rolloverAmount: budget.rolloverAmount || 0,
        budgetType: budget.budgetType || 'PERSONAL'
      }));

      setBudgets(formattedBudgets);

      // 如果没有选中的预算，设置默认预算（与当前登录用户名称匹配的预算）
      if (!selectedBudget) {
        // 获取当前登录用户信息
        const currentUser = useAuthStore.getState().user;
        console.log("当前登录用户:", currentUser);

        if (currentUser) {
          // 查找与当前登录用户名称匹配的预算
          const userBudget = formattedBudgets.find(b =>
            b.familyMemberName === currentUser.name && b.budgetType === 'PERSONAL'
          );

          if (userBudget) {
            console.log("找到当前用户的预算:", userBudget);
            setSelectedBudget(userBudget);
          } else {
            // 如果没有找到匹配的预算，查找没有familyMemberId的个人预算
            const personalBudget = formattedBudgets.find(b =>
              !b.familyMemberId && b.budgetType === 'PERSONAL'
            );

            if (personalBudget) {
              console.log("设置默认个人预算:", personalBudget);
              setSelectedBudget(personalBudget);
            } else if (formattedBudgets.length > 0) {
              // 如果没有找到个人预算，使用第一个预算
              console.log("未找到个人预算，使用第一个预算:", formattedBudgets[0]);
              setSelectedBudget(formattedBudgets[0]);
            }
          }
        } else {
          // 如果没有登录用户信息，使用第一个预算
          if (formattedBudgets.length > 0) {
            console.log("未找到用户信息，使用第一个预算:", formattedBudgets[0]);
            setSelectedBudget(formattedBudgets[0]);
          }
        }
      }
    }
  }, [activeBudgets, selectedBudget, setBudgets, setSelectedBudget]);

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

      // 预算ID是可选的，不做验证

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
      };

      // 提交数据
      const response = await createTransaction(transactionData);

      // 提交成功
      if (response) {
        toast.success("交易记录已添加");
        resetForm();
        router.push("/dashboard");
      } else {
        throw new Error("创建交易失败，服务器未返回有效响应");
      }
    } catch (error) {
      console.error("添加记账失败:", error);
      toast.error("添加记账失败，请重试");
      setSubmitError("添加记账失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 组件卸载时重置表单
  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="header">
        <button className="icon-button back-button" onClick={handleBackClick}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-title">添加记账</div>
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
                    value={date ? date.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(new Date(e.target.value));
                      }
                    }}
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
                <label className="form-label">预算</label>
                <div className="form-input">
                  <BudgetSelector />
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
