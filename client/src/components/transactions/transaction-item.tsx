"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction, TransactionType } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import dayjs from "dayjs";

interface TransactionItemProps {
  transaction: Transaction;
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSwiped, setIsSwiped] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // 删除交易的mutation
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      // 删除成功后刷新交易列表和统计数据
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-statistics"] });
    },
  });

  // 处理点击交易项
  const handleClick = () => {
    if (!isSwiped) {
      router.push(`/transactions/${transaction.id}`);
    }
  };

  // 处理编辑按钮点击
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/transactions/${transaction.id}/edit`);
  };

  // 处理删除按钮点击
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这笔交易吗？")) {
      deleteTransaction.mutate(transaction.id);
    }
  };

  // 滑动操作相关变量
  const startX = useRef(0);
  const currentX = useRef(0);
  const initialOffset = useRef(0);
  const isSwiping = useRef(false);

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    initialOffset.current = isSwiped ? -140 : 0;
    isSwiping.current = true;
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;

    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    const newOffset = Math.min(0, Math.max(-140, initialOffset.current + diff));

    if (itemRef.current) {
      const content = itemRef.current.querySelector(".transaction-content") as HTMLElement;
      const actions = itemRef.current.querySelector(".transaction-actions") as HTMLElement;

      if (content && actions) {
        content.style.transform = `translateX(${newOffset}px)`;
        actions.style.transform = `translateX(${newOffset + 140}px)`;
      }
    }
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    if (!isSwiping.current || !itemRef.current) return;

    const content = itemRef.current.querySelector(".transaction-content") as HTMLElement;
    const actions = itemRef.current.querySelector(".transaction-actions") as HTMLElement;

    if (content && actions) {
      // 重置内联样式
      content.style.transform = "";
      actions.style.transform = "";

      if (initialOffset.current === 0 && currentX.current && startX.current - currentX.current > 50) {
        // 向左滑动超过阈值，显示操作按钮
        setIsSwiped(true);
      } else if (initialOffset.current === -140 && currentX.current && currentX.current - startX.current > 50) {
        // 向右滑动超过阈值，隐藏操作按钮
        setIsSwiped(false);
      } else {
        // 恢复原状态
        setIsSwiped(initialOffset.current === -140);
      }
    }

    isSwiping.current = false;
  };

  // 点击其他地方关闭滑动菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        itemRef.current &&
        !itemRef.current.contains(e.target as Node) &&
        isSwiped
      ) {
        setIsSwiped(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isSwiped]);

  // 获取图标类名
  const getIconClass = (iconName?: string) => {
    if (!iconName) return "fas fa-question";
    
    // 如果图标名称已经包含完整的类名，则直接返回
    if (iconName.startsWith("fa-")) {
      return `fas ${iconName}`;
    }
    
    return `fas fa-${iconName}`;
  };

  return (
    <div
      ref={itemRef}
      className={`transaction-item ${isSwiped ? "swiped" : ""}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="transaction-content">
        <div className="transaction-icon">
          <i className={getIconClass(transaction.category?.icon)}></i>
        </div>
        <div className="transaction-details">
          <div className="transaction-title">{transaction.description || "无描述"}</div>
          <div className="transaction-category">{transaction.category?.name || "未分类"}</div>
        </div>
        <div
          className={`transaction-amount ${
            transaction.type === TransactionType.EXPENSE ? "expense" : "income"
          }`}
        >
          {transaction.type === TransactionType.EXPENSE ? "-" : "+"}
          {formatCurrency(transaction.amount)}
        </div>
      </div>
      <div className="transaction-actions">
        <div className="action-button edit-button" onClick={handleEdit}>
          <i className="fas fa-edit"></i>
        </div>
        <div className="action-button delete-button" onClick={handleDelete}>
          <i className="fas fa-trash"></i>
        </div>
      </div>
    </div>
  );
}
