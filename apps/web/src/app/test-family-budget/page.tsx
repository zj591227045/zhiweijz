'use client';

import React, { useState } from 'react';
import { FamilyBudgetForm } from '@/components/onboarding/family-budget-form';

export default function TestFamilyBudgetPage() {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 测试数据 - 使用实际的家庭ID和账本ID
  const testFamilyId = 'cm4ywqhqr0000uy8ixqhqhqhq'; // 替换为实际的家庭ID
  const testAccountBookId = 'cm4ywqhqr0001uy8ixqhqhqhq'; // 替换为实际的账本ID

  console.log('🧪 [TestPage] Component mounted with:', {
    testFamilyId,
    testAccountBookId,
  });

  const handleBudgetsUpdated = (newBudgets: Record<string, number>) => {
    console.log('📊 [TestPage] Budgets updated:', newBudgets);
    setBudgets(newBudgets);
  };

  const handleLoading = (loading: boolean) => {
    console.log('⏳ [TestPage] Loading state:', loading);
    setIsLoading(loading);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>家庭预算表单测试</h1>

      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h3>测试信息</h3>
        <p>
          <strong>家庭ID:</strong> {testFamilyId}
        </p>
        <p>
          <strong>账本ID:</strong> {testAccountBookId}
        </p>
        <p>
          <strong>加载状态:</strong> {isLoading ? '加载中...' : '已完成'}
        </p>
        <p>
          <strong>当前预算:</strong> {JSON.stringify(budgets, null, 2)}
        </p>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
        <FamilyBudgetForm
          familyId={testFamilyId}
          accountBookId={testAccountBookId}
          onBudgetsUpdated={handleBudgetsUpdated}
          onLoading={handleLoading}
        />
      </div>
    </div>
  );
}
