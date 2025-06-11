'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { BudgetApiService } from '@/api/budget-api';
import { AccountBookApiService } from '@/api/account-book-api';
import { FamilyApiService } from '@/api/family-api';
import { toast } from 'sonner';
import type { OnboardingStep } from '@zhiweijz/core';

export function BudgetSetupStep() {
  const {
    selectedAccountType,
    budgetEnabled,
    personalBudgetAmount,
    familyBudgets,
    createdFamilyId,
    setBudgetEnabled,
    setPersonalBudgetAmount,
    setFamilyBudgets,
    previousStep,
    setCurrentStep,
  } = useOnboardingStore();

  const { currentAccountBook: storeCurrentAccountBook } = useAccountBookStore();

  const [localPersonalBudget, setLocalPersonalBudget] = useState(personalBudgetAmount || 3000);
  const [localFamilyBudgets, setLocalFamilyBudgets] = useState(familyBudgets);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAccountBook, setCurrentAccountBook] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);
  const [showSmartSkip, setShowSmartSkip] = useState(false);
  const [currentBudgets, setCurrentBudgets] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER' | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // 专门的方法来跳转到主题选择步骤
  const goToThemeSelection = () => {
    console.log('🎯 [BudgetSetup] Directly going to theme-selection step');

    if (isNavigating) {
      console.log('⚠️ [BudgetSetup] Already navigating, ignoring duplicate call');
      return;
    }

    setIsNavigating(true);
    setCurrentStep('theme-selection' as OnboardingStep);
    console.log('✅ [BudgetSetup] Successfully set step to theme-selection');
  };

  // 获取账本和家庭成员信息
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取当前账本
        const accountBook = storeCurrentAccountBook || await AccountBookApiService.getDefaultAccountBook();
        if (accountBook) {
          setCurrentAccountBook(accountBook);

          // 检查是否已有当月预算
          await checkCurrentBudgets(accountBook.id);
        }

        // 如果是家庭记账且有家庭ID，获取家庭成员信息和用户角色
        if (selectedAccountType === 'family' && createdFamilyId) {
          try {
            const familyData = await FamilyApiService.getFamilyById(createdFamilyId);
            if (familyData.members) {
              setFamilyMembers(familyData.members);

              // 找到当前用户并设置角色
              const currentUserMember = familyData.members.find((member: any) => member.isCurrentUser);
              if (currentUserMember) {
                setUserRole(currentUserMember.role === 'admin' ? 'ADMIN' : 'MEMBER');
                setCurrentUser(currentUserMember);
              }

              // 初始化家庭成员预算
              const initialBudgets: Record<string, number> = {};
              familyData.members.forEach((member: any) => {
                initialBudgets[member.id] = 0;
              });
              setLocalFamilyBudgets(initialBudgets);
            }
          } catch (error) {
            // 移除调试输出
          }
        }
      } catch (error) {
        // 移除调试输出
      }
    };

    fetchData();
  }, [selectedAccountType, createdFamilyId, storeCurrentAccountBook]);

  // 检查当前预算
  const checkCurrentBudgets = async (accountBookId: string) => {
    try {
      console.log('🔍 [BudgetSetup] Checking current budgets for accountBookId:', accountBookId);

      // 直接查询该账本下的所有预算，然后在前端过滤
      const budgets = await BudgetApiService.getBudgets({
        accountBookId
      });

      console.log('🔍 [BudgetSetup] Raw personal budgets from API:', budgets);

      // 过滤当月有效的预算，只保留金额大于0的预算
      const currentDate = new Date();
      const activeBudgets = budgets.filter((budget: any) => {
        const budgetStart = new Date(budget.startDate);
        const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;

        console.log('🔍 [BudgetSetup] Checking budget:', {
          id: budget.id,
          name: budget.name,
          amount: budget.amount,
          budgetType: budget.budgetType,
          familyMemberId: budget.familyMemberId,
          userId: budget.userId,
          startDate: budget.startDate,
          endDate: budget.endDate,
          budgetStart,
          budgetEnd,
          currentDate,
          isAmountValid: budget.amount > 0,
          isStartValid: budgetStart <= currentDate,
          isEndValid: !budgetEnd || budgetEnd >= currentDate
        });

        // 检查预算是否覆盖当前月份
        // 注意：金额为0的预算被认为是"未设置"的预算，不应该触发智能跳过
        return budget.amount > 0 &&
               budgetStart <= currentDate &&
               (!budgetEnd || budgetEnd >= currentDate);
      });

      console.log('🔍 [BudgetSetup] Active budgets after filtering:', activeBudgets);

      if (activeBudgets.length > 0) {
        console.log('🔍 [BudgetSetup] Setting showSkipPrompt to true');
        setCurrentBudgets(activeBudgets);
        setShowSkipPrompt(true);
      } else {
        console.log('🔍 [BudgetSetup] No active budgets found, keeping showSkipPrompt false');
        // 即使没有活跃预算，也要设置所有预算供后续查找使用
        setCurrentBudgets(budgets);
      }
    } catch (error) {
      console.error('🔍 [BudgetSetup] Error checking current budgets:', error);
    }
  };

  // 处理跳过预算设置
  const handleSkipBudgetSetup = () => {
    console.log('⏭️ [BudgetSetup] Skip budget setup clicked, going to theme selection');
    goToThemeSelection();
  };

  // 处理重新设置预算
  const handleResetBudget = () => {
    console.log('🔄 [BudgetSetup] Reset budget clicked');
    setShowSkipPrompt(false);
    setShowSmartSkip(false);

    // 强制设置预算启用状态，跳过选择界面，直接进入预算设置表单
    setBudgetEnabled(true);

    console.log('🔄 [BudgetSetup] After reset - showSkipPrompt:', false, 'budgetEnabled:', true);
  };

  // 处理预算启用选择
  const handleBudgetEnabledSelect = (enabled: boolean) => {
    console.log('💡 [BudgetSetup] Budget enabled selected:', enabled);
    setBudgetEnabled(enabled);
    if (!enabled) {
      // 如果不启用预算，直接进入下一步（主题选择）
      console.log('💡 [BudgetSetup] Budget disabled, going to theme selection');
      goToThemeSelection();
    }
  };

  // 处理个人预算金额变化
  const handlePersonalBudgetChange = (value: string) => {
    const amount = parseInt(value) || 0;
    setLocalPersonalBudget(amount);
  };

  // 处理家庭成员预算变化
  const handleFamilyBudgetChange = (memberId: string, value: string) => {
    const amount = parseInt(value) || 0;
    setLocalFamilyBudgets(prev => ({
      ...prev,
      [memberId]: amount,
    }));
  };

  // 处理确认设置
  const handleConfirmSetup = async () => {
    console.log('✅ [BudgetSetup] Confirm setup clicked');
    if (!currentAccountBook) {
      toast.error('未找到账本信息，请重试');
      return;
    }

    if (isLoading) {
      console.log('⚠️ [BudgetSetup] Already processing, ignoring duplicate call');
      return;
    }

    setIsLoading(true);

    try {
      // 如果 currentBudgets 为空，重新查询预算数据
      let budgetsToSearch = currentBudgets;
      if (currentBudgets.length === 0) {
        console.log('🔍 [BudgetSetup] currentBudgets is empty, re-querying budgets');
        const budgets = await BudgetApiService.getBudgets({
          accountBookId: currentAccountBook.id,
          budgetType: 'PERSONAL'
        });
        budgetsToSearch = budgets;
        setCurrentBudgets(budgets);
        console.log('🔍 [BudgetSetup] Re-queried budgets:', budgets);
      }

      if (selectedAccountType === 'personal') {
        // 处理个人预算
        if (localPersonalBudget > 0) {
          // 查找用户的个人预算：budgetType为PERSONAL且userId为当前用户ID
          console.log('🔍 [BudgetSetup] Looking for personal budget in budgetsToSearch:', budgetsToSearch.map(b => ({
            id: b.id,
            name: b.name,
            budgetType: b.budgetType,
            familyMemberId: b.familyMemberId,
            categoryId: b.categoryId,
            userId: b.userId,
            amount: b.amount,
            startDate: b.startDate,
            endDate: b.endDate
          })));

          // 简化查询：budgetType为PERSONAL且userId为当前用户ID
          const personalBudgets = budgetsToSearch.filter(budget =>
            budget.budgetType === 'PERSONAL' && budget.userId
          );

          console.log('🔍 [BudgetSetup] Found personal budgets:', personalBudgets);

          // 如果有多个，选择最新的（按startDate排序）
          const existingBudget = personalBudgets.length > 0
            ? personalBudgets.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
            : null;

          console.log('🔍 [BudgetSetup] Selected personal budget:', existingBudget);

          if (existingBudget) {
            // 更新现有预算
            console.log('🔄 [BudgetSetup] Updating existing personal budget:', existingBudget.id);
            await BudgetApiService.updateBudget(existingBudget.id, {
              amount: localPersonalBudget,
            });
            toast.success('个人预算更新成功！');
            setPersonalBudgetAmount(localPersonalBudget);
          } else {
            // 在引导页面中，预算一定存在，如果没找到说明查询逻辑有问题
            console.error('❌ [BudgetSetup] No existing personal budget found, but budget should exist in onboarding');
            console.error('❌ [BudgetSetup] Current budgets:', budgetsToSearch);
            toast.error('未找到个人预算，请联系管理员');
            return;
          }
        }
      } else {
        // 处理家庭成员预算 - 在引导页面中，预算一定存在，只需要更新
        const budgetsToUpdate: { id: string; amount: number }[] = [];
        const missingBudgets: string[] = [];

        if (userRole === 'ADMIN') {
          // 管理员可以为所有成员更新预算
          for (const [memberId, amount] of Object.entries(localFamilyBudgets)) {
            if (amount > 0) {
              const member = familyMembers.find(m => m.id === memberId);

              // 检查是否已有该成员的预算
              const existingBudget = budgetsToSearch.find(budget =>
                budget.familyMemberId === memberId && !budget.categoryId
              );

              if (existingBudget) {
                // 更新现有预算
                console.log(`🔄 [BudgetSetup] Updating existing budget for member ${memberId}:`, existingBudget.id);
                budgetsToUpdate.push({
                  id: existingBudget.id,
                  amount: amount,
                });
              } else {
                // 在引导页面中，预算一定存在，如果没找到说明查询逻辑有问题
                console.error(`❌ [BudgetSetup] No existing budget found for member ${memberId}, but budget should exist in onboarding`);
                missingBudgets.push(member?.name || `成员${memberId}`);
              }
            }
          }
        } else {
          // 普通成员只能为自己更新预算
          if (currentUser && localFamilyBudgets[currentUser.id] > 0) {
            const existingBudget = budgetsToSearch.find(budget =>
              budget.familyMemberId === currentUser.id && !budget.categoryId
            );

            if (existingBudget) {
              // 更新现有预算
              console.log(`🔄 [BudgetSetup] Updating existing budget for current user:`, existingBudget.id);
              budgetsToUpdate.push({
                id: existingBudget.id,
                amount: localFamilyBudgets[currentUser.id],
              });
            } else {
              // 在引导页面中，预算一定存在，如果没找到说明查询逻辑有问题
              console.error(`❌ [BudgetSetup] No existing budget found for current user, but budget should exist in onboarding`);
              missingBudgets.push(currentUser.name);
            }
          }
        }

        // 如果有缺失的预算，显示错误
        if (missingBudgets.length > 0) {
          console.error('❌ [BudgetSetup] Current budgets:', budgetsToSearch);
          toast.error(`未找到以下成员的预算：${missingBudgets.join(', ')}，请联系管理员`);
          return;
        }

        // 执行更新操作
        for (const updateData of budgetsToUpdate) {
          await BudgetApiService.updateBudget(updateData.id, {
            amount: updateData.amount,
          });
        }

        if (budgetsToUpdate.length > 0) {
          setFamilyBudgets(localFamilyBudgets);
          toast.success(`成功更新${budgetsToUpdate.length}个${userRole === 'ADMIN' ? '家庭成员' : '个人'}预算！`);
        }
      }

      console.log('✅ [BudgetSetup] Setup completed, going to theme selection');
      goToThemeSelection();
    } catch (error: any) {
      const errorMessage = error.message || '设置预算失败，请重试';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 家庭成员数据从API获取

  // 添加调试日志
  console.log('🎨 [BudgetSetup] Render state:', {
    showSkipPrompt,
    showSmartSkip,
    currentBudgets: currentBudgets.length,
    budgetEnabled,
    selectedAccountType,
    userRole
  });

  // 只在组件初始化时重置预算启用状态
  useEffect(() => {
    // 只在初始加载时，如果没有智能跳过提示且 budgetEnabled 是 false，重置为 null
    // 这样可以确保新用户看到选择界面，但不会干扰用户的选择
    // 但是如果 budgetEnabled 是 true（比如重新设置后），不要重置
    if (!showSkipPrompt && budgetEnabled === false) {
      console.log('🔄 [BudgetSetup] Resetting budgetEnabled from false to null for new setup');
      setBudgetEnabled(null as any);
    }
  }, [showSkipPrompt]); // 只依赖 showSkipPrompt，避免无限循环

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-title">预算控制设置</div>
      <div className="onboarding-step-description">
        科学的预算管理，让您的财务更加健康
      </div>

      {/* 当前账本信息 */}
      {currentAccountBook && (
        <div className="current-account-book-info">
          <div className="account-book-header">
            <div className="account-book-icon">
              <i className="fas fa-book"></i>
            </div>
            <div className="account-book-details">
              <h4 className="account-book-name">{currentAccountBook.name}</h4>
              <div className="account-book-meta">
                {currentAccountBook.familyId ? (
                  <span className="account-book-type family">
                    <i className="fas fa-users"></i>
                    家庭账本
                  </span>
                ) : (
                  <span className="account-book-type personal">
                    <i className="fas fa-user"></i>
                    个人账本
                  </span>
                )}
                <span className="account-book-stats">
                  {currentAccountBook.transactionCount} 笔交易 · {currentAccountBook.budgetCount} 个预算
                </span>
              </div>
            </div>
          </div>
          {currentAccountBook.description && (
            <div className="account-book-description">
              {currentAccountBook.description}
            </div>
          )}
        </div>
      )}

      {/* 智能跳过提示 */}
      {showSkipPrompt && currentBudgets.length > 0 && (
        <div className="smart-skip-card success">
          <div className="smart-skip-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="smart-skip-content">
            <div className="smart-skip-title">检测到您已设置了本月预算</div>
            <div className="smart-skip-description">
              检测到您已设置了{currentBudgets.length}个本月预算，是否跳过预算设置？
            </div>
            <div className="smart-skip-current-budgets">
              {currentBudgets.map((budget: any) => {
                console.log('🔍 [BudgetSetup] Budget item:', {
                  id: budget.id,
                  name: budget.name,
                  familyMemberId: budget.familyMemberId,
                  userId: budget.userId,
                  amount: budget.amount
                });

                let budgetLabel = '';
                if (budget.familyMemberId) {
                  const member = familyMembers.find(m => m.id === budget.familyMemberId);
                  budgetLabel = `${member?.name || '成员'}的预算`;
                } else if (budget.userId) {
                  const user = familyMembers.find(m => m.id === budget.userId);
                  budgetLabel = `${user?.name || '用户'}的预算`;
                } else {
                  budgetLabel = budget.name || '通用预算';
                }

                return (
                  <div key={budget.id} className="smart-skip-current-info">
                    <i className="fas fa-calendar-alt"></i>
                    <span>
                      {budgetLabel}：¥{budget.amount} ({budget.startDate.split('T')[0]} 至 {budget.endDate ? budget.endDate.split('T')[0] : '月末'})
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="smart-skip-actions">
              <button
                className="smart-skip-button smart-skip-button-primary"
                onClick={handleSkipBudgetSetup}
              >
                <i className="fas fa-arrow-right"></i>
                跳过此步骤
              </button>
              <button
                className="smart-skip-button smart-skip-button-secondary"
                onClick={handleResetBudget}
              >
                重新设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预算控制理念介绍 */}
      {!showSkipPrompt && (
        <div className="budget-concept-section">
        <div className="budget-concept-header">
          <div className="budget-concept-icon">
            <i className="fas fa-lightbulb"></i>
          </div>
          <h3 className="budget-concept-title">预算控制的设计理念</h3>
        </div>

        <div className="budget-concept-cards">
          <div className="budget-concept-card">
            <div className="concept-card-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="concept-card-content">
              <h4 className="concept-card-title">设置消费预算，控制支出</h4>
              <p className="concept-card-description">
                为每月设定合理的支出上限，实时监控消费进度，避免冲动消费和超支风险
              </p>
            </div>
          </div>

          <div className="budget-concept-card">
            <div className="concept-card-icon">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <div className="concept-card-content">
              <h4 className="concept-card-title">通过预算结转，确保这月多花，下月少花</h4>
              <p className="concept-card-description">
                超支金额自动结转到下月，形成负债提醒；节余金额也可结转，让理财更灵活
              </p>
            </div>
          </div>

          <div className="budget-concept-card">
            <div className="concept-card-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="concept-card-content">
              <h4 className="concept-card-title">通过预算控制实现真正的开源节流</h4>
              <p className="concept-card-description">
                数据驱动的财务决策，帮您发现消费规律，优化支出结构，实现财富积累
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 预算启用选择 */}
      {budgetEnabled === null && !showSkipPrompt && (
        <div className="budget-choice-section">
          <h4 className="budget-choice-title">是否启用预算控制？</h4>
          <div className="budget-choice-options">
            <button
              className="budget-choice-button budget-choice-primary"
              onClick={() => handleBudgetEnabledSelect(true)}
            >
              <div className="budget-choice-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="budget-choice-content">
                <div className="budget-choice-label">启用预算控制</div>
                <div className="budget-choice-desc">设置月度预算，实时监控支出情况</div>
              </div>
            </button>

            <button
              className="budget-choice-button budget-choice-secondary"
              onClick={() => handleBudgetEnabledSelect(false)}
            >
              <div className="budget-choice-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="budget-choice-content">
                <div className="budget-choice-label">暂不启用</div>
                <div className="budget-choice-desc">稍后可在设置中开启预算功能</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 预算设置表单 */}
      {budgetEnabled && !showSkipPrompt && (
        <div className="onboarding-form">
          <div className="budget-benefits-section">
            <h4 className="budget-benefits-title">启用预算控制后，您将获得：</h4>
            <div className="budget-benefits-grid">
              <div className="budget-benefit-item">
                <i className="fas fa-tachometer-alt"></i>
                <span>实时支出监控</span>
              </div>
              <div className="budget-benefit-item">
                <i className="fas fa-bell"></i>
                <span>智能超支预警</span>
              </div>
              <div className="budget-benefit-item">
                <i className="fas fa-sync-alt"></i>
                <span>自动月度结转</span>
              </div>
              <div className="budget-benefit-item">
                <i className="fas fa-chart-pie"></i>
                <span>分类预算管理</span>
              </div>
              <div className="budget-benefit-item">
                <i className="fas fa-piggy-bank"></i>
                <span>储蓄习惯养成</span>
              </div>
            </div>
          </div>

          {/* 个人预算设置 */}
          {selectedAccountType === 'personal' && (
            <div className="onboarding-form-group">
              <label className="onboarding-form-label">月度预算金额</label>
              <div className="budget-input-group">
                <span className="budget-currency">¥</span>
                <input
                  type="number"
                  className="onboarding-form-input budget-input"
                  placeholder="3000"
                  value={localPersonalBudget || ''}
                  onChange={(e) => handlePersonalBudgetChange(e.target.value)}
                  min="0"
                  step="100"
                />
              </div>
              <div className="budget-suggestion">
                建议设置为月收入的70-80%
              </div>
            </div>
          )}

          {/* 家庭预算设置 */}
          {selectedAccountType === 'family' && (
            <div className="family-budget-section">
              <h4 className="family-budget-title">
                {userRole === 'ADMIN' ? '设置家庭成员预算' : '设置您的个人预算'}
              </h4>
              <div className="family-budget-description">
                {userRole === 'ADMIN'
                  ? '作为管理员，您可以为每位家庭成员设置月度预算金额'
                  : '设置您的月度预算金额'
                }
              </div>

              {userRole === 'ADMIN' ? (
                // 管理员可以设置所有成员的预算
                familyMembers.map((member) => (
                  <div key={member.id} className="onboarding-form-group">
                    <label className="onboarding-form-label">
                      {member.name}的月度预算
                      {member.isCurrentUser && <span className="current-user-badge">（您）</span>}
                    </label>
                    <div className="budget-input-group">
                      <span className="budget-currency">¥</span>
                      <input
                        type="number"
                        className="onboarding-form-input budget-input"
                        placeholder="3000"
                        value={localFamilyBudgets[member.id] || ''}
                        onChange={(e) => handleFamilyBudgetChange(member.id, e.target.value)}
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                ))
              ) : (
                // 普通成员只能设置自己的预算
                currentUser && (
                  <div className="onboarding-form-group">
                    <label className="onboarding-form-label">您的月度预算</label>
                    <div className="budget-input-group">
                      <span className="budget-currency">¥</span>
                      <input
                        type="number"
                        className="onboarding-form-input budget-input"
                        placeholder="3000"
                        value={localFamilyBudgets[currentUser.id] || ''}
                        onChange={(e) => handleFamilyBudgetChange(currentUser.id, e.target.value)}
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <div className="onboarding-button-group">
            <button
              className="onboarding-button onboarding-button-secondary"
              onClick={previousStep}
              disabled={isLoading}
            >
              上一步
            </button>
            <button
              className="onboarding-button onboarding-button-secondary"
              onClick={handleSkipBudgetSetup}
              disabled={isLoading}
            >
              跳过设置
            </button>
            <button
              className="onboarding-button onboarding-button-primary"
              onClick={handleConfirmSetup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  设置中...
                </>
              ) : (
                '确认设置'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
