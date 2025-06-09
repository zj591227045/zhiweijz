'use client';

import { useState } from 'react';
import FamilyMembersModal from '@/components/family-members-modal';

export default function FamilyMembersModalTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [familyId, setFamilyId] = useState('test-family-id');

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>家庭成员管理模态框测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          家庭ID:
        </label>
        <input
          type="text"
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
          placeholder="输入家庭ID"
        />
      </div>

      <button
        onClick={handleOpenModal}
        style={{
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        打开家庭成员管理模态框
      </button>

      <div style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef'
      }}>
        <h3>测试说明:</h3>
        <ul>
          <li>点击上方按钮打开家庭成员管理模态框</li>
          <li>模态框应该以全屏方式显示</li>
          <li>包含模态框头部（返回按钮、标题、邀请按钮）</li>
          <li>包含成员列表、邀请区域、统计数据等内容</li>
          <li>支持角色管理和成员移除功能</li>
          <li>点击返回按钮或遮罩层可以关闭模态框</li>
        </ul>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#fff3cd',
        borderRadius: '6px',
        border: '1px solid #ffeaa7'
      }}>
        <h3>注意事项:</h3>
        <ul>
          <li>需要先登录才能正常使用</li>
          <li>需要有效的家庭ID</li>
          <li>某些功能需要管理员权限</li>
          <li>网络请求可能需要时间加载</li>
        </ul>
      </div>

      {/* 家庭成员管理模态框 */}
      <FamilyMembersModal
        familyId={familyId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
