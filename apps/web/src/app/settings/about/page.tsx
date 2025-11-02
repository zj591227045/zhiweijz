'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { AccountDeletionModal } from '@/components/modals/account-deletion-modal';
import { PrivacyPolicyModal } from '@/components/modals/privacy-policy-modal';
import { TermsOfServiceModal } from '@/components/modals/terms-of-service-modal';
import '@/styles/settings-pages.css';

// 声明全局日志管理器接口
declare global {
  interface Window {
    enableLogs: (level?: string) => void;
    disableLogs: () => void;
    getLogConfig: () => { enabled: boolean; level: string };
    clearLogConfig: () => void;
    testLogs: () => void;
  }
}

export default function AboutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [logConfig, setLogConfig] = useState<{ enabled: boolean; level: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 初始化日志配置
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.getLogConfig) {
      setLogConfig(window.getLogConfig());
    }
  }, []);

  // 更新日志配置
  const updateLogConfig = () => {
    if (typeof window !== 'undefined' && window.getLogConfig) {
      setLogConfig(window.getLogConfig());
    }
  };

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

  // 处理调试日志开关
  const handleToggleDebugLogs = () => {
    if (!mounted || typeof window === 'undefined') {
      alert('页面未完全加载，请稍后重试');
      return;
    }

    // 检查日志管理器是否可用
    if (!window.enableLogs || !window.disableLogs || !window.getLogConfig) {
      alert('日志管理器不可用，请刷新页面后重试');
      return;
    }

    try {
      if (logConfig?.enabled) {
        // 当前已启用，禁用日志
        window.disableLogs();
        alert('调试日志已禁用');
      } else {
        // 当前已禁用，启用日志
        window.enableLogs('debug');
        alert('调试日志已启用，现在可以在开发者工具中看到详细日志');
      }

      // 延迟更新配置，确保localStorage已更新
      setTimeout(() => {
        updateLogConfig();
      }, 100);

    } catch (error) {
      console.error('切换调试日志失败:', error);
      alert('切换调试日志失败: ' + error.message);
    }
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
            <p className="version">版本 0.9.0</p>
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
              <span className="info-value">0.9.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">发布日期</span>
              <span className="info-value">2024年12月</span>
            </div>
            {mounted && (
              <div className="info-item">
                <span className="info-label">调试日志</span>
                <div className="info-value">
                  <button
                    className={`debug-toggle-button ${logConfig?.enabled ? 'enabled' : 'disabled'}`}
                    onClick={handleToggleDebugLogs}
                    title={logConfig?.enabled ? '点击禁用调试日志' : '点击启用调试日志'}
                  >
                    <i className={`fas ${logConfig?.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                    <span className="toggle-text">
                      {logConfig?.enabled ? '已启用' : '已禁用'}
                    </span>
                    {logConfig?.enabled && (
                      <span className="log-level">({logConfig.level})</span>
                    )}
                  </button>
                </div>
              </div>
            )}
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
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

      {/* 服务条款弹窗 */}
      <TermsOfServiceModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </PageContainer>
  );
}
