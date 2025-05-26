'use client';

import Link from 'next/link';

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

  // 过滤管理选项
  const filteredOptions = managementOptions.filter(option => 
    !option.adminOnly || isAdmin
  );

  return (
    <div className="management-section">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-cogs"></i>
          <span>家庭管理</span>
        </div>
      </div>
      
      <div className="management-options">
        {filteredOptions.map((option) => (
          <Link href={option.link} key={option.id} className="management-option">
            <div className="option-icon">
              <i className={`fas fa-${option.icon}`}></i>
            </div>
            <div className="option-content">
              <div className="option-title">{option.title}</div>
              <div className="option-description">{option.description}</div>
            </div>
            <div className="option-arrow">
              <i className="fas fa-chevron-right"></i>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="danger-zone">
        <div className="danger-title">
          <i className="fas fa-exclamation-triangle"></i>
          <span>危险操作</span>
        </div>
        
        <div className="danger-actions">
          {isAdmin ? (
            <>
              <button className="danger-button delete" onClick={onDelete}>
                <i className="fas fa-trash-alt"></i>
                <span>解散家庭</span>
              </button>
              <div className="warning-text">
                解散家庭将永久移除所有相关数据，此操作不可恢复。
              </div>
            </>
          ) : (
            <>
              <button className="danger-button leave" onClick={onLeave}>
                <i className="fas fa-sign-out-alt"></i>
                <span>退出家庭</span>
              </button>
              <div className="warning-text">
                退出家庭后，您将无法访问该家庭的数据。
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
