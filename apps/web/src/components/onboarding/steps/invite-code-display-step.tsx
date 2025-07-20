'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';
import type { OnboardingStep } from '@zhiweijz/core';
import { FamilyApiService } from '@/api/family-api';

export function InviteCodeDisplayStep() {
  const {
    createdInviteCode,
    createdFamilyId,
    familyName,
    setCurrentStep,
    setCreatedInviteCode,
    previousStep,
  } = useOnboardingStore();

  const [isCopied, setIsCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // 如果邀请码不存在，尝试重新获取
  useEffect(() => {
    if (!createdInviteCode && createdFamilyId && !isRetrying) {
      console.log('📋 [InviteCodeDisplay] Invite code not found, retrying...');
      setIsRetrying(true);

      const retryGetInviteCode = async () => {
        try {
          const inviteResponse = await FamilyApiService.createInvitation(createdFamilyId);
          console.log('📋 [InviteCodeDisplay] Retry invitation response:', inviteResponse);
          setCreatedInviteCode(inviteResponse.invitationCode);
          console.log(
            '📋 [InviteCodeDisplay] Retry invitation code set:',
            inviteResponse.invitationCode,
          );
        } catch (error) {
          console.error('📋 [InviteCodeDisplay] Failed to retry create invitation:', error);
          toast.error('获取邀请码失败，请稍后重试');
        } finally {
          setIsRetrying(false);
        }
      };

      // 延时1秒后重试
      setTimeout(retryGetInviteCode, 1000);
    }
  }, [createdInviteCode, createdFamilyId, isRetrying, setCreatedInviteCode]);

  const { setCurrentAccountBook, fetchAccountBooks } = useAccountBookStore();

  // 专门的方法来跳转到托管人员设置步骤
  const goToCustodialMemberSetup = async () => {
    console.log('🎯 [InviteCodeDisplay] Going to custodial-member-setup step');

    // 确保已切换到家庭账本
    if (createdFamilyId) {
      try {
        console.log(
          '📚 [InviteCodeDisplay] Ensuring family account book is selected for family:',
          createdFamilyId,
        );
        // 先刷新账本列表
        await fetchAccountBooks();

        // 等待一小段时间确保状态更新
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 重新获取最新的账本列表
        const { accountBooks: latestAccountBooks } = useAccountBookStore.getState();

        // 查找对应的家庭账本
        const familyAccountBook = latestAccountBooks.find(
          (book) => book.familyId === createdFamilyId && book.type === 'FAMILY',
        );

        if (familyAccountBook) {
          await setCurrentAccountBook(familyAccountBook.id);
          console.log(
            '✅ [InviteCodeDisplay] Family account book ensured:',
            familyAccountBook.name,
          );
        } else {
          console.warn(
            '⚠️ [InviteCodeDisplay] Family account book not found for family:',
            createdFamilyId,
          );
          console.log(
            '📚 [InviteCodeDisplay] Available account books:',
            latestAccountBooks.map((book) => ({
              id: book.id,
              name: book.name,
              type: book.type,
              familyId: book.familyId,
            })),
          );
        }
      } catch (error) {
        console.error('❌ [InviteCodeDisplay] Failed to ensure account book:', error);
      }
    }

    setCurrentStep('custodial-member-setup' as OnboardingStep);
    console.log('✅ [InviteCodeDisplay] Step set to custodial-member-setup');

    // 滚动到页面顶部
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const onboardingContent = document.querySelector('.onboarding-modal-content');
        if (onboardingContent) {
          onboardingContent.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [InviteCodeDisplay] Scrolled to top');
        } else {
          // 备用方案：滚动整个页面
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [InviteCodeDisplay] Scrolled page to top');
        }
      }, 100);
    }
  };

  // 处理复制邀请码
  const handleCopyInviteCode = async () => {
    if (!createdInviteCode) {
      toast.error('邀请码不存在');
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInviteCode);
      setIsCopied(true);
      toast.success('邀请码已复制到剪贴板');

      // 3秒后重置复制状态
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  // 处理下一步
  const handleNext = () => {
    console.log('📋 [InviteCodeDisplay] Next button clicked, going to custodial member setup');
    goToCustodialMemberSetup();
  };

  // 处理上一步
  const handlePrevious = () => {
    console.log('📋 [InviteCodeDisplay] Previous button clicked');
    previousStep();
  };

  return (
    <div className="onboarding-step">
      {/* 成功提示区域 */}
      <div className="welcome-section">
        <div className="welcome-emoji">🎉</div>
        <div className="welcome-title">家庭创建成功！</div>
        <div className="welcome-subtitle">家庭"{familyName}"已成功创建</div>
      </div>

      <div className="onboarding-step-title">邀请码分享</div>
      <div className="onboarding-step-description">
        请复制邀请码分享给家庭成员。如果忘记邀请码，可前往 设置 → 家庭管理 → 人员管理 界面查看
      </div>

      {/* 邀请码展示区域 */}
      <div className="invite-code-display-section">
        <div className="invite-code-card">
          <div className="invite-code-header">
            <div className="invite-code-icon">
              <i className="fas fa-key"></i>
            </div>
            <div className="invite-code-title">家庭邀请码</div>
          </div>

          <div className="invite-code-content">
            <div className="invite-code-value">
              {createdInviteCode || (isRetrying ? '重新生成中...' : '生成中...')}
            </div>
            <button
              className={`invite-code-copy-button ${isCopied ? 'copied' : ''}`}
              onClick={handleCopyInviteCode}
              disabled={!createdInviteCode || isRetrying}
            >
              {isCopied ? (
                <>
                  <i className="fas fa-check"></i>
                  已复制
                </>
              ) : (
                <>
                  <i className="fas fa-copy"></i>
                  复制
                </>
              )}
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="invite-code-instructions">
          <div className="instruction-item">
            <div className="instruction-icon">
              <i className="fas fa-share-alt"></i>
            </div>
            <div className="instruction-text">
              将邀请码分享给家庭成员，他们可以使用此邀请码加入家庭
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="instruction-text">
              邀请码有效期8小时，可随时在家庭管理中查看和重新生成
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="instruction-text">家庭成员加入后可以共同管理家庭财务和预算</div>
          </div>
        </div>
      </div>

      {/* 按钮组 */}
      <div className="onboarding-button-group">
        <button className="onboarding-button onboarding-button-secondary" onClick={handlePrevious}>
          上一步
        </button>
        <button className="onboarding-button onboarding-button-primary" onClick={handleNext}>
          下一步
        </button>
      </div>
    </div>
  );
}
