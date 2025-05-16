'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAccountBookStore } from '@/lib/store/account-book-store';
import { ArrowDown, ArrowUp, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

// 模拟数据
const mockData = {
  balance: {
    total: 12500,
    income: 15000,
    expense: 2500,
  },
  budgets: [
    {
      id: '1',
      category: '餐饮',
      icon: '🍔',
      current: 1200,
      total: 2000,
      percentage: 60,
    },
    {
      id: '2',
      category: '交通',
      icon: '🚗',
      current: 800,
      total: 1000,
      percentage: 80,
    },
    {
      id: '3',
      category: '购物',
      icon: '🛍️',
      current: 1500,
      total: 1500,
      percentage: 100,
    },
  ],
  recentTransactions: [
    {
      id: '1',
      title: '午餐',
      category: '餐饮',
      icon: '🍔',
      amount: -50,
      date: '2023-05-15',
      type: 'expense',
    },
    {
      id: '2',
      title: '工资',
      category: '收入',
      icon: '💰',
      amount: 8000,
      date: '2023-05-10',
      type: 'income',
    },
    {
      id: '3',
      title: '超市购物',
      category: '日用',
      icon: '🛒',
      amount: -200,
      date: '2023-05-08',
      type: 'expense',
    },
    {
      id: '4',
      title: '电影票',
      category: '娱乐',
      icon: '🎬',
      amount: -80,
      date: '2023-05-05',
      type: 'expense',
    },
  ],
};

// 格式化金额
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
};

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(true);

  // 获取账本数据
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchAccountBooks();
      } catch (error) {
        console.error('获取账本失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchAccountBooks]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 欢迎信息 */}
        <div>
          <h1 className="text-2xl font-bold">您好，{user?.name || '用户'}</h1>
          <p className="text-muted-foreground">
            欢迎回到您的财务仪表盘
            {currentAccountBook ? ` - ${currentAccountBook.name}` : ''}
          </p>
        </div>

        {/* 余额卡片 */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              本月余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">
              {formatAmount(mockData.balance.total)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-sm opacity-80 flex items-center">
                  <ArrowDown className="mr-1 h-4 w-4" />
                  收入
                </span>
                <span className="text-lg font-semibold">
                  {formatAmount(mockData.balance.income)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm opacity-80 flex items-center">
                  <ArrowUp className="mr-1 h-4 w-4" />
                  支出
                </span>
                <span className="text-lg font-semibold">
                  {formatAmount(mockData.balance.expense)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预算进度 */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              预算执行情况
            </h2>
            <a href="/budget" className="text-sm text-primary hover:underline">
              查看全部
            </a>
          </div>

          <div className="space-y-4">
            {mockData.budgets.map((budget) => (
              <Card key={budget.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                        <span>{budget.icon}</span>
                      </div>
                      <span>{budget.category}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">
                        {formatAmount(budget.current)}
                      </span>
                      <span className="text-muted-foreground">
                        {' / '}
                        {formatAmount(budget.total)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        budget.percentage >= 100
                          ? 'bg-red-500'
                          : budget.percentage >= 80
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 最近交易 */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              最近交易
            </h2>
            <a href="/transactions" className="text-sm text-primary hover:underline">
              查看全部
            </a>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {mockData.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                        <span>{transaction.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium">{transaction.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-medium ${
                          transaction.type === 'expense'
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {transaction.type === 'expense' ? '-' : '+'}
                        {formatAmount(Math.abs(transaction.amount))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
