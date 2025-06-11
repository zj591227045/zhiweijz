'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { FamilyApiService } from '@/api/family-api';
import { toast } from 'sonner';
import type { AccountType, FamilyAction } from '@zhiweijz/core';

export function AccountTypeStep() {
  const {
    selectedAccountType,
    selectedFamilyAction,
    familyName,
    inviteCode,
    createdFamilyId,
    showCustodialMemberStep,
    custodialMembers,
    setAccountType,
    setFamilyAction,
    setFamilyName,
    setInviteCode,
    setCreatedFamilyId,
    setCreatedInviteCode,
    setShowCustodialMemberStep,
    addCustodialMember,
    nextStep,
  } = useOnboardingStore();

  const { currentAccountBook } = useAccountBookStore();

  const [localFamilyName, setLocalFamilyName] = useState(familyName);
  const [localInviteCode, setLocalInviteCode] = useState(inviteCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);

  // 托管用户相关状态
  const [custodialMemberName, setCustodialMemberName] = useState('');
  const [custodialMemberGender, setCustodialMemberGender] = useState<'male' | 'female' | 'other'>('male');
  const [custodialMemberRole, setCustodialMemberRole] = useState('');
  const [isCreatingCustodialMember, setIsCreatingCustodialMember] = useState(false);

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
    setAccountType(type);
    if (type === 'personal') {
      // 个人记账直接进入下一步
      nextStep();
    }
  };

  // 处理跳过账本类型设置
  const handleSkipAccountType = () => {
    // 设置为家庭类型并跳转到下一步
    setAccountType('family');
    nextStep();
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

      // 创建邀请码
      try {
        const inviteResponse = await FamilyApiService.createInvitation(response.id);
        setCreatedInviteCode(inviteResponse.inviteCode);
      } catch (inviteError) {
        // 不影响主流程，继续执行
      }

      toast.success('家庭创建成功！');

      // 询问是否创建托管用户
      setShowCustodialMemberStep(true);
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

      toast.success(`成功加入家庭：${response.name}`);
      nextStep();
    } catch (err: any) {
      const errorMessage = err.message || '邀请码无效或已过期，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理跳过托管用户创建
  const handleSkipCustodialMember = () => {
    setShowCustodialMemberStep(false);
    nextStep();
  };

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
      await FamilyApiService.addCustodialMember(createdFamilyId, {
        name: custodialMemberName.trim(),
        gender: custodialMemberGender,
        role: custodialMemberRole.trim() || '家庭成员',
      });

      // 添加到本地状态
      addCustodialMember({
        name: custodialMemberName.trim(),
        gender: custodialMemberGender,
        role: custodialMemberRole.trim() || '家庭成员',
      });

      // 重置表单
      setCustodialMemberName('');
      setCustodialMemberGender('male');
      setCustodialMemberRole('');

      toast.success(`成功添加托管成员：${custodialMemberName}`);
    } catch (err: any) {
      const errorMessage = err.message || '添加托管成员失败，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingCustodialMember(false);
    }
  };

  // 处理完成托管用户创建
  const handleFinishCustodialMembers = () => {
    setShowCustodialMemberStep(false);
    nextStep();
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

      {/* 托管用户创建步骤 */}
      {showCustodialMemberStep && (
        <div className="custodial-member-section">
          <div className="custodial-member-header">
            <h3 className="custodial-member-title">
              <i className="fas fa-baby"></i>
              添加托管成员
            </h3>
            <p className="custodial-member-description">
              是否有孩子、老人等无法自主记账的家庭成员？您可以为他们创建托管账户，代为管理他们的收支记录。
            </p>
          </div>

          {/* 已添加的托管成员列表 */}
          {custodialMembers.length > 0 && (
            <div className="custodial-members-list">
              <h4 className="list-title">已添加的托管成员</h4>
              <div className="members-grid">
                {custodialMembers.map((member, index) => (
                  <div key={index} className="member-item">
                    <div className="member-avatar">
                      <i className={`fas ${member.gender === 'female' ? 'fa-female' : member.gender === 'male' ? 'fa-male' : 'fa-user'}`}></i>
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-role">{member.role || '家庭成员'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 添加托管成员表单 */}
          <div className="custodial-member-form">
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
                  onChange={(e) => setCustodialMemberGender(e.target.value as 'male' | 'female' | 'other')}
                  disabled={isCreatingCustodialMember}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">关系/角色（可选）</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：儿子、女儿、父亲、母亲等"
                value={custodialMemberRole}
                onChange={(e) => setCustodialMemberRole(e.target.value)}
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
                type="button"
                className="action-button add-button"
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

          {/* 底部按钮 */}
          <div className="custodial-member-actions">
            <button
              className="onboarding-button onboarding-button-secondary"
              onClick={handleSkipCustodialMember}
              disabled={isCreatingCustodialMember}
            >
              跳过此步骤
            </button>
            <button
              className="onboarding-button onboarding-button-primary"
              onClick={handleFinishCustodialMembers}
              disabled={isCreatingCustodialMember}
            >
              完成设置
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
