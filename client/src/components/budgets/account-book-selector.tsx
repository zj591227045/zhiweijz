'use client';

import { useState } from 'react';
import { useBudgetStore } from '@/store/budget-store';

export function AccountBookSelector() {
  const { accountBooks, selectedAccountBook, setSelectedAccountBook } = useBudgetStore();
  const [isOpen, setIsOpen] = useState(false);

  // 添加调试信息
  console.log('账本选择器 - 账本列表:', accountBooks);
  console.log('账本选择器 - 选中的账本:', selectedAccountBook);

  // 强制显示账本选择器，即使没有数据也显示
  const displayText = selectedAccountBook
    ? selectedAccountBook.name
    : (accountBooks.length ? '选择账本' : '加载账本中...');

  // 如果没有账本或没有选中的账本，显示默认状态
  if (!accountBooks.length || !selectedAccountBook) {
    console.log('账本选择器 - 显示默认状态');
    // 不再返回null，而是继续显示UI
  }

  return (
    <div className="account-book-selector">
      <div
        className="selected-account-book"
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-book"></i>
        <span>{displayText}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-t-lg w-full max-h-[60vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-center">选择账本</h3>
            </div>
            <div className="p-4 space-y-2 overflow-auto max-h-[calc(60vh-80px)]">
              {accountBooks.length > 0 ? (
                accountBooks.map(book => (
                  <div
                    key={book.id}
                    className={`p-3 rounded-lg flex items-center ${
                      selectedAccountBook?.id === book.id
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedAccountBook(book);
                      setIsOpen(false);
                    }}
                  >
                    <i className={`fas fa-${book.type === 'PERSONAL' ? 'book' : 'users'} mr-3`}></i>
                    <span className="font-medium">{book.name}</span>
                    {book.isDefault && (
                      <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded">默认</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  <p>暂无账本数据</p>
                  <p className="text-sm mt-1">请稍后再试或联系管理员</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
