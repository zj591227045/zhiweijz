# 预算编辑页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/budgets/[id]/edit`  
**文件位置**: `apps/web/src/app/budgets/[id]/edit/page.tsx`

### **当前功能**
- ✅ 编辑预算基本信息（名称、金额、周期）
- ✅ 预算类型选择（个人/通用）
- ✅ 分类关联设置
- ✅ 家庭成员分配（个人预算）
- ✅ 预算周期配置

### **当前组件结构**
```tsx
<PageContainer title="编辑预算" showBackButton>
  <BudgetForm />           // 预算表单
  <CategorySelector />     // 分类选择
  <MemberSelector />       // 成员选择
  <PeriodSelector />       // 周期选择
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从预算列表页面弹出
2. 📱 **iOS 风格表单** - 分组卡片布局
3. 💰 **金额输入优化** - 大字体金额显示
4. 📊 **预算类型选择** - 分段控制器
5. 🎯 **分类和成员选择** - 底部抽屉选择器

### **设计改进**
- 分组表单设计
- 金额输入体验优化
- 选择器交互改进
- 预算预览效果

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/budget-edit-modal.tsx
interface BudgetEditModalProps {
  budgetId: string | null;
  onClose: () => void;
  onSave: () => void;
}
```

### **2. 预算类型分段控制器**
```tsx
<div className="budget-type-selector">
  <button 
    className={`type-button ${budgetType === 'PERSONAL' ? 'active' : ''}`}
    onClick={() => setBudgetType('PERSONAL')}
  >
    个人预算
  </button>
  <button 
    className={`type-button ${budgetType === 'GENERAL' ? 'active' : ''}`}
    onClick={() => setBudgetType('GENERAL')}
  >
    通用预算
  </button>
</div>
```

### **3. 金额输入设计**
```tsx
<div className="amount-input-section">
  <label>预算金额</label>
  <div className="amount-display">
    <span className="currency">¥</span>
    <input 
      type="number" 
      className="amount-input"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
    />
  </div>
</div>
```

## 💻 **AI IDE 提示词**

```
请帮我创建预算编辑页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/budget-edit-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏页面头部和底部导航
   - 显示专用头部：返回按钮 + "编辑预算" + 空白区域

2. **预算类型选择器**：
   ```tsx
   <div style={{
     display: 'flex',
     backgroundColor: 'var(--background-secondary)',
     borderRadius: '12px',
     padding: '4px',
     marginBottom: '24px'
   }}>
     <button
       onClick={() => setBudgetType('PERSONAL')}
       style={{
         flex: 1,
         height: '40px',
         borderRadius: '8px',
         border: 'none',
         backgroundColor: budgetType === 'PERSONAL' ? 'var(--primary-color)' : 'transparent',
         color: budgetType === 'PERSONAL' ? 'white' : 'var(--text-color)',
         fontSize: '16px',
         fontWeight: '600',
         cursor: 'pointer',
         transition: 'all 0.3s ease'
       }}
     >
       个人预算
     </button>
     <button
       onClick={() => setBudgetType('GENERAL')}
       style={{
         flex: 1,
         height: '40px',
         borderRadius: '8px',
         border: 'none',
         backgroundColor: budgetType === 'GENERAL' ? 'var(--primary-color)' : 'transparent',
         color: budgetType === 'GENERAL' ? 'white' : 'var(--text-color)',
         fontSize: '16px',
         fontWeight: '600',
         cursor: 'pointer',
         transition: 'all 0.3s ease'
       }}
     >
       通用预算
     </button>
   </div>
   ```

3. **金额输入区域**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <label style={{
       display: 'block',
       fontSize: '14px',
       fontWeight: '500',
       color: 'var(--text-secondary)',
       marginBottom: '8px'
     }}>预算金额</label>
     <div style={{
       display: 'flex',
       alignItems: 'center',
       gap: '8px'
     }}>
       <span style={{
         fontSize: '24px',
         fontWeight: '300',
         color: 'var(--text-secondary)'
       }}>¥</span>
       <input
         type="number"
         placeholder="0"
         value={amount}
         onChange={(e) => setAmount(e.target.value)}
         style={{
           fontSize: '32px',
           fontWeight: '300',
           color: 'var(--text-color)',
           border: 'none',
           outline: 'none',
           backgroundColor: 'transparent',
           width: '100%'
         }}
       />
     </div>
   </div>
   ```

