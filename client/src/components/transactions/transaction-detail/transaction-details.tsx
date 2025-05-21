"use client";

interface TransactionDetailsProps {
  description: string;
  date: string;
  accountBookName: string;
  createdAt: string;
  updatedAt: string;
  budgetName?: string;
}

export function TransactionDetails({
  description,
  date,
  accountBookName,
  createdAt,
  updatedAt,
  budgetName
}: TransactionDetailsProps) {
  // 格式化金额显示
  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined) return "¥0.00";
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="detail-card">
      <div className="detail-title">基本信息</div>
      <div className="detail-list">
        <div className="detail-item">
          <div className="detail-label">交易名称</div>
          <div className="detail-value">{description}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">交易时间</div>
          <div className="detail-value">{date}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">账本</div>
          <div className="detail-value">{accountBookName}</div>
        </div>
        {budgetName && (
          <div className="detail-item">
            <div className="detail-label">预算</div>
            <div className="detail-value">
              {budgetName}
            </div>
          </div>
        )}
        <div className="detail-item">
          <div className="detail-label">创建时间</div>
          <div className="detail-value">{createdAt}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">更新时间</div>
          <div className="detail-value">{updatedAt}</div>
        </div>
      </div>
    </div>
  );
}
