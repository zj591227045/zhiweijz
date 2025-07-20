'use client';

import { Family } from '@/types';
import { FamilyCard } from './family-card';

interface FamilyListProps {
  families: Family[];
  onCreateFamily: () => void;
  onJoinFamily: () => void;
  onFamilyClick?: (familyId: string) => void;
}

export function FamilyList({
  families,
  onCreateFamily,
  onJoinFamily,
  onFamilyClick,
}: FamilyListProps) {
  return (
    <div className="space-y-4">
      <div className="book-header-card">
        <div className="book-title">家庭共享账本</div>
        <div className="book-description">记录家庭日常收支，共同管理家庭财务</div>
        <div className="book-stats">
          <div className="stat-item">
            <div className="stat-value">{families.length}</div>
            <div className="stat-label">家庭</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {families.reduce((sum, family) => sum + (family.memberCount || 0), 0)}
            </div>
            <div className="stat-label">成员</div>
          </div>
        </div>
      </div>

      <div className="family-list-header">
        <h2 className="family-list-title">我的家庭</h2>
        <div className="family-action-buttons">
          <button className="family-action-btn family-action-btn-primary" onClick={onCreateFamily}>
            <i className="fas fa-plus"></i>
            <span>创建家庭</span>
          </button>
          <button className="family-action-btn family-action-btn-secondary" onClick={onJoinFamily}>
            <i className="fas fa-sign-in-alt"></i>
            <span>加入家庭</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {families.map((family) => (
          <FamilyCard key={family.id} family={family} onFamilyClick={onFamilyClick} />
        ))}
      </div>
    </div>
  );
}
