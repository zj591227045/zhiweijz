"use client";

import { useState, useEffect } from "react";
import { useAccountBookStore } from "@/store/account-book-store";
import { AccountBook } from "@/types";
import { toast } from "sonner";

interface AccountBookSelectorProps {
  onClose?: () => void;
}

export function AccountBookSelector({ onClose }: AccountBookSelectorProps) {
  const { accountBooks, currentAccountBook, setCurrentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(false);

  // 获取账本列表
  useEffect(() => {
    const loadAccountBooks = async () => {
      setIsLoading(true);
      try {
        // 先获取个人账本
        await fetchAccountBooks();

        // 获取用户的家庭列表
        const response = await fetch('/api/families', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const families = await response.json();

          // 为每个家庭获取账本
          const fetchPromises = families.map((family: any) =>
            useAccountBookStore.getState().fetchFamilyAccountBooks(family.id)
          );

          await Promise.all(fetchPromises);
        }
      } catch (error) {
        console.error('加载账本失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountBooks();
  }, [fetchAccountBooks]);

  // 处理账本选择
  const handleSelectBook = (book: AccountBook) => {
    setCurrentAccountBook(book.id);
    toast.success(`已切换到账本: ${book.name}`);
    if (onClose) onClose();
  };

  return (
    <div className="account-book-list">
      <h3 className="text-base font-medium mb-3">选择当前账本</h3>

      <div>
        {isLoading ? (
          <div className="settings-loading">
            <div className="settings-loading-spinner"></div>
            <p className="settings-loading-text">加载账本中...</p>
          </div>
        ) : accountBooks.length > 0 ? (
          <div>
            {/* 个人账本 */}
            <div className="account-book-section">
              <h4 className="account-book-section-title">个人账本</h4>
              {accountBooks
                .filter(book => book.type === 'PERSONAL')
                .map(book => (
                  <div
                    key={book.id}
                    className={`account-book-item ${currentAccountBook?.id === book.id ? 'active' : ''}`}
                    onClick={() => handleSelectBook(book)}
                  >
                    <i className="fas fa-book account-book-icon"></i>
                    <span className="account-book-name">{book.name}</span>
                    {book.isDefault && (
                      <span className="account-book-badge">默认</span>
                    )}
                  </div>
                ))}
            </div>

            {/* 家庭账本 */}
            {accountBooks.some(book => book.type === 'FAMILY') && (
              <div className="account-book-section">
                <h4 className="account-book-section-title">家庭账本</h4>
                {accountBooks
                  .filter(book => book.type === 'FAMILY')
                  .map(book => (
                    <div
                      key={book.id}
                      className={`account-book-item ${currentAccountBook?.id === book.id ? 'active' : ''}`}
                      onClick={() => handleSelectBook(book)}
                    >
                      <i className="fas fa-users account-book-icon"></i>
                      <span className="account-book-name">{book.name}</span>
                      {book.isDefault && (
                        <span className="account-book-badge">默认</span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="settings-empty">
            <i className="fas fa-book settings-empty-icon"></i>
            <p className="settings-empty-title">暂无账本数据</p>
            <p className="settings-empty-description">请先创建一个账本</p>
            <button
              className="settings-empty-button"
              onClick={() => window.location.href = '/books/new'}
            >
              创建账本
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 