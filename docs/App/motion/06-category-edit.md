# 分类编辑页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/settings/categories/[id]/edit`  
**文件位置**: `apps/web/src/app/settings/categories/[id]/edit/category-edit-client.tsx`

### **当前功能**
- ✅ 编辑分类基本信息（名称、描述）
- ✅ 分类类型选择（支出/收入）
- ✅ 图标选择器
- ✅ 颜色选择器
- ✅ 分类预览效果

### **当前组件结构**
```tsx
<PageContainer title="编辑分类" showBackButton>
  <CategoryForm />         // 分类表单
  <IconSelector />         // 图标选择
  <ColorPicker />          // 颜色选择
  <CategoryPreview />      // 预览效果
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从分类设置页面弹出
2. 📱 **iOS 风格表单** - 分组卡片布局
3. 🎨 **图标选择网格** - 美观的图标网格
4. 🌈 **颜色选择器** - iOS 风格颜色网格
5. 👁️ **实时预览** - 动态显示分类效果

### **设计改进**
- 分组表单设计
- 图标网格优化
- 颜色选择体验
- 实时预览效果

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/category-edit-modal.tsx
interface CategoryEditModalProps {
  categoryId: string | null;
  onClose: () => void;
  onSave: () => void;
}
```

### **2. 分类类型选择器**
```tsx
<div className="category-type-selector">
  <button 
    className={`type-button expense ${type === 'EXPENSE' ? 'active' : ''}`}
    onClick={() => setType('EXPENSE')}
  >
    支出分类
  </button>
  <button 
    className={`type-button income ${type === 'INCOME' ? 'active' : ''}`}
    onClick={() => setType('INCOME')}
  >
    收入分类
  </button>
</div>
```

### **3. 图标选择网格**
```tsx
<div className="icon-grid">
  {icons.map(icon => (
    <div 
      key={icon}
      className={`icon-option ${selectedIcon === icon ? 'selected' : ''}`}
      onClick={() => setSelectedIcon(icon)}
    >
      <i className={getIconClass(icon)}></i>
    </div>
  ))}
</div>
```

## 💻 **AI IDE 提示词**

```
请帮我创建分类编辑页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/category-edit-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏页面头部和底部导航
   - 显示专用头部：返回按钮 + "编辑分类" + 空白区域

2. **分类类型选择器**：
   ```tsx
   <div style={{
     display: 'flex',
     backgroundColor: 'var(--background-secondary)',
     borderRadius: '12px',
     padding: '4px',
     marginBottom: '24px'
   }}>
     <button
       onClick={() => setType('EXPENSE')}
       style={{
         flex: 1,
         height: '40px',
         borderRadius: '8px',
         border: 'none',
         backgroundColor: type === 'EXPENSE' ? '#ef4444' : 'transparent',
         color: type === 'EXPENSE' ? 'white' : 'var(--text-color)',
         fontSize: '16px',
         fontWeight: '600',
         cursor: 'pointer',
         transition: 'all 0.3s ease'
       }}
     >
       支出分类
     </button>
     <button
       onClick={() => setType('INCOME')}
       style={{
         flex: 1,
         height: '40px',
         borderRadius: '8px',
         border: 'none',
         backgroundColor: type === 'INCOME' ? '#10b981' : 'transparent',
         color: type === 'INCOME' ? 'white' : 'var(--text-color)',
         fontSize: '16px',
         fontWeight: '600',
         cursor: 'pointer',
         transition: 'all 0.3s ease'
       }}
     >
       收入分类
     </button>
   </div>
   ```

3. **基本信息表单**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <div style={{ marginBottom: '16px' }}>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>分类名称</label>
       <input
         type="text"
         placeholder="输入分类名称"
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
     <div>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>分类描述</label>
       <textarea
         placeholder="输入分类描述（可选）"
         value={description}
         onChange={(e) => setDescription(e.target.value)}
         rows={3}
         style={{
           width: '100%',
           border: 'none',
           outline: 'none',
           backgroundColor: 'transparent',
           fontSize: '16px',
           color: 'var(--text-color)',
           resize: 'none'
         }}
       />
     </div>
   </div>
   ```

