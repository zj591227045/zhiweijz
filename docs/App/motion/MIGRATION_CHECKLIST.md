# 全屏模态框迁移检查清单

## 📋 **基于交易编辑页面发现的关键问题**

在交易编辑页面的迁移过程中，我们发现了两个关键的样式问题，这些问题可能会影响所有后续的迁移页面。本检查清单确保每个迁移页面都能避免这些问题。

## 🚨 **必须修复的样式问题**

### **问题 1：头部高度不一致**
- **现象**：Web 移动端头部高度与 iOS 端不匹配
- **原因**：多个 CSS 文件中的 `.header` 样式冲突，iOS 特殊样式覆盖
- **影响**：用户体验不一致，视觉效果差异明显

### **问题 2：网格组件偏右**
- **现象**：分类选择器、图标网格等组件不居中，向右偏移
- **原因**：重复的 `padding` 设置导致双重内边距
- **影响**：布局不美观，与设计规范不符

## ✅ **迁移前检查清单**

### **1. CSS 样式修复**
- [ ] **导入样式修复文件**
  ```css
  @import './templates/style-fixes.css';
  ```

- [ ] **头部高度修复**
  ```css
  .app-container .header {
    height: 64px !important;
    min-height: 64px !important;
  }
  
  .ios-app .app-container .header,
  .capacitor-ios .app-container .header {
    height: 64px !important;
    min-height: 64px !important;
    padding-top: 0 !important;
  }
  ```

- [ ] **网格布局修复**
  ```css
  .step-content {
    padding: 0; /* 避免重复内边距 */
  }
  
  .category-section {
    margin: 0;
    padding: 0;
  }
  
  .category-grid {
    padding: 0;
    margin: 0 auto;
    max-width: 100%;
  }
  ```

### **2. 组件结构检查**
- [ ] **全屏模态框结构**
  ```tsx
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'var(--background-color)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }}>
  ```

- [ ] **头部组件**
  ```tsx
  <div className="header" style={{
    height: '64px',
    minHeight: '64px'
  }}>
    <button className="icon-button" onClick={onClose}>
      <i className="fas fa-arrow-left"></i>
    </button>
    <div className="header-title">页面标题</div>
    <div style={{ width: '32px' }}></div>
  </div>
  ```

- [ ] **内容区域**
  ```tsx
  <div className="main-content" style={{
    paddingBottom: '20px',
    overflowY: 'auto'
  }}>
    <div style={{ padding: '0 20px' }}>
      {/* 页面内容 */}
    </div>
  </div>
  ```

### **3. 头部管理逻辑**
- [ ] **隐藏原页面头部**
  ```tsx
  useEffect(() => {
    const appContainer = document.querySelector('.app-container');
    const pageHeader = appContainer?.querySelector('.header');
    const bottomNav = document.querySelector('.bottom-nav');

    if (pageHeader) {
      (pageHeader as HTMLElement).style.display = 'none';
    }
    if (bottomNav) {
      (bottomNav as HTMLElement).style.display = 'none';
    }

    return () => {
      if (pageHeader) {
        (pageHeader as HTMLElement).style.display = '';
      }
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
    };
  }, []);
  ```

## 🧪 **测试验证清单**

### **跨平台测试**
- [ ] **Web 移动端测试**
  - Chrome DevTools 移动设备模拟
  - 头部高度：64px
  - 网格组件居中对齐
  - 触摸目标大小适当

- [ ] **iOS Capacitor 测试**
  - 真机或模拟器测试
  - 头部高度与 Web 端一致
  - 安全区域适配正常
  - 导航手势正常

- [ ] **Android Capacitor 测试**
  - 真机或模拟器测试
  - 样式与 iOS 端一致
  - 系统导航栏适配
  - 性能表现良好

### **功能验证**
- [ ] **数据加载**
  - API 数据正确获取
  - 表单正确初始化
  - 错误处理完善

- [ ] **用户交互**
  - 表单输入正常
  - 按钮响应正确
  - 导航功能正常

- [ ] **样式一致性**
  - 颜色系统正确
  - 字体大小一致
  - 间距规范统一
  - 圆角规范一致

## 📝 **迁移步骤模板**

### **步骤 1：准备工作**
1. 复制 `templates/modal-template.tsx` 作为基础
2. 导入 `templates/style-fixes.css` 样式修复
3. 分析原页面功能和组件

### **步骤 2：组件迁移**
1. 创建全屏模态框结构
2. 迁移表单组件和逻辑
3. 应用 iOS 风格样式
4. 集成真实 API 数据

### **步骤 3：样式修复**
1. 应用头部高度修复
2. 检查网格布局居中
3. 验证响应式设计
4. 测试跨平台兼容性

### **步骤 4：测试验证**
1. Web 移动端测试
2. iOS Capacitor 测试
3. Android Capacitor 测试
4. 功能完整性验证

## 🔧 **常见问题解决**

### **头部高度问题**
- 使用 `!important` 确保样式优先级
- 添加 iOS 特殊环境样式覆盖
- 检查是否有其他 CSS 文件冲突

### **布局偏移问题**
- 移除重复的 `padding` 设置
- 使用 `margin: 0 auto` 确保居中
- 检查父容器的样式设置

### **跨平台兼容性**
- 使用 CSS 变量确保主题一致
- 测试不同屏幕尺寸和密度
- 验证触摸目标大小适当

## 📚 **参考资源**

- `templates/modal-template.tsx` - 模态框模板
- `templates/style-fixes.css` - 样式修复模板
- `templates/styles-template.ts` - 样式系统模板
- `README.md` - 总体迁移方案
- `ANDROID_COMPATIBILITY.md` - Android 兼容性指南
