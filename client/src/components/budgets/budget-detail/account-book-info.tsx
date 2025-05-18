'use client';

import { AccountBook } from '@/store/budget-detail-store';

interface AccountBookInfoProps {
  accountBook: AccountBook | null;
}

export function AccountBookInfo({ accountBook }: AccountBookInfoProps) {
  if (!accountBook) return null;

  return (
    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
      <i className={`fas ${accountBook.type === 'PERSONAL' ? 'fa-book' : 'fa-users'} text-blue-500 mr-2`}></i>
      <span className="font-medium">{accountBook.name}</span>
    </div>
  );
}
