'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { SelectionModal } from '@/components/ui/selection-modal';
import { toast } from 'sonner';
import '@/styles/selection-modal.css';
import '@/styles/settings-pages.css';

const LANGUAGE_OPTIONS = [
  {
    value: 'zh-CN',
    label: '简体中文',
    description: 'Simplified Chinese',
    icon: 'fas fa-globe-asia'
  },
  {
    value: 'zh-TW',
    label: '繁體中文',
    description: 'Traditional Chinese',
    icon: 'fas fa-globe-asia'
  },
  {
    value: 'en',
    label: 'English',
    description: 'English',
    icon: 'fas fa-globe-americas'
  }
];

export default function LanguagePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('zh-CN');

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 从本地存储加载语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') || 'zh-CN';
    setSelectedLanguage(savedLanguage);
  }, []);

  // 显示选择弹窗
  useEffect(() => {
    if (isAuthenticated) {
      setShowModal(true);
    }
  }, [isAuthenticated]);

  // 处理语言选择
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    localStorage.setItem('app-language', language);

    const selectedOption = LANGUAGE_OPTIONS.find(option => option.value === language);
    toast.success(`语言已切换为 ${selectedOption?.label}`);

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

  const currentLanguage = LANGUAGE_OPTIONS.find(option => option.value === selectedLanguage);

  return (
    <PageContainer title="语言设置" showBackButton={true} showBottomNav={false}>
      <div className="language-container">
        <div className="current-setting">
          <div className="setting-label">当前语言</div>
          <div className="setting-value">
            <i className={currentLanguage?.icon}></i>
            <span>{currentLanguage?.label}</span>
          </div>
        </div>

        <div className="setting-description">
          <p>选择您偏好的应用界面语言。语言设置将保存在本地，下次打开应用时会自动应用。</p>
          <p className="note">注意：当前版本仅支持界面语言选择，实际的语言切换功能将在后续版本中实现。</p>
        </div>

        <button
          className="change-language-button"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-language"></i>
          更改语言
        </button>
      </div>

      <SelectionModal
        isOpen={showModal}
        onClose={handleModalClose}
        title="选择语言"
        options={LANGUAGE_OPTIONS}
        selectedValue={selectedLanguage}
        onSelect={handleLanguageSelect}
      />
    </PageContainer>
  );
}
