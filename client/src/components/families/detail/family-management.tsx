"use client";

import Link from "next/link";

interface FamilyManagementProps {
  isAdmin: boolean;
  familyId: string;
  onLeave: () => void;
  onDelete: () => void;
}

export function FamilyManagement({ isAdmin, familyId, onLeave, onDelete }: FamilyManagementProps) {
  // 管理选项配置
  const managementOptions = [
    {
      id: 'members',
      icon: 'users-cog',
      title: '成员管理',
      description: '管理家庭成员',
      link: `/families/${familyId}/members`,
      adminOnly: false
    },
    {
      id: 'budget',
      icon: 'chart-pie',
      title: '预算管理',
      description: '设置家庭预算',
      link: `/families/${familyId}/budget`,
      adminOnly: true
    },
    {
      id: 'categories',
      icon: 'tags',
      title: '分类管理',
      description: '自定义交易分类',
      link: `/families/${familyId}/categories`,
      adminOnly: true
    },
    {
      id: 'settings',
      icon: 'cog',
      title: '家庭设置',
      description: '高级设置选项',
      link: `/families/${familyId}/settings`,
      adminOnly: true
    }
  ];

  // 过滤管理选项，根据用户角色
  const filteredOptions = managementOptions.filter(option => 
    !option.adminOnly || (option.adminOnly && isAdmin)
  );

  return (
    <>
      <div className="section-title">家庭管理</div>
      
      <div className="management-options">
        {filteredOptions.map((option) => (
          <Link href={option.link} key={option.id} className="management-option">
            <div className="option-icon">
              <i className={`fas fa-${option.icon}`}></i>
            </div>
            <div className="option-title">{option.title}</div>
            <div className="option-description">{option.description}</div>
          </Link>
        ))}
      </div>
      
      <div className="danger-zone">
        <div className="danger-title">危险操作</div>
        
        {isAdmin ? (
          <>
            <button className="danger-button" onClick={onDelete}>
              解散家庭
            </button>
            <div className="warning-text">
              解散家庭将永久移除所有相关数据，此操作不可恢复。
            </div>
          </>
        ) : (
          <button className="danger-button" onClick={onLeave}>
            退出家庭
          </button>
        )}
      </div>
    </>
  );
}
