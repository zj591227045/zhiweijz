'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { AccountDeletionModal } from '@/components/modals/account-deletion-modal';
import { PrivacyPolicyModal } from '@/components/modals/privacy-policy-modal';
import { TermsOfServiceModal } from '@/components/modals/terms-of-service-modal';
import '@/styles/settings-pages.css';

export default function AboutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 处理官方网站点击
  const handleOfficialWebsite = () => {
    window.open('https://www.zhiweijz.cn', '_blank');
  };

  // 处理隐私政策点击
  const handlePrivacyPolicy = () => {
    setShowPrivacyModal(true);
  };

  // 处理服务条款点击
  const handleTermsOfService = () => {
    setShowTermsModal(true);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer title="关于应用" showBackButton={true} activeNavItem="profile">
      <div className="about-page-content">
        <div className="about-app-header">
          <div className="about-app-icon">
            <i className="fas fa-calculator"></i>
          </div>
          <div className="about-app-info">
            <h3>只为记账</h3>
            <p className="version">版本 0.2.3</p>
          </div>
        </div>

        <div className="about-content">
          <div className="about-description">
            <p>只为记账是一款简单、高效的个人记账应用，帮助您轻松管理个人和家庭财务。</p>
          </div>

          <div className="about-features">
            <h4>主要功能</h4>
            <div className="about-features-grid">
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="feature-text">智能记账，AI 辅助分类</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-book"></i>
                </div>
                <div className="feature-text">多账本管理</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-piggy-bank"></i>
                </div>
                <div className="feature-text">预算管理与提醒</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="feature-text">家庭账本共享</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="feature-text">详细的统计分析</div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-download"></i>
                </div>
                <div className="feature-text">数据导出功能</div>
              </div>
            </div>
          </div>

          <div className="about-info">
            <h4>应用信息</h4>
            <div className="info-item">
              <span className="info-label">开发者</span>
              <span className="info-value">只为记账团队</span>
            </div>
            <div className="info-item">
              <span className="info-label">版本</span>
              <span className="info-value">0.2.3</span>
            </div>
            <div className="info-item">
              <span className="info-label">发布日期</span>
              <span className="info-value">2024年12月</span>
            </div>
          </div>

          <div className="about-links">
            <button className="link-button" onClick={handleOfficialWebsite}>
              <i className="fas fa-globe"></i>
              官方网站
            </button>
            <button className="link-button" onClick={handlePrivacyPolicy}>
              <i className="fas fa-shield-alt"></i>
              隐私政策
            </button>
            <button className="link-button" onClick={handleTermsOfService}>
              <i className="fas fa-file-contract"></i>
              服务条款
            </button>
            <button
              className="link-button delete-account-button"
              onClick={() => setShowDeletionModal(true)}
            >
              <i className="fas fa-user-times"></i>
              注销账户
            </button>
          </div>

          <div className="about-footer">
            <p>© 2024 只为记账团队. 保留所有权利.</p>
          </div>
        </div>
      </div>

      {/* 注销账户弹窗 */}
      <AccountDeletionModal
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
      />

      {/* 隐私政策弹窗 */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* 服务条款弹窗 */}
      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </PageContainer>
  );
}
