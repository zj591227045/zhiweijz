"use client";

interface TransactionDetailsProps {
  description: string;
  date: string;
  accountBookName: string;
  createdAt: string;
  updatedAt: string;
}

export function TransactionDetails({
  description,
  date,
  accountBookName,
  createdAt,
  updatedAt
}: TransactionDetailsProps) {
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