4. **预算名称输入**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <label style={{
       display: 'block',
       fontSize: '14px',
       fontWeight: '500',
       color: 'var(--text-secondary)',
       marginBottom: '8px'
     }}>预算名称</label>
     <input
       type="text"
       placeholder="输入预算名称"
       value={name}
       onChange={(e) => setName(e.target.value)}
       style={{
         width: '100%',
         border: 'none',
         outline: 'none',
         backgroundColor: 'transparent',
         fontSize: '16px',
         color: 'var(--text-color)'
       }}
     />
   </div>
   ```

5. **分类选择器**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <label style={{
       display: 'block',
       fontSize: '14px',
       fontWeight: '500',
       color: 'var(--text-secondary)',
       marginBottom: '8px'
     }}>关联分类</label>
     <div
       onClick={() => setShowCategorySelector(true)}
       style={{
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'space-between',
         cursor: 'pointer'
       }}
     >
       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
         {selectedCategory ? (
           <>
             <div style={{
               width: '32px',
               height: '32px',
               borderRadius: '16px',
               backgroundColor: 'var(--primary-color)',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               color: 'white'
             }}>
               <i className={getIconClass(selectedCategory.icon)}></i>
             </div>
             <span style={{ fontSize: '16px', color: 'var(--text-color)' }}>
               {selectedCategory.name}
             </span>
           </>
         ) : (
           <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
             选择分类
           </span>
         )}
       </div>
       <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)' }}></i>
     </div>
   </div>
   ```

6. **成员选择器（个人预算）**：
   ```tsx
   {budgetType === 'PERSONAL' && (
     <div style={{
       backgroundColor: 'var(--background-color)',
       border: '1px solid var(--border-color)',
       borderRadius: '12px',
       padding: '16px',
       marginBottom: '20px'
     }}>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>分配给成员</label>
       <div
         onClick={() => setShowMemberSelector(true)}
         style={{
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between',
           cursor: 'pointer'
         }}
       >
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           {selectedMember ? (
             <>
               <div style={{
                 width: '32px',
                 height: '32px',
                 borderRadius: '16px',
                 backgroundColor: 'var(--primary-color)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: 'white'
               }}>
                 {selectedMember.name.charAt(0)}
               </div>
               <span style={{ fontSize: '16px', color: 'var(--text-color)' }}>
                 {selectedMember.name}
               </span>
             </>
           ) : (
             <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
               选择成员
             </span>
           )}
         </div>
         <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)' }}></i>
       </div>
     </div>
   )}
   ```

7. **底部保存按钮**：
   ```tsx
   <div style={{
     position: 'fixed',
     bottom: '20px',
     left: '20px',
     right: '20px',
     zIndex: 10001
   }}>
     <button
       onClick={handleSave}
       disabled={isSubmitting || !name.trim() || !amount || !selectedCategory}
       style={{
         width: '100%',
         height: '48px',
         borderRadius: '12px',
         backgroundColor: 'var(--primary-color)',
         color: 'white',
         fontSize: '16px',
         fontWeight: '600',
         border: 'none',
         cursor: 'pointer',
         opacity: isSubmitting || !name.trim() || !amount || !selectedCategory ? 0.6 : 1
       }}
     >
       {isSubmitting ? '保存中...' : '保存'}
     </button>
   </div>
   ```

8. **数据获取和保存**：
   - 通过 budgetId 调用 fetchBudget API
   - 获取分类和家庭成员列表
   - 表单验证：名称、金额、分类必填
   - 保存时调用 updateBudget API

请参考 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式，确保：
- 完整的样式迁移
- 真实数据加载和保存
- iOS 设计规范
- 表单验证和错误处理
- 流畅的用户体验
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从预算列表点击编辑弹出模态框
- [ ] 正确加载预算数据到表单
- [ ] 预算类型切换正常
- [ ] 金额输入体验良好
- [ ] 分类选择器工作正常
- [ ] 成员选择器（个人预算）正常
- [ ] 表单验证正确执行
- [ ] 保存功能正常工作

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖
- [ ] 预算类型分段控制器美观
- [ ] 金额输入大字体显示
- [ ] 选择器交互体验良好
- [ ] 底部保存按钮固定显示
- [ ] iOS 风格设计一致

### **数据验证**
- [ ] API 数据正确加载
- [ ] 表单数据正确提交
- [ ] 加载和保存状态显示
- [ ] 错误处理友好提示

### **交互验证**
- [ ] 所有操作有视觉反馈
- [ ] 动画过渡自然流畅
- [ ] 触摸目标大小合适
- [ ] 键盘交互体验良好

## 🔗 **相关文件**

- `apps/web/src/app/budgets/[id]/edit/page.tsx` - 原始组件
- `apps/web/src/app/budgets/page.tsx` - 集成位置
- `apps/web/src/store/budget-store.ts` - 数据管理
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
