'use client';

import styles from './custodial-members.module.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FamilyMember, CreateCustodialMemberData, UpdateCustodialMemberData } from '@/types';
import { familyService } from '@/lib/api/family-service';
import { formatDate } from '@/lib/utils/date-utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustodialMembersProps {
  familyId: string;
  isAdmin: boolean;
}

export function CustodialMembers({ familyId, isAdmin }: CustodialMembersProps) {
  const router = useRouter();
  const [custodialMembers, setCustodialMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [formData, setFormData] = useState<CreateCustodialMemberData>({
    name: '',
    gender: '男',
    birthDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取托管成员列表
  const fetchCustodialMembers = async () => {
    setIsLoading(true);
    try {
      const members = await familyService.getCustodialMembers(familyId);
      setCustodialMembers(members);
    } catch (error) {
      toast.error('获取托管成员失败');
      console.error('获取托管成员失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      fetchCustodialMembers();
    }
  }, [familyId]);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 处理性别选择变化
  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, gender: e.target.value }));
  };

  // 添加托管成员
  const handleAddMember = async () => {
    if (!formData.name) {
      toast.error('请输入成员名称');
      return;
    }

    setIsSubmitting(true);
    try {
      await familyService.addCustodialMember(familyId, formData);
      toast.success('添加托管成员成功');
      setIsAddDialogOpen(false);
      fetchCustodialMembers();
      // 重置表单
      setFormData({
        name: '',
        gender: '男',
        birthDate: '',
      });
    } catch (error) {
      toast.error('添加托管成员失败');
      console.error('添加托管成员失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 编辑托管成员
  const handleEditMember = (member: FamilyMember) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      gender: member.gender || '男',
      birthDate: member.birthDate ? formatDate(new Date(member.birthDate), 'YYYY-MM-DD') : '',
    });
    setIsEditDialogOpen(true);
  };

  // 更新托管成员
  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    if (!formData.name) {
      toast.error('请输入成员名称');
      return;
    }

    setIsSubmitting(true);
    try {
      await familyService.updateCustodialMember(familyId, selectedMember.id, formData as UpdateCustodialMemberData);
      toast.success('更新托管成员成功');
      setIsEditDialogOpen(false);
      fetchCustodialMembers();
    } catch (error) {
      toast.error('更新托管成员失败');
      console.error('更新托管成员失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除托管成员
  const handleDeleteClick = (member: FamilyMember) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    try {
      await familyService.deleteCustodialMember(familyId, selectedMember.id);
      toast.success('删除托管成员成功');
      setIsDeleteDialogOpen(false);
      fetchCustodialMembers();
    } catch (error) {
      toast.error('删除托管成员失败');
      console.error('删除托管成员失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>托管成员</div>
        {isAdmin && (
          <button
            className={styles.addButton}
            onClick={() => setIsAddDialogOpen(true)}
          >
            <i className="fas fa-plus text-xs"></i>
            <span>添加</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      ) : custodialMembers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <i className="fas fa-user-shield"></i>
          </div>
          <div className={styles.emptyText}>暂无托管成员</div>
          {isAdmin && (
            <button
              className={styles.emptyAddButton}
              onClick={() => setIsAddDialogOpen(true)}
            >
              添加托管成员
            </button>
          )}
        </div>
      ) : (
        <div className={styles.memberList}>
          {custodialMembers.map(member => (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <div className={styles.memberAvatar}>
                  {member.name.charAt(0)}
                </div>
                <div className={styles.memberDetails}>
                  <div className={styles.memberName}>{member.name}</div>
                  <div className={styles.memberMeta}>
                    {member.gender && <span>{member.gender}</span>}
                    {member.gender && member.birthDate && <span>•</span>}
                    {member.birthDate && (
                      <span>
                        {formatDate(new Date(member.birthDate), 'YYYY-MM-DD')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className={styles.memberActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEditMember(member)}
                  >
                    <i className="fas fa-edit text-sm"></i>
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteClick(member)}
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 添加托管成员对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={styles.dialogContent}>
          <DialogHeader className={styles.dialogHeader}>
            <DialogTitle className={styles.dialogTitle}>添加托管成员</DialogTitle>
          </DialogHeader>
          <div className={styles.dialogBody}>
            <div className={styles.formGroup}>
              <Label htmlFor="name" className={styles.formLabel}>成员名称</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入成员名称"
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <Label htmlFor="gender" className={styles.formLabel}>性别</Label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleGenderChange}
                className={styles.formSelect}
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <Label htmlFor="birthDate" className={styles.formLabel}>出生日期</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleInputChange}
                className={styles.formInput}
              />
            </div>
          </div>
          <div className={styles.dialogFooter}>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className={styles.cancelButton}
            >
              取消
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "添加中..." : "添加"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑托管成员对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={styles.dialogContent}>
          <DialogHeader className={styles.dialogHeader}>
            <DialogTitle className={styles.dialogTitle}>编辑托管成员</DialogTitle>
          </DialogHeader>
          <div className={styles.dialogBody}>
            <div className={styles.formGroup}>
              <Label htmlFor="edit-name" className={styles.formLabel}>成员名称</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入成员名称"
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <Label htmlFor="edit-gender" className={styles.formLabel}>性别</Label>
              <select
                id="edit-gender"
                name="gender"
                value={formData.gender}
                onChange={handleGenderChange}
                className={styles.formSelect}
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <Label htmlFor="edit-birthDate" className={styles.formLabel}>出生日期</Label>
              <Input
                id="edit-birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleInputChange}
                className={styles.formInput}
              />
            </div>
          </div>
          <div className={styles.dialogFooter}>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className={styles.cancelButton}
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateMember}
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "更新中..." : "更新"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除托管成员确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className={styles.dialogContent}>
          <DialogHeader className={styles.dialogHeader}>
            <DialogTitle className={styles.dialogTitle}>删除托管成员</DialogTitle>
          </DialogHeader>
          <div className={styles.deleteDialogBody}>
            <div className={styles.deleteMessage}>
              确定要删除托管成员 <strong>{selectedMember?.name}</strong> 吗？
            </div>
            <div className={styles.deleteWarning}>
              删除后将同时删除该成员的预算和交易记录，此操作不可恢复。
            </div>
          </div>
          <div className={styles.dialogFooter}>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className={styles.cancelButton}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isSubmitting}
              className={styles.deleteConfirmButton}
            >
              {isSubmitting ? "删除中..." : "删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}