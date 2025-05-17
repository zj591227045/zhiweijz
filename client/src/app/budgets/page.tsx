'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BudgetList } from '@/components/budgets/budget-list';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import './budgets.css';

export default function BudgetsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查用户是否已登录
    try {
      // 确保在客户端环境中执行
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth-token');
        const user = localStorage.getItem('user');

        console.log('认证检查 - token存在:', !!token, '用户存在:', !!user);

        // 只要有token就认为已登录，即使没有user数据
        if (!token) {
          console.log('用户未登录，重定向到登录页面');
          router.push('/login');
        } else {
          console.log('用户已登录，可以访问预算页面');

          // 如果没有user数据，尝试创建一个默认的
          if (!user) {
            console.log('用户数据不存在，尝试创建默认用户数据');
            try {
              // 创建一个最小的用户数据
              localStorage.setItem('user', JSON.stringify({
                id: 'default-user',
                email: 'default@example.com'
              }));
              console.log('已创建默认用户数据');
            } catch (err) {
              console.error('创建默认用户数据失败:', err);
            }
          }

          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('认证检查出错:', error);
      // 出错时默认为已认证，避免循环重定向
      console.log('出错时默认为已认证');
      setIsAuthenticated(true);
    }
  }, [router]);

  // 如果认证状态未确定，显示加载中
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  // 如果已认证，显示预算页面
  return <BudgetList />;
}
