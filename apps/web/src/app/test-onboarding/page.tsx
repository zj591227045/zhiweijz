'use client';

import { useOnboardingStore } from '@/store/onboarding-store';
import { PageContainer } from '@/components/layout/page-container';

export default function TestOnboardingPage() {
  const {
    isCompleted,
    isVisible,
    currentStep,
    selectedAccountType,
    selectedFamilyAction,
    budgetEnabled,
    startOnboarding,
    resetOnboarding,
    completeOnboarding,
  } = useOnboardingStore();

  return (
    <PageContainer title="引导测试" showBackButton={true}>
      <div style={{ padding: '20px' }}>
        <h2>引导状态测试</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3>当前状态</h3>
          <p>已完成: {isCompleted ? '是' : '否'}</p>
          <p>可见: {isVisible ? '是' : '否'}</p>
          <p>当前步骤: {currentStep}</p>
          <p>选择的账本类型: {selectedAccountType || '未选择'}</p>
          <p>家庭操作: {selectedFamilyAction || '未选择'}</p>
          <p>预算启用: {budgetEnabled ? '是' : '否'}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={startOnboarding}
            style={{
              padding: '12px 20px',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            开始引导
          </button>

          <button
            onClick={resetOnboarding}
            style={{
              padding: '12px 20px',
              backgroundColor: '#FF3B30',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            重置引导
          </button>

          <button
            onClick={completeOnboarding}
            style={{
              padding: '12px 20px',
              backgroundColor: '#34C759',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            完成引导
          </button>
        </div>

        <div style={{ marginTop: '40px' }}>
          <h3>使用说明</h3>
          <ul>
            <li>点击"开始引导"来触发引导流程</li>
            <li>点击"重置引导"来清除所有引导状态</li>
            <li>点击"完成引导"来标记引导为已完成</li>
            <li>引导状态会保存在本地存储中</li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
