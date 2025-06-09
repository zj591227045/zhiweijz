'use client';

import { useState } from 'react';
import FamilyDetailModal from '@/components/family-detail-modal';

export default function FamilyDetailModalTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('test-family-id');

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleEditFamily = (familyId: string) => {
    console.log('编辑家庭:', familyId);
    setIsModalOpen(false);
  };

  const handleManageMembers = (familyId: string) => {
    console.log('管理成员:', familyId);
    setIsModalOpen(false);
  };

  return (
    <div style={{
      padding: '20px',
      minHeight: '100vh',
      backgroundColor: 'var(--background-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: '20px'
      }}>
        家庭详情模态框测试
      </h1>
      
      <p style={{
        color: 'var(--text-secondary)',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: '1.5'
      }}>
        点击下面的按钮打开家庭详情模态框，检查头部组件是否正确显示。
      </p>

      <button
        onClick={handleOpenModal}
        style={{
          padding: '12px 24px',
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        打开家庭详情模态框
      </button>

      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        maxWidth: '500px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          测试说明
        </h3>
        <ul style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: '1.5',
          paddingLeft: '20px'
        }}>
          <li>模态框应该全屏显示</li>
          <li>头部应该包含返回按钮、标题和菜单按钮</li>
          <li>头部应该始终可见，不被其他元素遮挡</li>
          <li>头部高度应该为64px</li>
          <li>点击返回按钮应该关闭模态框</li>
        </ul>
      </div>

      {/* 家庭详情模态框 */}
      <FamilyDetailModal
        familyId={selectedFamilyId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEditFamily}
        onManageMembers={handleManageMembers}
      />
    </div>
  );
}