4. **图标选择器**：
   ```tsx
   const icons = ['utensils', 'shopping-cart', 'car', 'home', 'heart', 'gamepad', 'book', 'music', 'plane', 'gift', 'coffee', 'phone'];
   
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
       marginBottom: '12px'
     }}>选择图标</label>
     <div style={{
       display: 'grid',
       gridTemplateColumns: 'repeat(6, 1fr)',
       gap: '8px'
     }}>
       {icons.map(icon => (
         <div
           key={icon}
           onClick={() => setSelectedIcon(icon)}
           style={{
             width: '48px',
             height: '48px',
             borderRadius: '12px',
             backgroundColor: selectedIcon === icon ? 'var(--primary-color)' : 'var(--background-secondary)',
             color: selectedIcon === icon ? 'white' : 'var(--text-color)',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             cursor: 'pointer',
             transition: 'all 0.2s ease',
             fontSize: '18px'
           }}
         >
           <i className={`fas fa-${icon}`}></i>
         </div>
       ))}
     </div>
   </div>
   ```

5. **颜色选择器**：
   ```tsx
   const colors = ['#007AFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#AF52DE', '#FF2D92'];
   
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
       marginBottom: '12px'
     }}>选择颜色</label>
     <div style={{
       display: 'grid',
       gridTemplateColumns: 'repeat(4, 1fr)',
       gap: '12px'
     }}>
       {colors.map(color => (
         <div
           key={color}
           onClick={() => setSelectedColor(color)}
           style={{
             width: '48px',
             height: '48px',
             borderRadius: '24px',
             backgroundColor: color,
             border: selectedColor === color ? '3px solid var(--primary-color)' : '2px solid var(--border-color)',
             cursor: 'pointer',
             transition: 'all 0.2s ease'
           }}
         />
       ))}
     </div>
   </div>
   ```

6. **实时预览**：
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
       marginBottom: '12px'
     }}>预览效果</label>
     <div style={{
       display: 'flex',
       alignItems: 'center',
       gap: '12px',
       padding: '12px',
       borderRadius: '8px',
       backgroundColor: 'var(--background-secondary)'
     }}>
       <div style={{
         width: '40px',
         height: '40px',
         borderRadius: '20px',
         backgroundColor: selectedColor || 'var(--primary-color)',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         color: 'white',
         fontSize: '18px'
       }}>
         <i className={`fas fa-${selectedIcon || 'question'}`}></i>
       </div>
       <div>
         <div style={{
           fontSize: '16px',
           fontWeight: '500',
           color: 'var(--text-color)'
         }}>
           {name || '分类名称'}
         </div>
         <div style={{
           fontSize: '14px',
           color: 'var(--text-secondary)'
         }}>
           {type === 'EXPENSE' ? '支出分类' : '收入分类'}
         </div>
       </div>
     </div>
   </div>
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
       disabled={isSubmitting || !name.trim()}
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
         opacity: isSubmitting || !name.trim() ? 0.6 : 1
       }}
     >
       {isSubmitting ? '保存中...' : '保存'}
     </button>
   </div>
   ```

8. **数据获取和保存**：
   - 通过 categoryId 调用 fetchCategory API
   - 表单验证：名称必填，图标和颜色有默认值
   - 保存时调用 updateCategory API
   - 成功后显示 toast 并触发 onSave 回调

请参考 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式，确保：
- 完整的样式迁移
- 真实数据加载和保存
- iOS 设计规范
- 表单验证和错误处理
- 流畅的用户体验
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从分类设置页面点击编辑弹出模态框
- [ ] 正确加载分类数据到表单
- [ ] 分类类型切换正常
- [ ] 分类名称和描述输入正常
- [ ] 图标选择器工作正常
- [ ] 颜色选择器工作正常
- [ ] 实时预览效果更新
- [ ] 表单验证正确执行
- [ ] 保存功能正常工作

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖
- [ ] 分类类型分段控制器美观
- [ ] 图标网格布局整齐
- [ ] 颜色选择器美观易用
- [ ] 实时预览效果直观
- [ ] 底部保存按钮固定显示

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

- `apps/web/src/app/settings/categories/[id]/edit/category-edit-client.tsx` - 原始组件
- `apps/web/src/app/settings/categories/page.tsx` - 集成位置
- `apps/web/src/store/category-store.ts` - 数据管理
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
