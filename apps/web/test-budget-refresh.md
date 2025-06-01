# 预算编辑页面刷新问题修复测试

## 问题描述
在前端的预算编辑页面中修改预算金额后，列表没有立刻刷新预算信息。必须要刷新网页后才能看到修改后的预算金额。

## 修复方案
实施了三层保障机制来确保预算列表能够及时刷新：

### 1. 自定义事件通知机制
- 在预算表单提交成功后发送 `budgetUpdated` 自定义事件
- 预算列表页面监听该事件并自动刷新数据

### 2. Store级别的直接刷新
- 在预算列表store中添加 `refreshBudgets()` 方法
- 预算表单store在提交成功后直接调用该方法刷新数据

### 3. 优化页面跳转时机
- 在数据刷新完成后添加短暂延迟再跳转页面
- 确保用户看到的是最新的数据

## 测试步骤

### 测试前准备
1. 启动前端开发服务器：`npm run dev`
2. 确保后端服务正常运行
3. 登录系统并进入预算管理页面

### 测试用例1：编辑个人预算金额
1. 进入预算管理页面
2. 点击某个个人预算的编辑按钮
3. 修改预算金额（例如从2000改为2500）
4. 点击"保存修改"按钮
5. **预期结果**：页面跳转回预算列表，列表中显示的预算金额已更新为2500

### 测试用例2：编辑通用预算金额
1. 切换到"通用预算"标签
2. 点击某个通用预算的编辑按钮
3. 修改预算金额
4. 点击"保存修改"按钮
5. **预期结果**：页面跳转回预算列表，列表中显示的预算金额已更新

### 测试用例3：编辑预算名称
1. 进入预算编辑页面
2. 修改预算名称
3. 点击"保存修改"按钮
4. **预期结果**：页面跳转回预算列表，列表中显示的预算名称已更新

### 测试用例4：编辑结转设置
1. 编辑个人预算
2. 切换结转功能开关
3. 点击"保存修改"按钮
4. **预期结果**：页面跳转回预算列表，预算的结转状态已更新

## 调试信息
在浏览器开发者工具的控制台中，应该能看到以下日志：

```
收到预算更新事件，刷新预算列表
刷新预算列表: [账本ID]
获取预算列表: [账本ID]
```

## 修复的文件
1. `apps/web/src/store/budget-form-store.ts` - 添加事件通知和store刷新
2. `apps/web/src/components/budgets/budget-list-page.tsx` - 添加事件监听
3. `apps/web/src/store/budget-list-store.ts` - 添加刷新方法
4. `apps/web/src/components/budgets/budget-form/budget-form.tsx` - 优化跳转时机

## 技术实现细节

### 事件通知机制
```javascript
// 发送事件
window.dispatchEvent(new CustomEvent('budgetUpdated', {
  detail: { accountBookId }
}));

// 监听事件
window.addEventListener('budgetUpdated', handleBudgetUpdated);
```

### Store刷新机制
```javascript
// 预算列表store
refreshBudgets: async () => {
  const { lastAccountBookId } = get();
  if (lastAccountBookId) {
    await get().fetchBudgets(lastAccountBookId);
  }
}

// 预算表单store调用
const budgetListStore = useBudgetListStore.getState();
await budgetListStore.refreshBudgets();
```

## 预期效果
修复后，用户在编辑预算并保存后，应该能够立即在预算列表中看到更新后的信息，无需手动刷新页面。
