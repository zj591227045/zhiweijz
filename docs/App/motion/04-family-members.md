# 家庭成员页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/families/[id]/members`  
**文件位置**: `apps/web/src/app/families/[id]/members/family-members-client.tsx`

### **当前功能**
- ✅ 显示家庭所有成员列表
- ✅ 成员角色管理（管理员/普通成员）
- ✅ 邀请新成员功能
- ✅ 移除成员操作
- ✅ 成员权限设置

### **当前组件结构**
```tsx
<PageContainer title="家庭成员" showBackButton>
  <MembersList />          // 成员列表
  <InviteSection />        // 邀请新成员
  <PendingInvites />       // 待处理邀请
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从家庭详情页面弹出
2. 📱 **iOS 风格列表** - 成员卡片列表
3. ➕ **添加成员** - 底部浮动添加按钮
4. 👤 **成员管理** - 滑动操作或长按菜单
5. 📧 **邀请状态** - 清晰的邀请状态展示

### **设计改进**
- 成员卡片列表设计
- 角色标签可视化
- 操作按钮优化
- 邀请流程简化

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/family-members-modal.tsx
interface FamilyMembersModalProps {
  familyId: string | null;
  onClose: () => void;
  onInvite: () => void;
}
```

### **2. 成员卡片设计**
```tsx
<div className="member-card">
  <div className="member-avatar">
    <img src={member.avatar} alt={member.name} />
  </div>
  <div className="member-info">
    <div className="member-name">{member.name}</div>
    <div className="member-email">{member.email}</div>
    <div className="member-role-badge">{member.role}</div>
  </div>
  <div className="member-actions">
    <button className="action-button">更多</button>
  </div>
</div>
```

### **3. 邀请功能**
```tsx
<div className="invite-section">
  <div className="invite-input">
    <input 
      type="email" 
      placeholder="输入邮箱地址邀请成员"
    />
    <button className="invite-button">邀请</button>
  </div>
</div>
```

## 💻 **AI IDE 提示词**

```
请帮我创建家庭成员页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/family-members-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏页面头部和底部导航
   - 显示专用头部：返回按钮 + "家庭成员" + 邀请按钮

2. **成员列表设计**：
   ```tsx
   <div style={{ padding: '0 20px' }}>
     {members.map(member => (
       <div key={member.id} style={{
         backgroundColor: 'var(--background-color)',
         border: '1px solid var(--border-color)',
         borderRadius: '12px',
         padding: '16px',
         marginBottom: '8px',
         display: 'flex',
         alignItems: 'center',
         gap: '12px'
       }}>
         <div style={{
           width: '48px',
           height: '48px',
           borderRadius: '24px',
           backgroundColor: 'var(--primary-color)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           color: 'white',
           fontSize: '18px'
         }}>
           {member.avatar ? (
             <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', borderRadius: '24px' }} />
           ) : (
             member.name.charAt(0)
           )}
         </div>
         <div style={{ flex: 1 }}>
           <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '2px' }}>{member.name}</div>
           <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{member.email}</div>
           <div style={{
             display: 'inline-block',
             padding: '2px 8px',
             borderRadius: '12px',
             fontSize: '12px',
             fontWeight: '500',
             backgroundColor: member.role === 'ADMIN' ? 'var(--primary-color)' : 'var(--background-secondary)',
             color: member.role === 'ADMIN' ? 'white' : 'var(--text-secondary)'
           }}>
             {member.role === 'ADMIN' ? '管理员' : '普通成员'}
           </div>
         </div>
         <button
           onClick={() => handleMemberAction(member)}
           style={{
             width: '32px',
             height: '32px',
             borderRadius: '16px',
             border: 'none',
             backgroundColor: 'var(--background-secondary)',
             color: 'var(--text-secondary)',
             cursor: 'pointer',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}
         >
           <i className="fas fa-ellipsis-h"></i>
         </button>
       </div>
     ))}
   </div>
   ```

3. **邀请新成员区域**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     margin: '20px'
   }}>
     <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>邀请新成员</h3>
     <div style={{ display: 'flex', gap: '8px' }}>
       <input
         type="email"
         placeholder="输入邮箱地址"
         value={inviteEmail}
         onChange={(e) => setInviteEmail(e.target.value)}
         style={{
           flex: 1,
           height: '40px',
           borderRadius: '8px',
           border: '1px solid var(--border-color)',
           padding: '0 12px',
           fontSize: '14px'
         }}
       />
       <button
         onClick={handleInvite}
         disabled={!inviteEmail.trim() || isInviting}
         style={{
           height: '40px',
           borderRadius: '8px',
           border: 'none',
           backgroundColor: 'var(--primary-color)',
           color: 'white',
           fontSize: '14px',
           fontWeight: '500',
           padding: '0 16px',
           cursor: 'pointer',
           opacity: !inviteEmail.trim() || isInviting ? 0.6 : 1
         }}
       >
         {isInviting ? '邀请中...' : '邀请'}
       </button>
     </div>
   </div>
   ```

