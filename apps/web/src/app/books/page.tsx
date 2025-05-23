"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useAccountBookStore, BottomNavigation } from "@zhiweijz/web";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import "./books.css";

// 账本类型定义
interface AccountBook {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isFamilyBook: boolean;
  familyId?: string;
  familyName?: string;
}

export default function BookListPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { accountBooks, currentAccountBook, fetchAccountBooks, setCurrentAccountBook } = useAccountBookStore();
  
  // 本地状态
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<AccountBook | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [bookToSwitch, setBookToSwitch] = useState<AccountBook | null>(null);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  // 获取账本列表
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadAccountBooks = async () => {
      try {
        setIsLoading(true);
        await fetchAccountBooks();
        setIsLoading(false);
      } catch (error) {
        console.error("获取账本列表失败:", error);
        setError("获取账本列表失败");
        setIsLoading(false);
      }
    };
    
    loadAccountBooks();
  }, [isAuthenticated, fetchAccountBooks]);

  // 添加账本
  const handleAddBook = () => {
    router.push("/books/new");
  };

  // 编辑账本
  const handleEditBook = (book: AccountBook) => {
    router.push(`/books/edit/${book.id}`);
  };

  // 删除账本
  const handleDeleteBook = (book: AccountBook) => {
    setBookToDelete(book);
    setShowDeleteConfirm(true);
  };

  // 确认删除账本
  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;

    try {
      await apiClient.delete(`/account-books/${bookToDelete.id}`);
      toast.success("账本删除成功");
      fetchAccountBooks();
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    } catch (error) {
      console.error("删除账本失败:", error);
      toast.error("删除账本失败");
    }
  };

  // 切换当前账本
  const handleSwitchBook = (book: AccountBook) => {
    // 如果已经是当前账本，不做任何操作
    if (currentAccountBook?.id === book.id) return;

    setBookToSwitch(book);
    setShowSwitchConfirm(true);
  };

  // 确认切换账本
  const confirmSwitchBook = async () => {
    if (!bookToSwitch) return;

    try {
      // 设置为默认账本
      await apiClient.put(`/account-books/${bookToSwitch.id}/default`);
      
      // 更新当前账本
      setCurrentAccountBook(bookToSwitch.id);
      toast.success(`已切换到账本: ${bookToSwitch.name}`);
      
      // 重新获取账本列表
      fetchAccountBooks();
    } catch (error) {
      console.error("设置默认账本失败:", error);
      toast.error("设置默认账本失败");
    } finally {
      setShowSwitchConfirm(false);
      setBookToSwitch(null);
    }
  };

  // 确保accountBooks是一个数组
  const safeAccountBooks = Array.isArray(accountBooks) ? accountBooks : [];

  // 判断是否显示空状态
  const showEmptyState = !isLoading && safeAccountBooks.length === 0;

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <div className="header">
        <div className="header-title">我的账本</div>
        <div className="header-actions">
          <button className="icon-button" onClick={handleAddBook}>
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
        {isLoading ? (
          <div className="loading-state">加载中...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : showEmptyState ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-book"></i>
            </div>
            <div className="empty-text">您还没有创建任何账本</div>
            <button className="primary-button" onClick={handleAddBook}>
              创建账本
            </button>
          </div>
        ) : (
          <div className="book-list">
            {safeAccountBooks.map((book: AccountBook) => (
              <div 
                key={book.id} 
                className={`book-card ${currentAccountBook?.id === book.id ? 'active' : ''}`}
                onClick={() => handleSwitchBook(book)}
              >
                <div className="book-icon">
                  <i className={`fas ${book.isFamilyBook ? 'fa-users' : 'fa-book'}`}></i>
                </div>
                <div className="book-details">
                  <div className="book-name">{book.name}</div>
                  {book.description && (
                    <div className="book-description">{book.description}</div>
                  )}
                  {book.isDefault && (
                    <div className="book-badge">默认</div>
                  )}
                  {book.isFamilyBook && (
                    <div className="book-badge family">家庭</div>
                  )}
                </div>
                <div className="book-actions">
                  <button 
                    className="icon-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditBook(book);
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="icon-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBook(book);
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部导航栏 */}
      <BottomNavigation currentPath="/books" />

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-content">
            <h3>删除账本</h3>
            <p>确定要删除账本 "{bookToDelete?.name}" 吗？此操作不可恢复，账本中的所有数据将被删除。</p>
            <div className="confirm-dialog-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                取消
              </button>
              <button className="danger-button" onClick={confirmDeleteBook}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 切换账本确认对话框 */}
      {showSwitchConfirm && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-content">
            <h3>切换账本</h3>
            <p>确定要切换到账本 "{bookToSwitch?.name}" 吗？</p>
            <div className="confirm-dialog-actions">
              <button className="secondary-button" onClick={() => setShowSwitchConfirm(false)}>
                取消
              </button>
              <button className="primary-button" onClick={confirmSwitchBook}>
                切换
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加账本按钮 */}
      <button className="floating-action-button" onClick={handleAddBook}>
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
}
