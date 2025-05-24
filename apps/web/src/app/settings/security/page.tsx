"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PasswordChangeForm } from "@/components/security/password-change-form";
import { Modal } from "@/components/ui/modal";

export default function SecurityPage() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // 安全选项列表
  const securityOptions = [
    {
      id: 'password',
      title: '修改密码',
      description: '定期修改密码以保护账户安全',
      icon: 'fas fa-key',
      action: () => setShowPasswordModal(true),
    },
    {
      id: 'email',
      title: '修改邮箱',
      description: '更改登录邮箱地址',
      icon: 'fas fa-envelope',
      action: () => {
        // TODO: 实现邮箱修改功能
        console.log('修改邮箱');
      },
    },
    {
      id: 'devices',
      title: '设备管理',
      description: '查看和管理登录设备',
      icon: 'fas fa-mobile-alt',
      action: () => {
        // TODO: 实现设备管理功能
        console.log('设备管理');
      },
    },
    {
      id: 'logs',
      title: '安全日志',
      description: '查看账户安全相关的操作记录',
      icon: 'fas fa-shield-alt',
      action: () => {
        // TODO: 实现安全日志功能
        console.log('安全日志');
      },
    },
  ];

  return (
    <PageContainer 
      title="账户安全" 
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="security-options">
        {securityOptions.map((option) => (
          <div
            key={option.id}
            className="security-option"
            onClick={option.action}
          >
            <div className="option-icon">
              <i className={option.icon}></i>
            </div>
            <div className="option-content">
              <div className="option-title">{option.title}</div>
              <div className="option-description">{option.description}</div>
            </div>
            <div className="option-arrow">
              <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        ))}
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
            // 密码修改成功后的处理
            setShowPasswordModal(false);
          }}
        />
      </Modal>
    </PageContainer>
  );
}