4. **待处理邀请列表**：
   ```tsx
   {pendingInvites.length > 0 && (
     <div style={{ padding: '0 20px', marginTop: '20px' }}>
       <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>待处理邀请</h3>
       {pendingInvites.map(invite => (
         <div key={invite.id} style={{
           backgroundColor: 'var(--background-color)',
           border: '1px solid var(--border-color)',
           borderRadius: '12px',
           padding: '16px',
           marginBottom: '8px',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between'
         }}>
           <div>
             <div style={{ fontSize: '16px', fontWeight: '500' }}>{invite.email}</div>
             <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
               邀请于 {formatDate(invite.createdAt)}
             </div>
           </div>
           <div style={{
             padding: '4px 8px',
             borderRadius: '8px',
             fontSize: '12px',
             backgroundColor: '#fef3c7',
             color: '#d97706'
           }}>
             待接受
           </div>
         </div>
       ))}
     </div>
   )}
   ```

5. **成员操作菜单**：
   ```tsx
   // 成员操作底部抽屉
   {showMemberActions && (
     <div style={{
       position: 'fixed',
       top: 0, left: 0, right: 0, bottom: 0,
       backgroundColor: 'rgba(0, 0, 0, 0.5)',
       zIndex: 10000,
       display: 'flex',
       alignItems: 'flex-end'
     }}>
       <div style={{
         width: '100%',
         backgroundColor: 'var(--background-color)',
         borderTopLeftRadius: '20px',
         borderTopRightRadius: '20px',
         padding: '20px'
       }}>
         <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
           成员操作
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
           <button onClick={() => handleChangeRole(selectedMember)}>
             {selectedMember?.role === 'ADMIN' ? '设为普通成员' : '设为管理员'}
           </button>
           <button onClick={() => handleRemoveMember(selectedMember)} style={{ color: '#ef4444' }}>
             移除成员
           </button>
           <button onClick={() => setShowMemberActions(false)}>
             取消
           </button>
         </div>
       </div>
     </div>
   )}
   ```

6. **数据获取和操作**：
   - 通过 familyId 获取成员列表和待处理邀请
   - 邀请成员功能
   - 修改成员角色
   - 移除成员操作
   - 实时更新成员状态

请参考 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式，确保：
- 完整的样式迁移
- 真实数据加载和操作
- iOS 设计规范
- 流畅的用户体验
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从家庭详情页面弹出成员管理模态框
- [ ] 正确显示所有家庭成员
- [ ] 成员角色标签正确显示
- [ ] 邀请新成员功能正常
- [ ] 待处理邀请列表正确显示
- [ ] 成员操作菜单功能正常
- [ ] 角色修改功能正常
- [ ] 移除成员功能正常

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖
- [ ] 成员卡片设计美观
- [ ] 角色标签清晰易识别
- [ ] 邀请输入框体验良好
- [ ] 操作菜单符合 iOS 风格
- [ ] 待处理邀请状态清晰

### **数据验证**
- [ ] API 数据正确加载
- [ ] 邀请操作正确执行
- [ ] 角色修改正确提交
- [ ] 移除操作正确执行
- [ ] 实时状态更新正常

### **交互验证**
- [ ] 所有操作有视觉反馈
- [ ] 动画过渡自然流畅
- [ ] 触摸目标大小合适
- [ ] 滚动行为正常
- [ ] 键盘交互体验良好

## 🔗 **相关文件**

- `apps/web/src/app/families/[id]/members/family-members-client.tsx` - 原始组件
- `apps/web/src/components/family-detail-modal.tsx` - 集成位置
- `apps/web/src/store/family-store.ts` - 数据管理
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
