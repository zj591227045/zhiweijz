'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import '@/styles/transaction-selection-modal.css';

interface TransactionRecord {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
  note?: string;
  date: string;
  categoryId: string;
  categoryName?: string;
  budgetId?: string;
  duplicateDetection?: {
    isDuplicate: boolean;
    confidence: number;
    matchedTransactions: Array<{
      id: string;
      amount: number;
      description: string;
      date: Date;
      categoryName: string;
      similarity: number;
    }>;
    reason?: string;
  };
}

interface TransactionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: TransactionRecord[];
  onConfirm: (selectedRecords: TransactionRecord[]) => void;
  isLoading?: boolean;
}

export function TransactionSelectionModal({
  isOpen,
  onClose,
  records,
  onConfirm,
  isLoading = false,
}: TransactionSelectionModalProps) {
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());

  // 初始化时选中所有非重复的记录
  React.useEffect(() => {
    if (records.length > 0) {
      const nonDuplicateIndices = records
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => !record.duplicateDetection?.isDuplicate)
        .map(({ index }) => index);
      
      setSelectedRecords(new Set(nonDuplicateIndices));
    }
  }, [records]);

  const handleRecordToggle = (index: number) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map((_, index) => index)));
    }
  };

  const handleConfirm = () => {
    if (selectedRecords.size === 0) {
      toast.error('请至少选择一条记录');
      return;
    }

    const selected = Array.from(selectedRecords).map(index => records[index]);
    onConfirm(selected);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getTypeColor = (type: string) => {
    return type === 'INCOME' ? 'text-green-600' : 'text-red-600';
  };

  const getTypeText = (type: string) => {
    return type === 'INCOME' ? '收入' : '支出';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col transaction-selection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dialog-title">
            <FileText className="h-5 w-5 primary-icon" />
            选择要导入的记账记录
          </DialogTitle>
          <p className="text-sm text-secondary">
            检测到 {records.length} 条记账记录，请选择需要导入的记录。
            {records.some(r => r.duplicateDetection?.isDuplicate) && (
              <span className="ml-2 warning-text">
                ⚠️ 部分记录可能重复，已自动取消选择
              </span>
            )}
          </p>
        </DialogHeader>

        <div
          className="flex-1 space-y-4 transaction-selection-content"
          style={{
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 200px)',
            touchAction: 'pan-y', // 只允许垂直滚动
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
          onTouchStart={(e) => {
            // 阻止手势监听器处理这个区域的触摸事件
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // 阻止手势监听器处理滚动事件
            e.stopPropagation();
          }}
        >
          {/* 全选控制 */}
          <div className="flex items-center justify-between p-4 rounded-lg select-all-control">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedRecords.size === records.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                全选 ({selectedRecords.size}/{records.length})
              </label>
            </div>
            <div className="text-sm text-secondary">
              已选择 {selectedRecords.size} 条记录
            </div>
          </div>

          {/* 记录列表 */}
          <div className="space-y-3">
            {records.map((record, index) => {
              const isSelected = selectedRecords.has(index);
              const isDuplicate = record.duplicateDetection?.isDuplicate;
              const confidence = record.duplicateDetection?.confidence || 0;

              return (
                <Card
                  key={index}
                  className={`record-card ${
                    isSelected ? 'selected' : ''
                  } ${isDuplicate ? 'duplicate' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleRecordToggle(index)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        {/* 主要信息 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className={`font-semibold ${getTypeColor(record.type)}`}>
                              {formatCurrency(record.amount)}
                            </span>
                            <Badge variant="outline" className={getTypeColor(record.type)}>
                              {getTypeText(record.type)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(record.date)}
                          </div>
                        </div>

                        {/* 描述和分类 */}
                        <div className="space-y-1">
                          {(record.description || record.note) && (
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {record.description || record.note}
                              </span>
                            </div>
                          )}
                          
                          {record.categoryName && (
                            <div className="flex items-center space-x-2">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="secondary">{record.categoryName}</Badge>
                            </div>
                          )}
                        </div>

                        {/* 重复检测警告 */}
                        {isDuplicate && (
                          <div className="flex items-start space-x-2 p-3 rounded-md duplicate-warning">
                            <AlertTriangle className="h-4 w-4 mt-0.5 warning-icon" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                可能重复 (相似度: {Math.round(confidence * 100)}%)
                              </div>
                              {record.duplicateDetection?.reason && (
                                <div className="text-xs mt-1">
                                  {record.duplicateDetection.reason}
                                </div>
                              )}
                              {record.duplicateDetection?.matchedTransactions &&
                               record.duplicateDetection.matchedTransactions.length > 0 && (
                                <div className="text-xs mt-2">
                                  <div className="font-medium">相似记录:</div>
                                  {record.duplicateDetection.matchedTransactions.slice(0, 2).map((match, i) => (
                                    <div key={i} className="ml-2">
                                      • {formatCurrency(match.amount)} - {match.description}
                                      ({new Date(match.date).toLocaleDateString('zh-CN')})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex justify-end space-x-2 pt-4 action-buttons">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="btn-cancel"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedRecords.size === 0}
            className="btn-primary"
          >
            {isLoading ? '创建中...' : `确认导入 (${selectedRecords.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
