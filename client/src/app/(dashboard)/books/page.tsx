"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BookList } from "@/components/books/book-list";
import { EmptyState } from "@/components/books/empty-state";
import { AddBookButton } from "@/components/books/add-book-button";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";
import { AccountBook } from "@/types";
import "./books.css";

export default function BookListPage() {
  const router = useRouter();
  const {
    accountBooks,
    currentAccountBook,
    isLoading,
    error,
    fetchAccountBooks,
    setCurrentAccountBook,
    deleteAccountBook,
  } = useAccountBookStore();

  // 本地状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<AccountBook | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [bookToSwitch, setBookToSwitch] = useState<AccountBook | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [bookToReset, setBookToReset] = useState<AccountBook | null>(null);

  // 获取账本列表
  useEffect(() => {
    const loadAllAccountBooks = async () => {
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
      }
    };

    loadAllAccountBooks();
  }, [fetchAccountBooks]);

  // 错误处理
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button"
      onClick={() => handleAddBook()}
      aria-label="添加账本"
    >
      <i className="fas fa-plus"></i>
    </button>
  );

  // 添加账本
  const handleAddBook = () => {
    // 导航到创建账本页面
    router.push("/books/new");
  };

  // 编辑账本
  const handleEditBook = (book: AccountBook) => {
    // 导航到编辑账本页面
    router.push(`/books/edit/${book.id}`);
  };

  // 删除账本
  const handleDeleteBook = (book: AccountBook) => {
    // 不允许删除默认账本
    if (book.isDefault) {
      toast.error("默认账本不能删除");
      return;
    }

    setBookToDelete(book);
    setShowDeleteConfirm(true);
  };

  // 确认删除账本
  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;

    try {
      await deleteAccountBook(bookToDelete.id);
      toast.success("账本删除成功");
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    } catch (error) {
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
  const confirmSwitchBook = () => {
    if (!bookToSwitch) return;

    setCurrentAccountBook(bookToSwitch.id);
    toast.success(`已切换到账本: ${bookToSwitch.name}`);
    setShowSwitchConfirm(false);
    setBookToSwitch(null);
  };

  // 处理重置账本
  const handleResetBook = (book: AccountBook) => {
    setBookToReset(book);
    setShowResetConfirm(true);
  };

  // 确认重置账本
  const confirmResetBook = async () => {
    if (!bookToReset) return;

    try {
      // 调用API重置账本
      const response = await fetch(`/api/account-books/${bookToReset.id}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });

      if (response.ok) {
        toast.success(`账本 "${bookToReset.name}" 已重置`);
        // 重新获取账本列表
        fetchAccountBooks();
      } else {
        const error = await response.json();
        toast.error(error.message || '重置账本失败');
      }
    } catch (error) {
      console.error('重置账本失败:', error);
      toast.error('重置账本失败');
    } finally {
      setShowResetConfirm(false);
      setBookToReset(null);
    }
  };



  // 确保accountBooks是一个数组
  const safeAccountBooks = Array.isArray(accountBooks) ? accountBooks : [];

  // 判断是否显示空状态
  const showEmptyState = !isLoading && safeAccountBooks.length === 0;

  return (
    <PageContainer
      title="我的账本"
      rightActions={rightActions}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : (
        <>
          {showEmptyState ? (
            <EmptyState onAddBook={handleAddBook} />
          ) : (
            <BookList
              books={safeAccountBooks}
              currentBookId={currentAccountBook?.id}
              onSwitchBook={handleSwitchBook}
              onEditBook={handleEditBook}
              onDeleteBook={handleDeleteBook}
              onResetBook={handleResetBook}
            />
          )}

          <AddBookButton onClick={handleAddBook} />
        </>
      )}



      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除账本"
        message={`确定要删除账本 "${bookToDelete?.name}" 吗？此操作不可恢复，账本中的所有数据将被删除。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDeleteBook}
        onCancel={() => setShowDeleteConfirm(false)}
        isDangerous
      />

      {/* 切换账本确认对话框 */}
      <ConfirmDialog
        isOpen={showSwitchConfirm}
        title="切换账本"
        message={`确定要切换到账本 "${bookToSwitch?.name}" 吗？`}
        confirmText="切换"
        cancelText="取消"
        onConfirm={confirmSwitchBook}
        onCancel={() => setShowSwitchConfirm(false)}
      />

      {/* 重置账本确认对话框 */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="重置家庭账本"
        message={`确定要重置账本 "${bookToReset?.name}" 吗？此操作将清除所有交易记录、预算信息和历史记录，且不可恢复。`}
        confirmText="重置"
        cancelText="取消"
        onConfirm={confirmResetBook}
        onCancel={() => setShowResetConfirm(false)}
        isDangerous
      />
    </PageContainer>
  );
}
