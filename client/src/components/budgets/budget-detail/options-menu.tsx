'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface OptionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function OptionsMenu({ onEdit, onDelete }: OptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="icon-button">
          <i className="fas fa-ellipsis-v"></i>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <i className="fas fa-edit mr-2"></i>
          编辑预算
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-red-500 focus:text-red-500"
        >
          <i className="fas fa-trash-alt mr-2"></i>
          删除预算
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
