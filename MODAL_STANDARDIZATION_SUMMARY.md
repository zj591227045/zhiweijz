# 模态框样式统一化总结

## 问题描述
之前不同的模态框使用了不同的CSS类名和样式，导致：
1. 标题组件位置不统一，有些紧贴灵动岛，有些位置偏移
2. 页面内容宽度不自适应屏幕宽度
3. iOS安全区域适配不一致
4. 样式配置混乱，维护困难

## 解决方案

### 1. 最新修复内容 (2024年修复)
1. **预算编辑模态框内容宽度异常** - 移除了额外的容器限制，直接在main-content上设置padding
2. **家庭成员管理模态框标题组件样式不统一** - 更新为使用统一的标题组件样式
3. **添加分类页面缺少后退按钮** - 修正PageContainer的属性名称从showBack改为showBackButton
4. **AI服务编辑模态框宽度异常** - 类似预算编辑模态框的修复

### 2. 统一CSS类名标准
所有模态框现在都使用统一的CSS类名：
- **容器**: `modal-overlay` (主要类名) + 具体模态框类名 (如 `family-detail-modal-overlay`)
- **头部**: `modal-header` (主要类名) + 具体头部类名 (如 `family-detail-modal-header`)
- **内容**: `main-content` 或 `modal-content`

### 3. 已统一的模态框组件
1. **家庭详情模态框** (`family-detail-modal.tsx`)
   - 容器: `modal-overlay family-detail-modal-overlay`
   - 头部: `modal-header header family-detail-modal-header`

2. **家庭成员管理模态框** (`family-members-modal.tsx`)
   - 容器: `modal-overlay family-members-modal-overlay`
   - 头部: `modal-header header family-members-modal-header`

3. **预算编辑模态框** (`budget-edit-modal.tsx`)
   - 容器: `modal-overlay`
   - 头部: `modal-header header budget-edit-modal-header`

4. **AI服务编辑模态框** (`ai-service-edit-modal.tsx`)
   - 容器: `modal-overlay ai-service-edit-modal-overlay`
   - 头部: `modal-header header ai-service-edit-modal-header`

3. **交易编辑模态框** (`transaction-edit-modal.tsx`)
   - 容器: `modal-overlay`
   - 头部: `modal-header header transaction-edit-modal-header`

4. **账本编辑模态框** (`book-edit-modal.tsx`)
   - 容器: `modal-overlay`
   - 头部: `modal-header header book-edit-modal-header`

5. **AI服务编辑模态框** (`ai-service-edit-modal.tsx`)
   - 容器: `modal-overlay ai-service-edit-modal-overlay`
   - 头部: `modal-header header ai-service-edit-modal-header`

6. **分类编辑模态框** (`category-edit-modal.tsx`)
   - 容器: `modal-overlay category-edit-modal`
   - 头部: `modal-header category-edit-modal__header`

### 3. 统一的CSS样式标准 (`ios-modal-fixes.css`)

#### 模态框容器标准
- 全屏覆盖: `position: fixed`, `top: 0`, `width: 100vw`, `height: 100vh`
- 高层级: `z-index: 9999`
- 弹性布局: `display: flex`, `flex-direction: column`

#### 头部组件标准
- 固定高度: `height: 64px`
- 粘性定位: `position: sticky`, `top: 0`
- 统一内边距: `padding: 0 16px`
- iOS安全区域适配: `padding-top: calc(env(safe-area-inset-top) + 8px)`

#### 内容区域标准
- 自适应宽度: `width: 100%`, `max-width: 100%`
- 滚动优化: `overflow-y: auto`, `-webkit-overflow-scrolling: touch`
- 底部安全区域: `padding-bottom: calc(20px + env(safe-area-inset-bottom))`

#### 表单组件标准
- 统一内边距: `padding: 16px`, `margin: 16px`
- 自适应宽度: `width: calc(100% - 32px)`
- 统一边框: `border-radius: 12px`

### 4. iOS特定优化
- 灵动岛适配: 头部紧贴灵动岛下方，增加8px间距
- 安全区域适配: 自动适配顶部和底部安全区域
- 硬件加速: 使用 `transform: translateZ(0)` 优化性能
- 触摸滚动: 启用 `-webkit-overflow-scrolling: touch`

### 5. 宽度自适应修复
- 防止内容超出屏幕: `max-width: 100%`, `box-sizing: border-box`
- 容器自适应: 所有页面容器和内容区域都设置为100%宽度
- 固定宽度修复: 覆盖可能的固定宽度设置

## 效果
1. ✅ 所有模态框头部位置统一，紧贴灵动岛下方
2. ✅ 页面内容完全自适应屏幕宽度
3. ✅ iOS安全区域适配一致
4. ✅ 样式配置统一，易于维护
5. ✅ 支持深色模式和主题变量

## 维护指南
1. 新增模态框时，请使用 `modal-overlay` 作为容器主类名
2. 头部组件使用 `modal-header` 作为主类名
3. 确保在 `ios-modal-fixes.css` 中添加新模态框的选择器
4. 遵循统一的内边距和尺寸标准
