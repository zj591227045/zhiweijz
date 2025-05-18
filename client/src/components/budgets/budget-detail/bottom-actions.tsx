'use client';

import { Button } from '@/components/ui/button';

interface BottomActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function BottomActions({ onEdit, onDelete }: BottomActionsProps) {
  return (
    <div className="bottom-actions">
      <Button
        className="w-full bg-blue-500 hover:bg-blue-600 mb-2"
        onClick={onEdit}
      >
        <i className="fas fa-edit mr-2"></i>
        编辑预算
      </Button>
      <Button
        variant="outline"
        className="w-full border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900"
        onClick={onDelete}
      >
        <i className="fas fa-trash-alt mr-2"></i>
        删除预算
      </Button>
    </div>
  );
}
