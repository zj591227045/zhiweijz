'use client';

import { useState, useCallback } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { FamilyApiService } from '@/api/family-api';
import { toast } from 'sonner';
import type { OnboardingStep } from '@zhiweijz/core';

// 计算年龄的辅助函数
const calculateAge = (birthDate: string): string => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return `${age}岁`;
};

export function CustodialMemberSetupStep() {
  const {
    createdFamilyId,
    custodialMembers,
    addCustodialMember,
    setCurrentStep,
    previousStep,
  } = useOnboardingStore();

  // 确保 custodialMembers 始终是数组
  const safeCustodialMembers = custodialMembers || [];

  const { setCurrentAccountBook } = useAccountBookStore();

  // 本地状态
  const [custodialMemberName, setCustodialMemberName] = useState('');
  const [custodialMemberGender, setCustodialMemberGender] = useState('男');
  const [custodialMemberBirthDate, setCustodialMemberBirthDate] = useState('');
  const [isCreatingCustodialMember, setIsCreatingCustodialMember] = useState(false);
  const [error, setError] = useState('');

  // 专门的方法来跳转到预算设置步骤
  const goToBudgetSetup = useCallback(() => {
    console.log('🎯 [CustodialMemberSetup] Going to budget-setup step');

    // 使用 setTimeout 避免在渲染期间更新状态
    setTimeout(() => {
      // 切换到新创建的家庭账本
      if (createdFamilyId) {
        try {
          console.log('📚 [CustodialMemberSetup] Switching to family account book:', createdFamilyId);
          setCurrentAccountBook(createdFamilyId);
          console.log('✅ [CustodialMemberSetup] Successfully switched to family account book');
        } catch (error) {
          console.error('❌ [CustodialMemberSetup] Failed to switch account book:', error);
          toast.error('切换账本失败，但将继续引导流程');
        }
      }

      setCurrentStep('budget-setup' as OnboardingStep);
      console.log('✅ [CustodialMemberSetup] Step set to budget-setup');
    }, 0);
  }, [createdFamilyId, setCurrentAccountBook, setCurrentStep]);

  // 处理添加托管用户
  const handleAddCustodialMember = async () => {
    if (!custodialMemberName.trim()) {
      setError('请输入成员姓名');
      return;
    }

    if (!createdFamilyId) {
      setError('家庭ID不存在，请重新创建家庭');
      return;
    }

    setIsCreatingCustodialMember(true);
    setError('');

    try {
      const response = await FamilyApiService.addCustodialMember(createdFamilyId, {
        name: custodialMemberName.trim(),
        gender: custodialMemberGender,
        birthDate: custodialMemberBirthDate || undefined,
      });

      // 添加到本地状态
      addCustodialMember({
        name: custodialMemberName.trim(),
        gender: custodialMemberGender === '男' ? 'male' : custodialMemberGender === '女' ? 'female' : 'other',
        birthDate: custodialMemberBirthDate || undefined,
      });

      // 重置表单
      setCustodialMemberName('');
      setCustodialMemberGender('男');
      setCustodialMemberBirthDate('');

      toast.success(`成功添加托管成员：${custodialMemberName}`);
    } catch (err: any) {
      const errorMessage = err.message || '添加托管成员失败，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingCustodialMember(false);
    }
  };

  // 处理跳过托管用户创建
  const handleSkipCustodialMember = () => {
    console.log('⏭️ [CustodialMemberSetup] Skipping custodial member creation');
    goToBudgetSetup();
  };

  // 处理完成托管用户创建
  const handleFinishCustodialMembers = () => {
    console.log('✅ [CustodialMemberSetup] Finished custodial member creation');
    goToBudgetSetup();
  };

  // 处理上一步
  const handlePrevious = () => {
    console.log('👶 [CustodialMemberSetup] Previous button clicked');
    previousStep();
  };

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-title">托管人员管理</div>
      <div className="onboarding-step-description">
        是否有孩子、老人等无法自主记账的家庭成员？您可以为他们创建托管账户，代为管理他们的收支记录。
      </div>

      {/* 选择区域 */}
      <div className="custodial-member-choice">
        <div className="choice-options">
          <div className="choice-option">
            <button
              className="choice-button choice-button-primary"
              onClick={() => {
                // 显示添加表单（当前页面已经是添加界面）
              }}
            >
              <div className="choice-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <div className="choice-content">
                <div className="choice-title">创建托管人员</div>
                <div className="choice-description">为无法自主记账的家庭成员创建账户</div>
              </div>
            </button>
          </div>

          <div className="choice-option">
            <button
              className="choice-button choice-button-secondary"
              onClick={handleSkipCustodialMember}
            >
              <div className="choice-icon">
                <i className="fas fa-arrow-right"></i>
              </div>
              <div className="choice-content">
                <div className="choice-title">跳过此步骤</div>
                <div className="choice-description">暂时不创建托管人员，直接进入预算设置</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 已添加的托管成员列表 */}
      {safeCustodialMembers.length > 0 && (
        <div className="custodial-members-list">
          <h4 className="list-title">已添加的托管成员</h4>
          <div className="members-grid">
            {safeCustodialMembers.map((member, index) => (
              <div key={index} className="member-item">
                <div className="member-avatar">
                  <i className={`fas ${member.gender === 'female' ? 'fa-female' : member.gender === 'male' ? 'fa-male' : 'fa-user'}`}></i>
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-details">
                    {member.gender && <span className="member-gender">{member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '其他'}</span>}
                    {member.birthDate && <span className="member-age">{calculateAge(member.birthDate)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 添加托管成员表单 */}
      <div className="custodial-member-form">
        <div className="form-title">添加托管成员</div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">成员姓名</label>
            <input
              type="text"
              className="form-input"
              placeholder="请输入成员姓名"
              value={custodialMemberName}
              onChange={(e) => setCustodialMemberName(e.target.value)}
              disabled={isCreatingCustodialMember}
            />
          </div>
          <div className="form-group">
            <label className="form-label">性别</label>
            <select
              className="form-select"
              value={custodialMemberGender}
              onChange={(e) => setCustodialMemberGender(e.target.value)}
              disabled={isCreatingCustodialMember}
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">出生日期</label>
          <input
            type="date"
            className="form-input"
            value={custodialMemberBirthDate}
            onChange={(e) => setCustodialMemberBirthDate(e.target.value)}
            disabled={isCreatingCustodialMember}
          />
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="form-actions">
          <button
            className="form-button form-button-primary"
            onClick={handleAddCustodialMember}
            disabled={isCreatingCustodialMember || !custodialMemberName.trim()}
          >
            {isCreatingCustodialMember ? (
              <>
                <span className="loading-spinner"></span>
                添加中...
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i>
                添加成员
              </>
            )}
          </button>
        </div>
      </div>

      {/* 按钮组 */}
      <div className="onboarding-button-group">
        <button
          className="onboarding-button onboarding-button-secondary"
          onClick={handlePrevious}
        >
          上一步
        </button>
        <button
          className="onboarding-button onboarding-button-primary"
          onClick={handleFinishCustodialMembers}
        >
          {safeCustodialMembers.length > 0 ? '完成设置' : '跳过此步骤'}
        </button>
      </div>
    </div>
  );
}
