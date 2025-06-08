# 家庭详情页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/families/[id]`  
**文件位置**: `apps/web/src/app/families/[id]/family-detail-client.tsx`

### **当前功能**
- ✅ 显示家庭基本信息（名称、描述、创建时间）
- ✅ 成员列表展示和管理
- ✅ 托管成员管理
- ✅ 家庭统计数据
- ✅ 家庭管理操作（编辑、删除、退出）

### **当前组件结构**
```tsx
<PageContainer title="家庭详情" showBackButton>
  <FamilyHeader />          // 家庭基本信息
  <MemberList />            // 成员列表
  <CustodialMembers />      // 托管成员
  <FamilyStatistics />      // 统计数据
  <ManagementSection />     // 管理操作
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从家庭列表页面弹出
2. 📱 **iOS 风格卡片** - 分组信息展示
3. 👥 **成员头像网格** - 美观的成员展示
4. 📊 **统计卡片** - 可视化数据展示
5. ⚙️ **管理操作** - 底部操作按钮组

### **设计改进**
- 家庭信息卡片化
- 成员头像网格布局
- 统计数据可视化
- 操作按钮分组

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/family-detail-modal.tsx
interface FamilyDetailModalProps {
  familyId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onManageMembers: (id: string) => void;
}
```

### **2. 家庭信息卡片**
```tsx
<div className="family-info-card">
  <div className="family-avatar">
    <i className="fas fa-home"></i>
  </div>
  <div className="family-details">
    <h2>{family.name}</h2>
    <p>{family.description}</p>
    <div className="family-meta">
      <span>创建于 {formatDate(family.createdAt)}</span>
      <span>{family.members.length} 名成员</span>
    </div>
  </div>
</div>
```

### **3. 成员网格布局**
```tsx
<div className="members-grid">
  {family.members.map(member => (
    <div key={member.id} className="member-card">
      <div className="member-avatar">
        {member.avatar ? (
          <img src={member.avatar} alt={member.name} />
        ) : (
          <div className="avatar-placeholder">
            {member.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="member-name">{member.name}</div>
      <div className="member-role">{member.role}</div>
    </div>
  ))}
</div>
```

## 💻 **AI IDE 提示词**

```
请帮我创建家庭详情页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/family-detail-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏页面头部和底部导航
   - 显示专用头部：返回按钮 + "家庭详情" + 更多操作菜单

2. **家庭信息卡片**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '20px',
     marginBottom: '20px'
   }}>
     <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
       <div style={{
         width: '60px',
         height: '60px',
         borderRadius: '30px',
         backgroundColor: 'var(--primary-color)',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         color: 'white',
         fontSize: '24px'
       }}>
         <i className="fas fa-home"></i>
       </div>
       <div style={{ flex: 1 }}>
         <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>{family.name}</h2>
         <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{family.description}</p>
         <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
           <span>创建于 {formatDate(family.createdAt)}</span>
           <span>{family.members.length} 名成员</span>
         </div>
       </div>
     </div>
   </div>
   ```

3. **成员网格布局**：
   ```tsx
   <div style={{ marginBottom: '20px' }}>
     <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>家庭成员</h3>
     <div style={{
       display: 'grid',
       gridTemplateColumns: 'repeat(3, 1fr)',
       gap: '12px'
     }}>
       {family.members.map(member => (
         <div key={member.id} style={{
           backgroundColor: 'var(--background-color)',
           border: '1px solid var(--border-color)',
           borderRadius: '12px',
           padding: '16px',
           textAlign: 'center'
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
             fontSize: '18px',
             margin: '0 auto 8px'
           }}>
             {member.avatar ? (
               <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', borderRadius: '24px' }} />
             ) : (
               member.name.charAt(0)
             )}
           </div>
           <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>{member.name}</div>
           <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.role}</div>
         </div>
       ))}
     </div>
   </div>
   ```

4. **统计数据卡片**：
   ```tsx
   <div style={{ marginBottom: '20px' }}>
     <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>家庭统计</h3>
     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
       <div style={{
         backgroundColor: 'var(--background-color)',
         border: '1px solid var(--border-color)',
         borderRadius: '12px',
         padding: '16px',
         textAlign: 'center'
       }}>
         <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary-color)' }}>¥{formatCurrency(statistics.totalExpense)}</div>
         <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>本月支出</div>
       </div>
       <div style={{
         backgroundColor: 'var(--background-color)',
         border: '1px solid var(--border-color)',
         borderRadius: '12px',
         padding: '16px',
         textAlign: 'center'
       }}>
         <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>¥{formatCurrency(statistics.totalIncome)}</div>
         <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>本月收入</div>
       </div>
     </div>
   </div>
   ```

5. **管理操作按钮组**：
   ```tsx
   <div style={{ marginTop: '32px' }}>
     <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>家庭管理</h3>
     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
       <button
         onClick={() => onManageMembers(familyId)}
         style={{
           width: '100%',
           height: '48px',
           borderRadius: '12px',
           border: '1px solid var(--border-color)',
           backgroundColor: 'var(--background-color)',
           color: 'var(--text-color)',
           fontSize: '16px',
           fontWeight: '500',
           cursor: 'pointer',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           gap: '8px'
         }}
       >
         <i className="fas fa-users"></i>
         管理成员
       </button>
       <button
         onClick={() => onEdit(familyId)}
         style={{
           width: '100%',
           height: '48px',
           borderRadius: '12px',
           border: 'none',
           backgroundColor: 'var(--primary-color)',
           color: 'white',
           fontSize: '16px',
           fontWeight: '600',
           cursor: 'pointer',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           gap: '8px'
         }}
       >
         <i className="fas fa-edit"></i>
         编辑家庭信息
       </button>
     </div>
   </div>
   ```

6. **数据获取**：
   - 通过 familyId 调用 fetchFamily API
   - 获取家庭统计数据
   - 支持加载状态和错误处理

请参考 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式，确保：
- 完整的样式迁移
- 真实数据加载
- iOS 设计规范
- 流畅的用户体验
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从家庭列表点击弹出详情模态框
- [ ] 正确显示家庭基本信息
- [ ] 成员列表正确展示
- [ ] 统计数据正确计算和显示
- [ ] 管理操作按钮功能正常
- [ ] 编辑和成员管理跳转正确

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖
- [ ] 家庭信息卡片美观
- [ ] 成员网格布局整齐
- [ ] 统计卡片数据清晰
- [ ] 操作按钮分组合理
- [ ] iOS 风格设计一致

### **数据验证**
- [ ] API 数据正确加载
- [ ] 统计数据准确计算
- [ ] 加载状态正确显示
- [ ] 错误处理友好提示

### **交互验证**
- [ ] 所有操作有视觉反馈
- [ ] 动画过渡自然流畅
- [ ] 触摸目标大小合适
- [ ] 滚动行为正常

## 🔗 **相关文件**

- `apps/web/src/app/families/[id]/family-detail-client.tsx` - 原始组件
- `apps/web/src/app/families/page.tsx` - 集成位置
- `apps/web/src/store/family-store.ts` - 数据管理
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
