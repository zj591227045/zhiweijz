'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { SelectionModal } from '@/components/ui/selection-modal';
import { toast } from 'sonner';
import '@/styles/selection-modal.css';
import '@/styles/settings-pages.css';

const CURRENCY_OPTIONS = [
  {
    value: 'CNY',
    label: '人民币',
    description: '¥ (CNY)',
    icon: 'fas fa-yen-sign'
  },
  {
    value: 'USD',
    label: '美元',
    description: '$ (USD)',
    icon: 'fas fa-dollar-sign'
  },
  {
    value: 'EUR',
    label: '欧元',
    description: '€ (EUR)',
    icon: 'fas fa-euro-sign'
  },
  {
    value: 'GBP',
    label: '英镑',
    description: '£ (GBP)',
    icon: 'fas fa-pound-sign'
  },
  {
    value: 'JPY',
    label: '日元',
    description: '¥ (JPY)',
    icon: 'fas fa-yen-sign'
  },
  {
    value: 'HKD',
    label: '港币',
    description: 'HK$ (HKD)',
    icon: 'fas fa-dollar-sign'
  },
  {
    value: 'TWD',
    label: '新台币',
    description: 'NT$ (TWD)',
    icon: 'fas fa-dollar-sign'
  }
];

export default function CurrencyPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 从本地存储加载货币设置
  useEffect(() => {
    const savedCurrency = localStorage.getItem('app-currency') || 'CNY';
    setSelectedCurrency(savedCurrency);
  }, []);

  // 显示选择弹窗
  useEffect(() => {
    if (isAuthenticated) {
      setShowModal(true);
    }
  }, [isAuthenticated]);

  // 处理货币选择
  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    localStorage.setItem('app-currency', currency);

    const selectedOption = CURRENCY_OPTIONS.find(option => option.value === currency);
    toast.success(`货币已切换为 ${selectedOption?.label}`);

    // 关闭弹窗并返回设置页面
    setShowModal(false);
    router.back();
  };

  // 处理弹窗关闭
  const handleModalClose = () => {
    setShowModal(false);
    router.back();
  };

  if (!isAuthenticated) {
    return null;
  }

  const currentCurrency = CURRENCY_OPTIONS.find(option => option.value === selectedCurrency);

  return (
    <PageContainer title="货币设置" showBackButton={true} showBottomNav={false}>
      <div className="currency-container">
        <div className="current-setting">
          <div className="setting-label">当前货币</div>
          <div className="setting-value">
            <i className={currentCurrency?.icon}></i>
            <span>{currentCurrency?.label} ({currentCurrency?.description})</span>
          </div>
        </div>

        <div className="setting-description">
          <p>选择您偏好的货币单位。货币设置将影响金额的显示格式，并保存在本地。</p>
          <p className="note">注意：更改货币设置不会影响已有的交易记录，仅影响界面显示。</p>
        </div>

        <button
          className="change-currency-button"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-coins"></i>
          更改货币
        </button>
      </div>

      <SelectionModal
        isOpen={showModal}
        onClose={handleModalClose}
        title="选择货币"
        options={CURRENCY_OPTIONS}
        selectedValue={selectedCurrency}
        onSelect={handleCurrencySelect}
      />
    </PageContainer>
  );
}
