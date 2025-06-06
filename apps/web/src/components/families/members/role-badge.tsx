'use client';

import { Role } from '@/types/family';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn('role-badge', role === 'ADMIN' ? 'admin-badge' : 'member-badge', className)}
    >
      {role === 'ADMIN' ? '管理员' : '成员'}
    </span>
  );
}
