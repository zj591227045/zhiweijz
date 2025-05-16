# 只为记账 - UI组件库

本文档详细描述了"只为记账"应用的UI组件库，包括基础组件、复合组件和页面级组件的设计和实现。

## 1. 设计系统

### 1.1 设计原则

- **一致性**: 保持视觉和交互模式的一致性
- **简洁性**: 减少视觉噪音，专注于内容
- **响应性**: 适应不同屏幕尺寸和设备
- **可访问性**: 确保所有用户都能使用应用
- **反馈性**: 为用户操作提供清晰的反馈

### 1.2 设计令牌 (Design Tokens)

#### 颜色系统

```css
:root {
  /* 主色调 */
  --primary: 59 130 246;     /* RGB值，用于Tailwind的opacity修饰符 */
  --primary-foreground: 255 255 255;
  --secondary: 16 185 129;
  --secondary-foreground: 255 255 255;

  /* 功能色 */
  --success: 34 197 94;
  --success-foreground: 255 255 255;
  --warning: 245 158 11;
  --warning-foreground: 255 255 255;
  --error: 239 68 68;
  --error-foreground: 255 255 255;
  --info: 59 130 246;
  --info-foreground: 255 255 255;

  /* 中性色 */
  --background: 249 250 251;
  --foreground: 31 41 55;
  --card: 255 255 255;
  --card-foreground: 31 41 55;
  --muted: 243 244 246;
  --muted-foreground: 107 114 128;
  --border: 229 231 235;

  /* 交互状态 */
  --ring: 59 130 246;
  --focus: 59 130 246;
  --hover: 59 130 246;

  /* 其他 */
  --radius: 0.5rem;
}
```

#### 字体系统

```css
:root {
  /* 字体大小 */
  --font-2xs: 0.625rem;    /* 10px */
  --font-xs: 0.75rem;      /* 12px */
  --font-sm: 0.875rem;     /* 14px */
  --font-base: 1rem;       /* 16px */
  --font-lg: 1.125rem;     /* 18px */
  --font-xl: 1.25rem;      /* 20px */
  --font-2xl: 1.5rem;      /* 24px */
  --font-3xl: 1.875rem;    /* 30px */

  /* 字重 */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* 行高 */
  --line-tight: 1.25;
  --line-normal: 1.5;
  --line-loose: 1.75;
}
```

#### 间距系统

```css
:root {
  /* 间距 */
  --spacing-0: 0;
  --spacing-1: 0.25rem;    /* 4px */
  --spacing-2: 0.5rem;     /* 8px */
  --spacing-3: 0.75rem;    /* 12px */
  --spacing-4: 1rem;       /* 16px */
  --spacing-5: 1.25rem;    /* 20px */
  --spacing-6: 1.5rem;     /* 24px */
  --spacing-8: 2rem;       /* 32px */
  --spacing-10: 2.5rem;    /* 40px */
  --spacing-12: 3rem;      /* 48px */
  --spacing-16: 4rem;      /* 64px */
}
```

#### 阴影系统

```css
:root {
  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

## 2. 基础组件

### 2.1 按钮 (Button)

**变体**:
- **主要按钮**: 用于主要操作
- **次要按钮**: 用于次要操作
- **轮廓按钮**: 低强调按钮
- **链接按钮**: 看起来像链接的按钮
- **图标按钮**: 只包含图标的按钮

**尺寸**:
- **小型**: 用于紧凑界面
- **中型**: 默认尺寸
- **大型**: 用于强调

**状态**:
- **默认**
- **悬停**
- **聚焦**
- **活动**
- **禁用**
- **加载中**

**实现**:

```tsx
// components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### 2.2 输入框 (Input)

**变体**:
- **默认**: 标准输入框
- **带图标**: 带有前缀或后缀图标的输入框
- **带标签**: 带有浮动标签的输入框

**状态**:
- **默认**
- **聚焦**
- **禁用**
- **错误**
- **成功**

**实现**:

```tsx
// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus-visible:ring-error",
            success && "border-success focus-visible:ring-success",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
```

### 2.3 卡片 (Card)

**变体**:
- **默认**: 标准卡片
- **交互式**: 可点击的卡片
- **突出**: 带有强调的卡片

**实现**:

