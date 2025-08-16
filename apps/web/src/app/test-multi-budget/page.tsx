'use client';

import { useState } from 'react';
import { BudgetSelector } from '@/components/transactions/budget-selector';
import { useTransactionFormStore } from '@/store/transaction-form-store';

export default function TestMultiBudgetPage() {
  const { 
    amount, 
    setAmount, 
    isMultiBudget, 
    budgetAllocation,
    setIsMultiBudget,
    setBudgetAllocation 
  } = useTransactionFormStore();

  const [showBudgetSelector, setShowBudgetSelector] = useState(false);

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>多人预算分摊测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          记账金额:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '4px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            placeholder="请输入金额"
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowBudgetSelector(true)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          选择预算
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>当前状态:</h3>
        <p>金额: ¥{amount || '0'}</p>
        <p>多人预算: {isMultiBudget ? '是' : '否'}</p>
        {isMultiBudget && budgetAllocation.length > 0 && (
          <div>
            <p>分摊详情:</p>
            <ul>
              {budgetAllocation.map((item, index) => (
                <li key={index}>
                  {item.memberName}: ¥{item.amount.toFixed(2)} ({item.budgetName})
                </li>
              ))}
            </ul>
            <p>总计: ¥{budgetAllocation.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            setIsMultiBudget(false);
            setBudgetAllocation([]);
            setAmount('');
          }}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          重置
        </button>
      </div>

      {showBudgetSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <BudgetSelector />
            <button
              onClick={() => setShowBudgetSelector(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '8px 12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                zIndex: 9999
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
