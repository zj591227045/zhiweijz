'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { BookList } from '@/components/books/book-list';
import { AddBookButton } from '@/components/books/add-book-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import BookEditModal from '@/components/book-edit-modal';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api-client';
import { AccountBook } from '@/types';
import { useMobileBackHandler } from '@/hooks/use-mobile-back-handler';
import { PageLevel } from '@/lib/mobile-navigation';
import './books.css';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<AccountBook | null>(null);

  // 移动端后退处理
  useMobileBackHandler({
    pageId: 'settings-books',
    pageLevel: PageLevel.MODAL,
    enableHardwareBack: true,
    enableBrowserBack: true,
    onBack: () => {
      // 账本管理页面后退到设置页面
      router.push('/settings');
      return true; // 已处理
    },
  });

  // 获取账本列表
  useEffect(() => {
    const loadAllAccountBooks = async () => {
      try {
        // 先获取个人账本
        await fetchAccountBooks();

        // 获取用户的家庭列表
        const response = await fetchApi('/api/families');

        if (response.ok) {
          const families = await response.json();

          // 为每个家庭获取账本
          const fetchPromises = families.map((family: any) =>
            useAccountBookStore.getState().fetchFamilyAccountBooks(family.id),
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

  // 添加账本
  const handleAddBook = () => {
    router.push('/settings/books/new');
  };

  // 编辑账本 - 使用模态框
  const handleEditBook = (book: AccountBook) => {
    setBookToEdit(book);
    setShowEditModal(true);
  };

  // 处理编辑模态框关闭
  const handleEditModalClose = () => {
    setShowEditModal(false);
    setBookToEdit(null);
  };

  // 处理编辑保存成功
  const handleEditSave = (updatedBook: AccountBook) => {
    // 刷新账本列表
    fetchAccountBooks();
    // 如果编辑的是当前账本，更新当前账本
    if (currentAccountBook?.id === updatedBook.id) {
      setCurrentAccountBook(updatedBook);
    }
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
      await deleteAccountBook(bookToDelete.id);
      toast.success('账本删除成功');
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    } catch (error) {
      toast.error('删除账本失败');
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
      await fetchApi(`/api/account-books/${bookToSwitch.id}/set-default`, {
        method: 'POST',
      });

      // 更新当前账本
      setCurrentAccountBook(bookToSwitch.id);
      toast.success(`已切换到账本: ${bookToSwitch.name}`);

      // 重新获取账本列表
      fetchAccountBooks();
    } catch (error) {
      console.error('设置默认账本失败:', error);
      toast.error('设置默认账本失败');
    } finally {
      setShowSwitchConfirm(false);
      setBookToSwitch(null);
    }
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
      const response = await fetchApi(`/api/account-books/${bookToReset.id}/reset`, {
        method: 'POST',
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

  // 右侧操作按钮
  const rightActions = (
    <button className="icon-button" onClick={() => handleAddBook()} aria-label="添加账本">
      <i className="fas fa-plus"></i>
    </button>
  );

  // 确保accountBooks是一个数组
  const safeAccountBooks = Array.isArray(accountBooks) ? accountBooks : [];

  return (
    <PageContainer
      title="账本列表"
      rightActions={rightActions}
      showBackButton={true}
      onBackClick={() => router.push('/settings')}
      showBottomNav={false}
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : (
        <>
          <BookList
            books={safeAccountBooks}
            currentBookId={currentAccountBook?.id}
            onSwitchBook={handleSwitchBook}
            onEditBook={handleEditBook}
            onDeleteBook={handleDeleteBook}
            onResetBook={handleResetBook}
          />

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
        message={`确定要重置账本 "${bookToReset?.name}" 吗？此操作将清除所有记账记录、预算信息和历史记录，且不可恢复。`}
        confirmText="重置"
        cancelText="取消"
        onConfirm={confirmResetBook}
        onCancel={() => setShowResetConfirm(false)}
        isDangerous
      />

      {/* 编辑账本模态框 */}
      <BookEditModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        bookId={bookToEdit?.id || ''}
        onSave={handleEditSave}
      />
    </PageContainer>
  );
}
