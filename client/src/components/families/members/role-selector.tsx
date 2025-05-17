'use client';

import { Role } from '@/lib/stores/family-store';
import { cn } from '@/lib/utils';

interface RoleSelectorProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}

export function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  return (
    <div className="role-selector">
      <div className="role-label">角色权限</div>
      <div className="role-options">
        <button 
          className={cn(
            "role-option",
            currentRole === 'ADMIN' && "active"
          )}
          onClick={() => onRoleChange('ADMIN')}
        >
          管理员
        </button>
        <button 
          className={cn(
            "role-option",
            currentRole === 'MEMBER' && "active"
          )}
          onClick={() => onRoleChange('MEMBER')}
        >
          成员
        </button>
      </div>
    </div>
  );
}