```tsx
// components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; highlight?: boolean }
>(({ className, interactive, highlight, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      interactive && "hover:shadow-md transition-shadow cursor-pointer",
      highlight && "border-primary/50",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

## 3. 复合组件

### 3.1 余额卡片 (BalanceCard)

**功能**:
- 显示本月收入、支出和结余
- 支持切换显示月份
- 响应式设计

**实现**:

```tsx
// components/dashboard/balance-card.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  month: string;
  income: number;
  expense: number;
  balance: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function BalanceCard({
  month,
  income,
  expense,
  balance,
  onPrevMonth,
  onNextMonth,
}: BalanceCardProps) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-lg font-semibold">本月概览</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevMonth}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">{month}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex flex-col items-center">
            <span className="text-sm opacity-90">收入</span>
            <span className="text-lg font-semibold mt-1">
              {formatCurrency(income)}
            </span>
          </div>
          <div className="h-10 w-px bg-primary-foreground/30" />
          <div className="flex flex-col items-center">
            <span className="text-sm opacity-90">支出</span>
            <span className="text-lg font-semibold mt-1">
              {formatCurrency(expense)}
            </span>
          </div>
          <div className="h-10 w-px bg-primary-foreground/30" />
          <div className="flex flex-col items-center">
            <span className="text-sm opacity-90">结余</span>
            <span className="text-lg font-semibold mt-1">
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.2 交易列表 (TransactionList)

**功能**:
- 按日期分组显示交易
- 支持无限滚动加载
- 支持空状态和加载状态
- 点击项目导航到详情页

**实现**:

```tsx
// components/transactions/transaction-list.tsx
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@/types/models";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onItemClick: (id: string) => void;
}

export function TransactionList({
  transactions,
  isLoading,
  hasNextPage,
  fetchNextPage,
  onItemClick,
}: TransactionListProps) {
  const { ref, inView } = useInView();

  // 当底部可见且有下一页时加载更多
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // 按日期分组交易
  const groupedTransactions = transactions.reduce<Record<string, Transaction[]>>(
    (groups, transaction) => {
      const date = formatDate(new Date(transaction.date), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {}
  );

  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">暂无交易记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([date, items]) => (
        <div key={date} className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            {formatDate(new Date(date), "yyyy年MM月dd日")}
          </div>
          <div className="space-y-2">
            {items.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center p-3 bg-card rounded-md shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onItemClick(transaction.id)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <transaction.category.icon className="h-5 w-5" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.category.name}
                  </div>
                </div>
                <div
                  className={
                    transaction.type === "EXPENSE"
                      ? "text-error font-medium"
                      : "text-success font-medium"
                  }
                >
                  {transaction.type === "EXPENSE" ? "-" : "+"}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-3 bg-card rounded-md shadow-sm">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="ml-3 flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {hasNextPage && <div ref={ref} className="h-8" />}
    </div>
  );
}
```

## 4. 页面级组件

### 4.1 仪表盘页面 (Dashboard)

**功能**:
- 显示财务概览
- 显示预算执行情况
- 显示最近交易
- 支持下拉刷新

**实现**:

```tsx
// app/(dashboard)/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { TransactionList } from "@/components/transactions/transaction-list";
import { api } from "@/lib/api";
import { useMonthSelection } from "@/hooks/use-month-selection";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

export default function DashboardPage() {
  const router = useRouter();
  const { selectedMonth, formattedMonth, prevMonth, nextMonth } = useMonthSelection();

  // 获取财务概览
  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ["overview", selectedMonth],
    queryFn: () => api.getFinancialOverview(selectedMonth),
  });

  // 获取预算执行情况
  const { data: budgets, refetch: refetchBudgets } = useQuery({
    queryKey: ["budgets", selectedMonth],
    queryFn: () => api.getBudgetProgress(selectedMonth),
  });

  // 获取最近交易
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["recent-transactions", selectedMonth],
    queryFn: () => api.getRecentTransactions(selectedMonth, 10),
  });

  // 刷新所有数据
  const handleRefresh = async () => {
    await Promise.all([
      refetchOverview(),
      refetchBudgets(),
      refetchTransactions(),
    ]);
    return true;
  };

  // 导航到交易详情
  const handleTransactionClick = (id: string) => {
    router.push(`/transactions/${id}`);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-20">
        <BalanceCard
          month={formattedMonth}
          income={overview?.income || 0}
          expense={overview?.expense || 0}
          balance={overview?.balance || 0}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">预算执行情况</h2>
            <button
              className="text-sm text-primary"
              onClick={() => router.push("/budgets")}
            >
              查看全部
            </button>
          </div>
          <BudgetProgress budgets={budgets || []} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">最近交易</h2>
            <button
              className="text-sm text-primary"
              onClick={() => router.push("/transactions")}
            >
              查看全部
            </button>
          </div>
          <TransactionList
            transactions={transactions || []}
            isLoading={!transactions}
            hasNextPage={false}
            fetchNextPage={() => {}}
            onItemClick={handleTransactionClick}
          />
        </div>
      </div>
    </PullToRefresh>
  );
}
```
