"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTransactionDetail, useDeleteTransaction, useUpdateTransactionNotes } from "@/hooks/use-transaction-detail";
import { useAccountBook, useBudget } from "@/hooks/use-account-book-budget";
import { useTransactionDetailStore } from "@/store/transaction-detail-store";
import { TransactionHeader } from "./transaction-detail/transaction-header";
import { TransactionDetails } from "./transaction-detail/transaction-details";
import { NotesEditor } from "./transaction-detail/notes-editor";
import { ActionButtons } from "./transaction-detail/action-buttons";
import { DeleteConfirmDialog } from "./transaction-detail/delete-confirm-dialog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { TransactionType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // 获取状态
  const {
    transaction,
    isLoading,
    isDeleting,
    isUpdatingNotes,
    error,
    isDeleteConfirmOpen,
    isEditingNotes,
    notesValue,
    setTransaction,
    setLoading,
    setDeleting,
    setUpdatingNotes,
    setError,
    openDeleteConfirm,
    closeDeleteConfirm,
    startEditingNotes,
    cancelEditingNotes,
    setNotesValue,
    resetState
  } = useTransactionDetailStore();

  // 获取交易详情
  const { data, isLoading: isQueryLoading, isError, refetch } = useTransactionDetail(id);

  // 获取账本和预算信息
  const { data: accountBookData } = useAccountBook(data?.accountBookId);
  const { data: budgetData } = useBudget(data?.budgetId);

  // 删除交易的mutation
  const deleteTransaction = useDeleteTransaction();

  // 更新备注的mutation
  const updateNotes = useUpdateTransactionNotes();

  // 初始化和清理
  useEffect(() => {
    // 组件挂载时重置状态
    resetState();

    // 组件卸载时重置状态
    return () => resetState();
  }, [resetState]);

  // 更新状态
  useEffect(() => {
    if (isQueryLoading) {
      setLoading(true);
    } else if (isError) {
      setError("获取交易详情失败，请重试");
    } else if (data) {
      setTransaction(data);
    }
  }, [data, isQueryLoading, isError, setLoading, setError, setTransaction]);

  // 处理删除交易
  const handleDelete = async () => {
    if (!transaction) return;

    setDeleting(true);
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      closeDeleteConfirm();
      // 删除成功后返回列表页
      router.push("/transactions");
    } catch (error) {
      setDeleting(false);
    }
  };

  // 处理编辑交易
  const handleEdit = () => {
    if (!transaction) return;
    router.push(`/transactions/edit/${transaction.id}`);
  };

  // 处理保存备注
  const handleSaveNotes = async () => {
    if (!transaction) return;

    setUpdatingNotes(true);
    try {
      await updateNotes.mutateAsync({ id: transaction.id, notes: notesValue });
      setUpdatingNotes(false);
      // 退出编辑模式
      cancelEditingNotes();
    } catch (error) {
      setUpdatingNotes(false);
    }
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="app-container">
        <div className="header">
          <div className="header-title">交易详情</div>
        </div>
        <div className="main-content">
          <div className="loading-state">加载中...</div>
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误状态
  if (error) {
    return (
      <div className="app-container">
        <div className="header">
          <div className="header-title">交易详情</div>
        </div>
        <div className="main-content">
          <div className="error-state">{error}</div>
          <button className="retry-button" onClick={() => refetch()}>重试</button>
        </div>
      </div>
    );
  }

  // 如果没有交易数据，显示空状态
  if (!transaction) {
    return (
      <div className="app-container">
        <div className="header">
          <div className="header-title">交易详情</div>
        </div>
        <div className="main-content">
          <div className="empty-state">未找到交易记录</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <div className="header">
        <div className="back-button" onClick={() => router.back()}>
          <i className="fas fa-arrow-left"></i>
        </div>
        <div className="header-title">交易详情</div>
        <div className="header-actions">
          <button className="icon-button" id="menu-button" onClick={openDeleteConfirm}>
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
        {/* 交易头部信息 */}
        <TransactionHeader
          amount={transaction.amount}
          type={transaction.type}
          categoryName={transaction.category?.name || "未分类"}
          categoryIcon={transaction.category?.icon || ""}
        />

        {/* 交易详细信息 */}
        <TransactionDetails
          description={transaction.description || "无描述"}
          date={formatDate(transaction.date, "YYYY-MM-DD HH:mm")}
          accountBookName={accountBookData?.name || transaction.accountBook?.name || "默认账本"}
          createdAt={formatDate(transaction.createdAt, "YYYY-MM-DD HH:mm")}
          updatedAt={formatDate(transaction.updatedAt, "YYYY-MM-DD HH:mm")}
          budgetName={budgetData?.name || transaction.budget?.name}
        />

        {/* 备注编辑器 */}
        <NotesEditor
          notes={transaction.notes || ""}
          isEditing={isEditingNotes}
          editValue={notesValue}
          isUpdating={isUpdatingNotes}
          onEdit={startEditingNotes}
          onCancel={cancelEditingNotes}
          onChange={setNotesValue}
          onSave={handleSaveNotes}
        />

        {/* 底部操作按钮 */}
        <ActionButtons
          onEdit={handleEdit}
          onDelete={openDeleteConfirm}
        />
      </div>

      {/* 底部导航栏 */}
      <BottomNavigation />

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        isDeleting={isDeleting}
        onCancel={closeDeleteConfirm}
        onConfirm={handleDelete}
      />
    </div>
  );
}
