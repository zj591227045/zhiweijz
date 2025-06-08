# 交易详情页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/transactions/[id]`  
**文件位置**: `apps/web/src/app/transactions/[id]/transaction-detail-client.tsx`

### **当前功能**
- ✅ 显示交易详细信息（金额、分类、时间、描述等）
- ✅ 支持编辑和删除操作
- ✅ 显示关联的账本和预算信息
- ✅ 响应式布局

### **当前组件结构**
```tsx
<PageContainer title="交易详情" showBackButton>
  <TransactionHeader />      // 交易金额和分类
  <TransactionDetails />     // 基本信息卡片
  <TransactionActions />     // 编辑/删除按钮
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从仪表盘点击交易记录弹出
2. 📱 **iOS 风格设计** - 卡片式布局，现代化视觉效果
3. 🔄 **真实数据** - 通过 API 获取交易详情
4. ⚡ **流畅交互** - 平滑动画，优雅的操作反馈

### **设计改进**
- 大字体金额显示
- 卡片式信息分组
- iOS 风格操作按钮
- 底部安全区域适配

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/transaction-detail-modal.tsx
interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

### **2. 集成到仪表盘**
```tsx
// apps/web/src/app/dashboard/page.tsx
const [showDetailModal, setShowDetailModal] = useState(false);
const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

// 处理交易点击
const handleTransactionClick = (transactionId: string) => {
  setSelectedTransactionId(transactionId);
  setShowDetailModal(true);
};
```

### **3. 数据获取逻辑**
```tsx
// 获取交易详情
useEffect(() => {
  if (transactionId && transactionId !== 'placeholder') {
    fetchTransaction(transactionId);
  }
}, [transactionId, fetchTransaction]);
```

## 💻 **AI IDE 提示词**

```
请帮我创建交易详情页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/transaction-detail-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏仪表盘头部和底部导航
   - 显示专用头部：返回按钮 + "交易详情" + 更多操作菜单

2. **iOS 风格设计**：
   - 大字体金额显示（48px）
   - 交易类型标签（支出红色/收入绿色）
   - 分类图标 + 名称卡片
   - 信息卡片分组：基本信息、账本信息、备注

3. **数据获取**：
   - 通过 transactionId 调用 fetchTransaction API
   - 支持加载状态和错误处理
   - 优先使用 API 数据

4. **操作按钮**：
   - 底部固定：编辑按钮（主色调）+ 删除按钮（红色）
   - iOS 风格圆角按钮，48px 高度
   - 编辑按钮触发 onEdit 回调
   - 删除按钮显示确认对话框

5. **信息展示卡片**：
   ```tsx
   // 基本信息卡片
   <div style={{ backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
     <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>基本信息</div>
     <div>交易时间：{formatDateTime(transaction.date)}</div>
     <div>交易分类：{transaction.categoryName}</div>
     <div>关联账本：{transaction.accountBookName}</div>
     {transaction.budgetName && <div>使用预算：{transaction.budgetName}</div>}
   </div>
   ```

6. **集成到仪表盘**：
   - 在 `apps/web/src/app/dashboard/page.tsx` 中添加状态管理
   - RecentTransactions 组件的交易点击触发模态框
   - 支持编辑和删除操作的回调处理

请按照交易编辑模态框的成功模式实现，确保：
- 完整的样式迁移
- 真实数据加载
- iOS 设计规范
- 流畅的用户体验

参考已完成的 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式。
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从仪表盘点击交易记录弹出详情模态框
- [ ] 显示完整的交易信息（金额、分类、时间、描述等）
- [ ] 编辑按钮正确跳转到编辑模态框
- [ ] 删除按钮显示确认对话框并执行删除
- [ ] 返回按钮正确关闭模态框

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖整个屏幕
- [ ] 仪表盘头部和导航被正确隐藏
- [ ] 专用头部显示正确的标题和操作
- [ ] iOS 风格设计符合移动端规范
- [ ] 大字体金额清晰易读

### **数据验证**
- [ ] 通过 API 正确获取交易详情
- [ ] 加载状态正确显示
- [ ] 错误状态有友好提示
- [ ] 所有字段正确显示和格式化

### **交互验证**
- [ ] 点击操作有视觉反馈
- [ ] 动画过渡流畅自然
- [ ] 触摸目标大小适合移动端
- [ ] 滚动行为正常

## 🔗 **相关文件**

- `apps/web/src/app/transactions/[id]/transaction-detail-client.tsx` - 原始组件
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
- `apps/web/src/app/dashboard/page.tsx` - 集成位置
- `apps/web/src/store/transaction-store.ts` - 数据管理
