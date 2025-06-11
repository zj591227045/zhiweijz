'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { FamilyApiService } from '@/api/family-api';
import { toast } from 'sonner';
import type { AccountType, FamilyAction, OnboardingStep } from '@zhiweijz/core';

export function AccountTypeStep() {
  const onboardingStore = useOnboardingStore();

  // 解构所有需要的属性和方法
  const {
    selectedAccountType,
    selectedFamilyAction,
    familyName,
    inviteCode,
    createdFamilyId,

    setAccountType,
    setFamilyAction,
    setFamilyName,
    setInviteCode,
    setCreatedFamilyId,
    setCreatedInviteCode,

    nextStep,
    setCurrentStep,
  } = onboardingStore;

  // 调试：检查函数是否存在
  console.log('🔍 [AccountType] Store functions check:', {
    setCurrentStep: typeof setCurrentStep,
  });

  const { currentAccountBook, fetchAccountBooks, setCurrentAccountBook, accountBooks } = useAccountBookStore();

  const [localFamilyName, setLocalFamilyName] = useState(familyName);
  const [localInviteCode, setLocalInviteCode] = useState(inviteCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);



  // 专门的方法来跳转到预算设置步骤
  const goToBudgetSetup = () => {
    console.log('🎯 [AccountType] Going to budget-setup step');
    setCurrentStep('budget-setup' as OnboardingStep);
    console.log('✅ [AccountType] Step set to budget-setup');

    // 滚动到页面顶部
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const onboardingContent = document.querySelector('.onboarding-modal-content');
        if (onboardingContent) {
          onboardingContent.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [AccountType] Scrolled to top');
        } else {
          // 备用方案：滚动整个页面
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [AccountType] Scrolled page to top');
        }
      }, 100);
    }
  };

  // 专门的方法来跳转到邀请码展示步骤
  const goToInviteCodeDisplay = () => {
    console.log('🎯 [AccountType] Going to invite-code-display step');
    setCurrentStep('invite-code-display' as OnboardingStep);
    console.log('✅ [AccountType] Step set to invite-code-display');

    // 滚动到页面顶部
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const onboardingContent = document.querySelector('.onboarding-modal-content');
        if (onboardingContent) {
          onboardingContent.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [AccountType] Scrolled to top');
        } else {
          // 备用方案：滚动整个页面
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [AccountType] Scrolled page to top');
        }
      }, 100);
    }
  };

  // 检查是否应该显示跳过提示
  useEffect(() => {
    // 检查是否有家庭账本可以跳过
    if (currentAccountBook && currentAccountBook.familyId && currentAccountBook.type === 'FAMILY') {
      setShowSkipPrompt(true);
    } else {
      setShowSkipPrompt(false);
    }
  }, [currentAccountBook]);

  // 处理账本类型选择
  const handleAccountTypeSelect = (type: AccountType) => {
    console.log('📝 [AccountType] Account type selected:', type);
    setAccountType(type);
    if (type === 'personal') {
      // 个人记账直接进入下一步
      console.log('👤 [AccountType] Personal account selected, going to budget setup');
      goToBudgetSetup();
    }
  };

  // 处理跳过账本类型设置
  const handleSkipAccountType = () => {
    console.log('⏭️ [AccountType] Skipping account type selection');
    // 设置为家庭类型并跳转到下一步
    setAccountType('family');
    goToBudgetSetup();
  };

  // 处理家庭操作选择
  const handleFamilyActionSelect = (action: FamilyAction) => {
    setFamilyAction(action);
    setError('');
  };

  // 处理创建家庭
  const handleCreateFamily = async () => {
    if (!localFamilyName.trim()) {
      setError('请输入家庭名称');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 调用创建家庭API
      const response = await FamilyApiService.createFamily({
        name: localFamilyName.trim()
      });

      setFamilyName(localFamilyName);
      setCreatedFamilyId(response.id);

      // 立即切换到新创建的家庭账本
      try {
        console.log('📚 [AccountType] Switching to family account book for family:', response.id);
        // 先刷新账本列表
        await fetchAccountBooks();

        // 等待一小段时间确保状态更新
        await new Promise(resolve => setTimeout(resolve, 500));

        // 重新获取最新的账本列表
        const { accountBooks: latestAccountBooks } = useAccountBookStore.getState();

        // 查找对应的家庭账本
        const familyAccountBook = latestAccountBooks.find(book =>
          book.familyId === response.id && book.type === 'FAMILY'
        );

        if (familyAccountBook) {
          await setCurrentAccountBook(familyAccountBook.id);
          console.log('✅ [AccountType] Successfully switched to family account book:', familyAccountBook.name);
        } else {
          console.warn('⚠️ [AccountType] Family account book not found for family:', response.id);
          console.log('📚 [AccountType] Available account books:', latestAccountBooks.map(book => ({
            id: book.id,
            name: book.name,
            type: book.type,
            familyId: book.familyId
          })));
        }
      } catch (error) {
        console.error('❌ [AccountType] Failed to switch account book:', error);
        // 不影响主流程，继续执行
      }

      // 创建邀请码
      try {
        const inviteResponse = await FamilyApiService.createInvitation(response.id);
        console.log('📋 [AccountType] Invitation response:', inviteResponse);
        // 后端返回的是 invitationCode，不是 inviteCode
        setCreatedInviteCode(inviteResponse.invitationCode);
        console.log('📋 [AccountType] Invitation code set:', inviteResponse.invitationCode);
      } catch (inviteError) {
        console.error('📋 [AccountType] Failed to create invitation:', inviteError);
        // 不影响主流程，继续执行
      }

      toast.success('家庭创建成功！');

      console.log('🏠 [AccountType] Family created successfully:', {
        familyId: response.id,
        familyName: localFamilyName
      });

      // 跳转到邀请码展示步骤
      console.log('📋 [AccountType] Going to invite code display step');
      goToInviteCodeDisplay();
    } catch (err: any) {
      const errorMessage = err.message || '创建家庭失败，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理加入家庭
  const handleJoinFamily = async () => {
    if (!localInviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 调用加入家庭API
      const response = await FamilyApiService.joinFamily({
        invitationCode: localInviteCode.trim()
      });

      setInviteCode(localInviteCode);
      setCreatedFamilyId(response.id);
      setFamilyName(response.name);

      // 立即切换到加入的家庭账本
      try {
        console.log('📚 [AccountType] Switching to joined family account book for family:', response.id);
        // 先刷新账本列表
        await fetchAccountBooks();

        // 等待一小段时间确保状态更新
        await new Promise(resolve => setTimeout(resolve, 500));

        // 重新获取最新的账本列表
        const { accountBooks: latestAccountBooks } = useAccountBookStore.getState();

        // 查找对应的家庭账本
        const familyAccountBook = latestAccountBooks.find(book =>
          book.familyId === response.id && book.type === 'FAMILY'
        );

        if (familyAccountBook) {
          await setCurrentAccountBook(familyAccountBook.id);
          console.log('✅ [AccountType] Successfully switched to joined family account book:', familyAccountBook.name);
        } else {
          console.warn('⚠️ [AccountType] Joined family account book not found for family:', response.id);
          console.log('📚 [AccountType] Available account books:', latestAccountBooks.map(book => ({
            id: book.id,
            name: book.name,
            type: book.type,
            familyId: book.familyId
          })));
        }
      } catch (error) {
        console.error('❌ [AccountType] Failed to switch account book:', error);
        // 不影响主流程，继续执行
      }

      toast.success(`成功加入家庭：${response.name}`);
      console.log('👥 [AccountType] Successfully joined family, going to budget setup');
      goToBudgetSetup();
    } catch (err: any) {
      const errorMessage = err.message || '邀请码无效或已过期，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="onboarding-step">
      {/* 欢迎区域 */}
      <div className="welcome-section">
        <div className="welcome-emoji">🎉</div>
        <div className="welcome-title">欢迎使用只为记账！</div>
        <div className="welcome-subtitle">让我们开始您的记账之旅</div>
      </div>

      <div className="onboarding-step-title">使用引导 - 选择记账方式</div>
      <div className="onboarding-step-description">
        让我们为您设置最适合的记账方式，开始您的财务管理之旅
      </div>



      {/* 账本类型选择 */}
      {!selectedAccountType && (
        <div className="onboarding-options">
          <div
            className="onboarding-option-card"
            onClick={() => handleAccountTypeSelect('personal')}
          >
            <div className="onboarding-option-icon">
              <i className="fas fa-user"></i>
            </div>
            <div className="onboarding-option-content">
              <div className="onboarding-option-title">个人记账</div>
              <div className="onboarding-option-description">
                管理个人收支，简单高效
              </div>
            </div>
          </div>

          <div
            className="onboarding-option-card"
            onClick={() => handleAccountTypeSelect('family')}
          >
            <div className="onboarding-option-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="onboarding-option-content">
              <div className="onboarding-option-title">家庭记账</div>
              <div className="onboarding-option-description">
                与家人共同管理家庭财务
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 第一步智能跳过提示 */}
      {!selectedAccountType && showSkipPrompt && (
        <div className="smart-skip-card info">
          <div className="smart-skip-icon">
            <i className="fas fa-info-circle"></i>
          </div>
          <div className="smart-skip-content">
            <div className="smart-skip-title">您已经完成了账本选择</div>
            <div className="smart-skip-description">
              检测到您已加入家庭账本并设为默认账本，可以直接跳过此步骤
            </div>
            <div className="smart-skip-current-info">
              <i className="fas fa-users"></i>
              <span>当前家庭账本：{currentAccountBook?.name}</span>
            </div>
            <div className="smart-skip-actions">
              <button
                className="smart-skip-button smart-skip-button-primary"
                onClick={handleSkipAccountType}
              >
                <i className="fas fa-arrow-right"></i>
                跳过此步骤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 家庭操作选择 */}
      {selectedAccountType === 'family' && !selectedFamilyAction && (
        <div className="onboarding-options">
          <div
            className="onboarding-option-card"
            onClick={() => handleFamilyActionSelect('create')}
          >
            <div className="onboarding-option-icon">
              <i className="fas fa-plus"></i>
            </div>
            <div className="onboarding-option-content">
              <div className="onboarding-option-title">创建家庭</div>
              <div className="onboarding-option-description">
                创建新的家庭账本，邀请家人加入
              </div>
            </div>
          </div>

          <div
            className="onboarding-option-card"
            onClick={() => handleFamilyActionSelect('join')}
          >
            <div className="onboarding-option-icon">
              <i className="fas fa-sign-in-alt"></i>
            </div>
            <div className="onboarding-option-content">
              <div className="onboarding-option-title">加入家庭</div>
              <div className="onboarding-option-description">
                使用邀请码加入现有家庭
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 家庭操作智能跳过提示 */}
      {selectedAccountType === 'family' && !selectedFamilyAction && showSkipPrompt && (
        <div className="smart-skip-card info">
          <div className="smart-skip-icon">
            <i className="fas fa-info-circle"></i>
          </div>
          <div className="smart-skip-content">
            <div className="smart-skip-title">您已经完成了账本选择</div>
            <div className="smart-skip-description">
              检测到您已加入家庭账本并设为默认账本，可以直接跳过此步骤
            </div>
            <div className="smart-skip-current-info">
              <i className="fas fa-users"></i>
              <span>当前家庭账本：{currentAccountBook?.name}</span>
            </div>
            <div className="smart-skip-actions">
              <button
                className="smart-skip-button smart-skip-button-primary"
                onClick={handleSkipAccountType}
              >
                <i className="fas fa-arrow-right"></i>
                跳过此步骤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建家庭表单 */}
      {selectedFamilyAction === 'create' && (
        <div className="onboarding-form">
          <div className="onboarding-form-group">
            <label className="onboarding-form-label">家庭名称</label>
            <input
              type="text"
              className="onboarding-form-input"
              placeholder="请输入家庭名称"
              value={localFamilyName}
              onChange={(e) => setLocalFamilyName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="onboarding-button-group">
            <button
              className="onboarding-button onboarding-button-secondary"
              onClick={() => setFamilyAction(null)}
              disabled={isLoading}
            >
              返回
            </button>
            <button
              className="onboarding-button onboarding-button-primary"
              onClick={handleCreateFamily}
              disabled={isLoading || !localFamilyName.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  创建中...
                </>
              ) : (
                '创建家庭'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 加入家庭表单 */}
      {selectedFamilyAction === 'join' && (
        <div className="onboarding-form">
          <div className="onboarding-form-group">
            <label className="onboarding-form-label">邀请码</label>
            <input
              type="text"
              className="onboarding-form-input"
              placeholder="请输入8位数字邀请码"
              value={localInviteCode}
              onChange={(e) => setLocalInviteCode(e.target.value)}
              disabled={isLoading}
              maxLength={8}
            />
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="onboarding-button-group">
            <button
              className="onboarding-button onboarding-button-secondary"
              onClick={() => setFamilyAction(null)}
              disabled={isLoading}
            >
              返回
            </button>
            <button
              className="onboarding-button onboarding-button-primary"
              onClick={handleJoinFamily}
              disabled={isLoading || !localInviteCode.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  加入中...
                </>
              ) : (
                '加入家庭'
              )}
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
