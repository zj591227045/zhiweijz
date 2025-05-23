'use client';

import { cn } from '@/lib/utils';
import { FamilyRole } from '@/types';

interface RoleBadgeProps {
  role: FamilyRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'role-badge',
        role === 'ADMIN' ? 'admin' : 'member'
      )}
    >
      {role === 'ADMIN' ? '管理员' : '成员'}
    </span>
  );
}
