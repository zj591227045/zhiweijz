'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RolloverRecord } from '@/store/budget-detail-store';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

interface RolloverHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  history: RolloverRecord[];
}

export function RolloverHistoryDialog({ isOpen, onClose, history }: RolloverHistoryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>结转历史</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-4">
          {history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{record.period}</div>
                    <div className={`font-medium ${
                      record.type === 'SURPLUS' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {record.type === 'SURPLUS' ? '+' : '-'}{formatCurrency(Math.abs(record.amount))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dayjs(record.createdAt).format('YYYY年MM月DD日 HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无结转历史记录
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
