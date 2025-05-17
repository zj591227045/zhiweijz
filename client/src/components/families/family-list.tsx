"use client";

import { Family } from "@/lib/stores/family-store";
import { FamilyCard } from "./family-card";

interface FamilyListProps {
  families: Family[];
  onCreateFamily: () => void;
  onJoinFamily: () => void;
}

export function FamilyList({ families, onCreateFamily, onJoinFamily }: FamilyListProps) {
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
            <div className="stat-value">{families.reduce((sum, family) => sum + family.memberCount, 0)}</div>
            <div className="stat-label">成员</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">我的家庭</h2>
        <div className="flex space-x-2">
          <button 
            className="text-sm text-primary flex items-center"
            onClick={onCreateFamily}
          >
            <i className="fas fa-plus mr-1"></i>
            <span>创建</span>
          </button>
          <button 
            className="text-sm text-primary flex items-center"
            onClick={onJoinFamily}
          >
            <i className="fas fa-sign-in-alt mr-1"></i>
            <span>加入</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {families.map((family) => (
          <FamilyCard key={family.id} family={family} />
        ))}
      </div>
    </div>
  );
}
