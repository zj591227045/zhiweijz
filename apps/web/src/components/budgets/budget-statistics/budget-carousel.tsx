'use client';

import { useRef, useEffect, useState } from 'react';

interface BudgetCard {
  id: string;
  name: string;
  period: string;
  type?: string;
  userId?: string;
  userName?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  budgetId: string;
  isCustodial?: boolean;
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
  accountBookType,
}: BudgetCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [visibleItems, setVisibleItems] = useState(3); // 默认可见数量

  // 计算总项目数和当前活动索引
  useEffect(() => {
    let items: Array<BudgetCard | FamilyMember> = [];
    let activeIdx = 0;

    if (
      accountBookType === 'FAMILY' &&
      familyMembers.length > 0 &&
      budgetCards.some((card) => card.type === 'PERSONAL')
    ) {
      const validFamilyMembers = familyMembers.filter((member) => member.budgetId);
      items = validFamilyMembers;

      if (selectedBudgetId) {
        const idx = validFamilyMembers.findIndex((member) => member.budgetId === selectedBudgetId);
        if (idx !== -1) activeIdx = idx;
      }
    } else {
      items = budgetCards;

      if (selectedBudgetId) {
        const idx = budgetCards.findIndex((card) => card.id === selectedBudgetId);
        if (idx !== -1) activeIdx = idx;
      }
    }

    setTotalItems(items.length);
    setActiveIndex(activeIdx);

    // 计算可见项目数量（基于容器宽度）
    const calculateVisibleItems = () => {
      if (carouselRef.current) {
        const containerWidth = carouselRef.current.offsetWidth;
        // 假设每个卡片宽度为120px加上间距
        const itemWidth = 120 + 12; // 卡片宽度 + 间距
        const visible = Math.floor(containerWidth / itemWidth);
        setVisibleItems(Math.max(visible, 1)); // 至少显示1个
      }
    };

    calculateVisibleItems();
    window.addEventListener('resize', calculateVisibleItems);

    return () => {
      window.removeEventListener('resize', calculateVisibleItems);
    };
  }, [budgetCards, familyMembers, selectedBudgetId, accountBookType]);

  // 当选中的预算ID变化时，滚动到对应的卡片
  useEffect(() => {
    if (carouselRef.current && selectedBudgetId) {
      const selectedCard = carouselRef.current.querySelector(
        `[data-budget-id="${selectedBudgetId}"]`,
      );
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedBudgetId]);

  // 处理滚动事件，更新活动索引
  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const itemWidth = carouselRef.current.scrollWidth / totalItems;
      const newIndex = Math.round(scrollLeft / itemWidth);

      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < totalItems) {
        setActiveIndex(newIndex);
      }
    }
  };

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
    if (
      accountBookType === 'FAMILY' &&
      familyMembers.length > 0 &&
      budgetCards.some((card) => card.type === 'PERSONAL')
    ) {
      // 确保每个家庭成员都有有效的预算ID
      const validFamilyMembers = familyMembers.filter((member) => member.budgetId);

      if (validFamilyMembers.length === 0) {
        return (
          <div className="empty-budget-cards">
            <p>暂无家庭成员预算数据</p>
          </div>
        );
      }

      return validFamilyMembers.map((member) => {
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
    return budgetCards.map((card) => {
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

  // 渲染滚动指示器
  const renderIndicators = () => {
    // 只有当项目数量大于可见数量时才显示指示器
    if (totalItems <= visibleItems) return null;

    return (
      <div className="scroll-indicator">
        {Array.from({ length: totalItems }).map((_, index) => (
          <div
            key={index}
            className={`indicator-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => {
              if (carouselRef.current) {
                const itemWidth = carouselRef.current.scrollWidth / totalItems;
                carouselRef.current.scrollTo({
                  left: index * itemWidth,
                  behavior: 'smooth',
                });
              }
            }}
          />
        ))}
      </div>
    );
  };

  // 处理左右箭头点击
  const handleArrowClick = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      carouselRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 只有当项目数量大于可见数量时才显示箭头
  const showArrows = totalItems > visibleItems;

  return (
    <div className="carousel-container">
      {showArrows && (
        <div className="carousel-arrow left" onClick={() => handleArrowClick('left')}>
          <i className="fas fa-chevron-left"></i>
        </div>
      )}

      <div className="budget-carousel" ref={carouselRef} onScroll={handleScroll}>
        {renderCards()}
      </div>

      {showArrows && (
        <div className="carousel-arrow right" onClick={() => handleArrowClick('right')}>
          <i className="fas fa-chevron-right"></i>
        </div>
      )}

      {renderIndicators()}
    </div>
  );
}
