'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { TransactionAddPage } from '@/components/transactions/transaction-add-page';

export default function TransactionNewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // 检查用户是否已认证
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <TransactionAddPage />;
}
