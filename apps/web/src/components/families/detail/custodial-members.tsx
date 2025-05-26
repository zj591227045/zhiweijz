'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

interface CustodialMember {
  id: string;
  familyId: string;
  userId?: string;
  name: string;
  gender?: string;
  birthDate?: string;
  role: string;
  isRegistered: boolean;
  isCustodial: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustodialMembersProps {
  familyId: string;
  isAdmin: boolean;
}

export function CustodialMembers({ familyId, isAdmin }: CustodialMembersProps) {
  const { token } = useAuthStore();
  const [custodialMembers, setCustodialMembers] = useState<CustodialMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CustodialMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: '男',
    birthDate: '',
  });

  // 获取托管成员列表
  const fetchCustodialMembers = async () => {
    if (!token) {
      console.error('未提供认证令牌');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${familyId}/custodial-members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // API返回格式为 { members: [], totalCount: number }
        setCustodialMembers(data.members || []);
      } else {
        console.error('获取托管成员失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取托管成员失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (familyId && token) {
      fetchCustodialMembers();
    }
  }, [familyId, token]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      gender: '男',
      birthDate: '',
    });
  };

  // 添加托管成员
  const handleAddMember = async () => {
    if (!formData.name) {
      toast.error('请输入成员名称');
      return;
    }

    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/families/${familyId}/custodial-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('添加托管成员成功');
        setIsAddDialogOpen(false);
        fetchCustodialMembers();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.message || '添加托管成员失败');
      }
    } catch (error) {
      toast.error('添加托管成员失败');
      console.error('添加托管成员失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 编辑托管成员
  const handleEditMember = (member: CustodialMember) => {
    console.log('编辑托管成员:', member);
    setSelectedMember(member);
    
    // 格式化生日日期为 YYYY-MM-DD 格式（HTML date input 需要的格式）
    let formattedBirthDate = '';
    if (member.birthDate) {
      try {
        const date = new Date(member.birthDate);
        // 确保日期有效
        if (!isNaN(date.getTime())) {
          formattedBirthDate = date.toISOString().split('T')[0];
          console.log('格式化生日日期:', member.birthDate, '->', formattedBirthDate);
        }
      } catch (error) {
        console.error('日期格式化失败:', member.birthDate, error);
      }
    }
    
    const newFormData = {
      name: member.name,
      gender: member.gender || '男',
      birthDate: formattedBirthDate,
    };
    console.log('设置表单数据:', newFormData);
    setFormData(newFormData);
    setIsEditDialogOpen(true);
  };

  // 更新托管成员
  const handleUpdateMember = async () => {
    if (!selectedMember || !formData.name) {
      toast.error('请输入成员名称');
      return;
    }

    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/families/${familyId}/custodial-members/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('更新托管成员成功');
        setIsEditDialogOpen(false);
        setSelectedMember(null);
        fetchCustodialMembers();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.message || '更新托管成员失败');
      }
    } catch (error) {
      toast.error('更新托管成员失败');
      console.error('更新托管成员失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除托管成员
  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/families/${familyId}/custodial-members/${selectedMember.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('删除托管成员成功');
        setIsDeleteDialogOpen(false);
        fetchCustodialMembers();
      } else {
        const error = await response.json();
        toast.error(error.message || '删除托管成员失败');
      }
    } catch (error) {
      toast.error('删除托管成员失败');
      console.error('删除托管成员失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    } catch (error) {
      console.error('日期格式化失败:', dateString, error);
      return '未知日期';
    }
  };

  // 计算年龄
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      
      // 计算年龄
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      // 如果年龄小于1岁，显示月份
      if (age < 1) {
        let months = today.getMonth() - birth.getMonth();
        if (today.getDate() < birth.getDate()) {
          months--;
        }
        if (months < 0) {
          months += 12;
        }
        return months === 0 ? '新生儿' : `${months}个月`;
      }
      
      return `${age}岁`;
    } catch (error) {
      console.error('年龄计算失败:', birthDate, error);
      return '';
    }
  };

  // 获取头像文本（取名字的第一个字）
  const getAvatarText = (name: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  // 头像显示模式：'icon' 显示儿童图标，'text' 显示姓名首字母
  const avatarMode = 'icon'; // 可以改为 'text' 来显示姓名首字母

  // 如果没有托管成员且不是管理员，不显示此区域
  if (custodialMembers.length === 0 && !isAdmin && !isLoading) {
    return null;
  }

  return (
    <div className="custodial-section">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-child"></i>
          <span>托管成员</span>
        </div>
        {isAdmin && (
          <button
            className="add-button"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <i className="fas fa-plus"></i>
            <span>添加</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span>加载中...</span>
        </div>
      ) : custodialMembers.length > 0 ? (
        <div className="custodial-list">
          {custodialMembers.map((member) => (
            <div key={member.id} className="custodial-item">
              <div className="custodial-avatar">
                {avatarMode === 'icon' ? (
                  <i className="fas fa-child"></i>
                ) : (
                  getAvatarText(member.name)
                )}
              </div>
              <div className="custodial-details">
                <div className="custodial-name">{member.name}</div>
                <div className="custodial-info">
                  {member.gender && <span className="gender">{member.gender}</span>}
                  {member.birthDate && <span className="age">{calculateAge(member.birthDate)}</span>}
                  <span className="created-date">添加于 {formatDate(member.createdAt)}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="custodial-actions">
                  <button
                    className="action-button edit"
                    onClick={() => handleEditMember(member)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="action-button delete"
                    onClick={() => {
                      setSelectedMember(member);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-child"></i>
          <p>暂无托管成员</p>
          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => setIsAddDialogOpen(true)}
            >
              添加托管成员
            </button>
          )}
        </div>
      )}

      {/* 添加对话框 */}
      {isAddDialogOpen && (
        <div className="dialog-overlay" onClick={() => {
          setIsAddDialogOpen(false);
          resetForm();
        }}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">添加托管成员</h3>
              <button 
                className="dialog-close" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label className="form-label">姓名 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="form-group">
                <label className="form-label">性别</label>
                <select
                  className="form-select"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">出生日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button 
                className="btn-primary" 
                onClick={handleAddMember}
                disabled={isSubmitting || !formData.name}
              >
                {isSubmitting ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      {isEditDialogOpen && (
        <div className="dialog-overlay" onClick={() => {
          setIsEditDialogOpen(false);
          setSelectedMember(null);
          resetForm();
        }}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">编辑托管成员</h3>
              <button 
                className="dialog-close" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedMember(null);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label className="form-label">姓名 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="form-group">
                <label className="form-label">性别</label>
                <select
                  className="form-select"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">出生日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedMember(null);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button 
                className="btn-primary" 
                onClick={handleUpdateMember}
                disabled={isSubmitting || !formData.name}
              >
                {isSubmitting ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {isDeleteDialogOpen && selectedMember && (
        <div className="dialog-overlay" onClick={() => setIsDeleteDialogOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">删除托管成员</h3>
              <button 
                className="dialog-close" 
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dialog-body">
              <p>确定要删除托管成员 "{selectedMember.name}" 吗？此操作无法撤销。</p>
            </div>
            <div className="dialog-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button 
                className="btn-danger" 
                onClick={handleDeleteMember}
                disabled={isSubmitting}
              >
                {isSubmitting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
