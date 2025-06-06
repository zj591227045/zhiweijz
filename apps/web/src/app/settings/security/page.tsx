'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PasswordChangeForm } from '@/components/security/password-change-form';
import { Modal } from '@/components/ui/modal';
import { userService, UserProfile } from '@/lib/api/user-service';
import { toast } from 'sonner';
import '@/styles/security.css';

export default function SecurityPage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取用户真实数据
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await userService.getUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error('获取用户资料失败:', error);
        toast.error('获取用户资料失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // 处理开发中功能的点击
  const handleDevelopingFeature = (featureName: string) => {
    toast.info(`${featureName}功能开发中...`);
  };

  // 模拟设备数据
  const devices = [
    {
      id: 1,
      name: 'iPhone 14 Pro',
      type: 'mobile',
      location: '北京市',
      lastActive: '刚刚',
      isCurrent: true,
    },
    {
      id: 2,
      name: 'MacBook Pro',
      type: 'desktop',
      location: '北京市',
      lastActive: '2小时前',
      isCurrent: false,
    },
  ];

  // 模拟安全日志数据
  const securityLogs = [
    {
      id: 1,
      action: '登录成功',
      device: 'iPhone 14 Pro',
      location: '北京市',
      time: '2024年1月15日 14:30',
      icon: 'sign-in-alt',
    },
    {
      id: 2,
      action: '修改密码',
      device: 'MacBook Pro',
      location: '北京市',
      time: '2024年1月10日 09:15',
      icon: 'key',
    },
  ];

  if (isLoading) {
    return (
      <PageContainer title="账户安全" showBackButton={true} activeNavItem="profile">
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="账户安全" showBackButton={true} activeNavItem="profile">
      <div className="security-page">
        {/* 账户凭证 */}
        <div className="security-section">
          <div className="section-title">账户凭证</div>
          <div className="security-list">
            <div className="security-item" onClick={() => setShowPasswordModal(true)}>
              <div className="security-icon">
                <i className="fas fa-lock"></i>
              </div>
              <div className="security-details">
                <div className="security-title">修改密码</div>
                <div className="security-description">定期修改密码以保护账户安全</div>
              </div>
              <div className="security-status">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>

            <div className="security-item" onClick={() => handleDevelopingFeature('修改邮箱')}>
              <div className="security-icon">
                <i className="fas fa-envelope"></i>
              </div>
              <div className="security-details">
                <div className="security-title">修改邮箱</div>
                <div className="security-description">
                  当前邮箱：{userProfile?.email || '未设置'}
                </div>
              </div>
              <div className="security-status">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>

            <div className="security-item" onClick={() => handleDevelopingFeature('安全问题')}>
              <div className="security-icon">
                <i className="fas fa-question-circle"></i>
              </div>
              <div className="security-details">
                <div className="security-title">安全问题</div>
                <div className="security-description">用于账户恢复</div>
              </div>
              <div className="security-status">
                <span className="status-badge status-warning">未设置</span>
              </div>
            </div>
          </div>
        </div>

        {/* 登录安全 */}
        <div className="security-section">
          <div className="section-title">登录安全</div>
          <div className="security-list">
            <div className="security-item" onClick={() => handleDevelopingFeature('登录设备管理')}>
              <div className="security-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <div className="security-details">
                <div className="security-title">登录设备管理</div>
                <div className="security-description">查看和管理已登录的设备</div>
              </div>
              <div className="security-status">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>

            <div className="security-item" onClick={() => handleDevelopingFeature('登录通知')}>
              <div className="security-icon">
                <i className="fas fa-bell"></i>
              </div>
              <div className="security-details">
                <div className="security-title">登录通知</div>
                <div className="security-description">新设备登录时通知我</div>
              </div>
              <div className="security-status">
                <span className="status-badge status-warning">已关闭</span>
              </div>
            </div>

            <div className="security-item" onClick={() => handleDevelopingFeature('安全日志')}>
              <div className="security-icon">
                <i className="fas fa-history"></i>
              </div>
              <div className="security-details">
                <div className="security-title">安全日志</div>
                <div className="security-description">查看账户安全相关操作记录</div>
              </div>
              <div className="security-status">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>

        {/* 账户保护 */}
        <div className="security-section">
          <div className="section-title">账户保护</div>
          <div className="security-list">
            <div className="security-item" onClick={() => handleDevelopingFeature('账户恢复邮箱')}>
              <div className="security-icon">
                <i className="fas fa-envelope-open-text"></i>
              </div>
              <div className="security-details">
                <div className="security-title">账户恢复邮箱</div>
                <div className="security-description">用于找回账户</div>
              </div>
              <div className="security-status">
                <span className="status-badge status-warning">未设置</span>
              </div>
            </div>

            <div className="security-item" onClick={() => handleDevelopingFeature('账户冻结保护')}>
              <div className="security-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="security-details">
                <div className="security-title">账户冻结保护</div>
                <div className="security-description">异常登录时自动冻结账户</div>
              </div>
              <div className="security-status">
                <span className="status-badge status-active">已开启</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 修改密码模态框 */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="修改密码"
      >
        <PasswordChangeForm
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            toast.success('密码修改成功');
          }}
        />
      </Modal>

      {/* 修改邮箱模态框 - 开发中提示 */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="修改邮箱">
        <div className="modal-body">
          <div className="text-center py-8">
            <i className="fas fa-tools text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600 mb-2">修改邮箱功能开发中...</p>
            <p className="text-sm text-gray-500">敬请期待</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel-button" onClick={() => setShowEmailModal(false)}>
            关闭
          </button>
        </div>
      </Modal>

      {/* 设备管理模态框 - 开发中提示 */}
      <Modal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        title="登录设备管理"
      >
        <div className="modal-body">
          <div className="text-center py-8">
            <i className="fas fa-tools text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600 mb-2">设备管理功能开发中...</p>
            <p className="text-sm text-gray-500">敬请期待</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel-button" onClick={() => setShowDeviceModal(false)}>
            关闭
          </button>
        </div>
      </Modal>

      {/* 安全日志模态框 - 开发中提示 */}
      <Modal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} title="安全日志">
        <div className="modal-body">
          <div className="text-center py-8">
            <i className="fas fa-tools text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600 mb-2">安全日志功能开发中...</p>
            <p className="text-sm text-gray-500">敬请期待</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel-button" onClick={() => setShowLogsModal(false)}>
            关闭
          </button>
        </div>
      </Modal>
    </PageContainer>
  );
}
