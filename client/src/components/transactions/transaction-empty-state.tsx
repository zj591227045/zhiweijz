"use client";

import Link from "next/link";

export function TransactionEmptyState() {
  return (
    <div className="transaction-empty">
      <div className="empty-icon">
        <i className="fas fa-receipt"></i>
      </div>
      <div className="empty-text">
        暂无交易记录
      </div>
      <Link href="/transactions/new" className="add-first-button">
        <i className="fas fa-plus"></i>
        添加第一笔交易
      </Link>
    </div>
  );
}
