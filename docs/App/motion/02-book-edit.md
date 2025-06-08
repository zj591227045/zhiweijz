# 账本编辑页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/books/edit/[id]`  
**文件位置**: `apps/web/src/app/books/edit/[id]/book-edit-client.tsx`

### **当前功能**
- ✅ 编辑账本基本信息（名称、描述、颜色）
- ✅ 设置默认账本状态
- ✅ AI 服务配置开关
- ✅ 表单验证和提交
- ✅ 实时预览效果

### **当前组件结构**
```tsx
<PageContainer title="编辑账本" showBackButton>
  <BookForm />              // 账本表单
  <BookPreview />           // 实时预览
  <SaveButton />            // 保存按钮
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从账本列表页面弹出
2. 📱 **iOS 风格表单** - 卡片式输入，分组布局
3. 🎨 **颜色选择器** - iOS 风格颜色网格
4. 👁️ **实时预览** - 动态显示账本效果
5. ⚡ **流畅保存** - 优雅的提交反馈

### **设计改进**
- 分组表单布局
- iOS 风格颜色选择器
- 实时预览卡片
- 底部固定保存按钮

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/book-edit-modal.tsx
interface BookEditModalProps {
  bookId: string | null;
  onClose: () => void;
  onSave: () => void;
}
```

### **2. 表单分组设计**
```tsx
// 基本信息组
<div className="form-section">
  <h3>基本信息</h3>
  <div className="form-group">
    <label>账本名称</label>
    <input type="text" />
  </div>
  <div className="form-group">
    <label>账本描述</label>
    <textarea />
  </div>
</div>

// 外观设置组
<div className="form-section">
  <h3>外观设置</h3>
  <ColorPicker />
</div>

// 功能设置组
<div className="form-section">
  <h3>功能设置</h3>
  <SwitchGroup />
</div>
```

### **3. iOS 风格颜色选择器**
```tsx
const colors = ['#007AFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#AF52DE', '#FF2D92'];

<div className="color-grid">
  {colors.map(color => (
    <div 
      key={color}
      className={`color-option ${selectedColor === color ? 'selected' : ''}`}
      style={{ backgroundColor: color }}
      onClick={() => setSelectedColor(color)}
    />
  ))}
</div>
```

## 💻 **AI IDE 提示词**

```
请帮我创建账本编辑页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/book-edit-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏页面头部和底部导航
   - 显示专用头部：返回按钮 + "编辑账本" + 空白区域

2. **iOS 风格表单设计**：
   - 分组卡片布局，每组用标题分隔
   - 基本信息组：账本名称、描述输入框
   - 外观设置组：颜色选择器网格
   - 功能设置组：默认账本开关、AI服务开关

3. **颜色选择器**：
   ```tsx
   const colors = ['#007AFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#AF52DE', '#FF2D92'];
   
   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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
   ```

4. **开关组件**：
   ```tsx
   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
     <div>
       <div style={{ fontSize: '16px', fontWeight: '500' }}>设为默认账本</div>
       <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>新交易将默认使用此账本</div>
     </div>
     <input type="checkbox" className="ios-switch" />
   </div>
   ```

5. **实时预览卡片**：
   ```tsx
   <div style={{ backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginTop: '20px' }}>
     <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>预览效果</div>
     <div style={{ 
       backgroundColor: selectedColor, 
       borderRadius: '8px', 
       padding: '16px', 
       color: 'white' 
     }}>
       <div style={{ fontSize: '18px', fontWeight: '600' }}>{formData.name || '账本名称'}</div>
       <div style={{ fontSize: '14px', opacity: 0.9 }}>{formData.description || '账本描述'}</div>
       <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
         {formData.isDefault && <span className="badge">默认</span>}
         {formData.aiEnabled && <span className="badge">AI</span>}
       </div>
     </div>
   </div>
   ```

6. **数据获取和保存**：
   - 通过 bookId 调用 fetchAccountBook API
   - 表单验证：名称必填，描述可选
   - 保存时调用 updateAccountBook API
   - 成功后显示 toast 并触发 onSave 回调

7. **底部保存按钮**：
   ```tsx
   <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', zIndex: 10001 }}>
     <button
       onClick={handleSave}
       disabled={isSubmitting || !formData.name.trim()}
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
         opacity: isSubmitting || !formData.name.trim() ? 0.6 : 1
       }}
     >
       {isSubmitting ? '保存中...' : '保存'}
     </button>
   </div>
   ```

请参考 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式，确保：
- 完整的样式迁移
- 真实数据加载和保存
- iOS 设计规范
- 表单验证和错误处理
- 流畅的用户体验
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从账本列表点击编辑弹出模态框
- [ ] 正确加载账本数据到表单
- [ ] 账本名称和描述输入正常
- [ ] 颜色选择器工作正常
- [ ] 开关状态切换正常
- [ ] 实时预览效果更新
- [ ] 表单验证正确执行
- [ ] 保存功能正常工作

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖
- [ ] 页面头部和导航被隐藏
- [ ] 分组布局清晰易懂
- [ ] 颜色选择器美观易用
- [ ] 开关组件符合 iOS 风格
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

- `apps/web/src/app/books/edit/[id]/book-edit-client.tsx` - 原始组件
- `apps/web/src/app/books/page.tsx` - 集成位置
- `apps/web/src/store/account-book-store.ts` - 数据管理
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
