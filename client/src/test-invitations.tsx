'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function TestInvitations() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string>('');

  const fetchInvitations = async () => {
    if (!familyId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/families/${familyId}/invitations`);
      console.log('原始API响应:', response);
      setInvitations(response);
    } catch (err) {
      console.error('获取邀请失败:', err);
      setError(err instanceof Error ? err.message : '获取邀请失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 从URL获取家庭ID
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.indexOf('families') + 1];
    if (id) {
      setFamilyId(id);
    }
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchInvitations();
    }
  }, [familyId]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>邀请测试</h1>
      <p>家庭ID: {familyId || '未找到'}</p>
      
      <button 
        onClick={fetchInvitations}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        刷新邀请数据
      </button>
      
      {loading && <p>加载中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div>
        <h2>邀请数据 ({invitations.length})</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          overflow: 'auto',
          maxHeight: '500px'
        }}>
          {JSON.stringify(invitations, null, 2)}
        </pre>
      </div>
    </div>
  );
}
