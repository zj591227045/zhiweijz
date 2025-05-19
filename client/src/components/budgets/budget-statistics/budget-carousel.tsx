'use client';

import { useRef, useEffect } from 'react';

interface BudgetCard {
  id: string;
  name: string;
  period: string;
  userId?: string;
  userName?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  budgetId: string;
}

interface BudgetCarouselProps {
  budgetCards: BudgetCard[];
  familyMembers: FamilyMember[];
  selectedBudgetId: string | null;
  onBudgetSelect: (budgetId: string) => void;
  accountBookType: 'PERSONAL' | 'FAMILY';
}

export function BudgetCarousel({
  budgetCards,
  familyMembers,
  selectedBudgetId,
  onBudgetSelect,
  accountBookType
}: BudgetCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // 当选中的预算ID变化时，滚动到对应的卡片
  useEffect(() => {
    if (carouselRef.current && selectedBudgetId) {
      const selectedCard = carouselRef.current.querySelector(`[data-budget-id="${selectedBudgetId}"]`);
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedBudgetId]);

  // 根据账本类型显示不同的卡片
  const renderCards = () => {
    // 如果没有预算卡片，显示空状态
    if (budgetCards.length === 0 && familyMembers.length === 0) {
      return (
        <div className="empty-budget-cards">
          <p>暂无预算数据</p>
        </div>
      );
    }

    // 如果是家庭账本且有家庭成员，并且当前是个人预算类型，显示家庭成员的预算
    if (accountBookType === 'FAMILY' && familyMembers.length > 0 && budgetCards.some(card => card.type === 'PERSONAL')) {
      // 确保每个家庭成员都有有效的预算ID
      const validFamilyMembers = familyMembers.filter(member => member.budgetId);

      if (validFamilyMembers.length === 0) {
        return (
          <div className="empty-budget-cards">
            <p>暂无家庭成员预算数据</p>
          </div>
        );
      }

      return validFamilyMembers.map(member => {
        const isActive = member.budgetId === selectedBudgetId;
        return (
          <div
            key={member.id}
            className={`budget-card ${isActive ? 'active' : ''}`}
            onClick={() => onBudgetSelect(member.budgetId)}
            data-budget-id={member.budgetId}
          >
            <div className="budget-name">{member.name}</div>
            <div className="budget-period">个人预算</div>
          </div>
        );
      });
    }

    // 否则显示普通预算卡片
    return budgetCards.map(card => {
      const isActive = card.id === selectedBudgetId;
      return (
        <div
          key={card.id}
          className={`budget-card ${isActive ? 'active' : ''}`}
          onClick={() => onBudgetSelect(card.id)}
          data-budget-id={card.id}
        >
          <div className="budget-name">{card.name}</div>
          <div className="budget-period">{card.period}</div>
        </div>
      );
    });
  };

  return (
    <div className="budget-carousel" ref={carouselRef}>
      {renderCards()}
    </div>
  );
}
