import { TransactionListPage } from '@/components/transactions/transaction-list-page';
import { Metadata } from 'next';
import { Suspense } from 'react';
import './transactions.css';

export const metadata: Metadata = {
  title: '交易记录 - 只为记账',
  description: '查看和管理您的交易记录',
};

// 加载组件
function TransactionsLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">加载交易记录中...</p>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsLoading />}>
      <TransactionListPage />
    </Suspense>
  );
}
