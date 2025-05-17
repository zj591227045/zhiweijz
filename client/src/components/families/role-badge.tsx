"use client";

import { FamilyRole } from "@/lib/stores/family-store";

interface RoleBadgeProps {
  role: FamilyRole | string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === FamilyRole.ADMIN || role === "ADMIN";
  
  return (
    <span className={`role-badge ${isAdmin ? 'admin' : 'member'}`}>
      {isAdmin ? '管理员' : '成员'}
    </span>
  );
}
