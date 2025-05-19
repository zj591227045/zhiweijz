'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { PageContainer } from '@/components/layout/page-container';

export default function TestInvitationsPage() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string>('');
  const [rawResponse, setRawResponse] = useState<any>(null);

  const fetchInvitations = async () => {
    if (!familyId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log(`获取邀请列表: /families/${familyId}/invitations`);
      const response = await apiClient.get(`/families/${familyId}/invitations`);
      console.log('原始API响应:', response);
      setRawResponse(response);
      
      // 确保response是数组
      const invitationsArray = Array.isArray(response) ? response : [];
      setInvitations(invitationsArray);
      
      console.log(`获取到 ${invitationsArray.length} 条邀请记录`);
      invitationsArray.forEach((invitation, index) => {
        console.log(`邀请记录 ${index + 1}:`, invitation);
      });
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
    <PageContainer title="邀请测试">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">邀请测试</h1>
        <p className="mb-4">家庭ID: {familyId || '未找到'}</p>
        
        <div className="mb-4">
          <input
            type="text"
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            placeholder="输入家庭ID"
            className="border p-2 mr-2 rounded"
          />
          <button 
            onClick={fetchInvitations}
            className="bg-blue-500 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? '加载中...' : '获取邀请'}
          </button>
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">原始响应</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">邀请数据 ({invitations.length})</h2>
          {invitations.length === 0 ? (
            <p>没有找到邀请记录</p>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation, index) => (
                <div key={invitation.id || index} className="border p-4 rounded">
                  <h3 className="font-medium">邀请 #{index + 1}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>ID:</div>
                    <div>{invitation.id}</div>
                    
                    <div>邀请码:</div>
                    <div>{invitation.invitationCode}</div>
                    
                    <div>创建时间:</div>
                    <div>{new Date(invitation.createdAt).toLocaleString()}</div>
                    
                    <div>过期时间:</div>
                    <div>{new Date(invitation.expiresAt).toLocaleString()}</div>
                    
                    <div>状态:</div>
                    <div>{invitation.isUsed ? '已使用' : '未使用'}</div>
                    
                    {invitation.isUsed && (
                      <>
                        <div>使用时间:</div>
                        <div>{invitation.usedAt ? new Date(invitation.usedAt).toLocaleString() : '未知'}</div>
                        
                        <div>使用者:</div>
                        <div>{invitation.usedByUserName || '未知'}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
