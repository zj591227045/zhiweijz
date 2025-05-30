# 只为记账 - React Native 技术规划

## 1. 总体技术规划

### 1.1 技术栈选择

| 技术领域 | Web端(现有) | React Native端(规划) | 说明 |
|---------|------------|-------------------|------|
| 核心框架 | Next.js 14 | React Native 0.73+ | 选择稳定版本，确保兼容性 |
| 状态管理 | Zustand | Zustand | 可直接复用，无需修改 |
| UI组件库 | shadcn/ui + Tailwind CSS | React Native Paper | Material Design风格，适配移动端 |

| 表单处理 | React Hook Form + Zod | React Hook Form + Zod | 可直接复用逻辑 |
| HTTP客户端 | Axios + React Query | Axios + React Query | 可直接复用API调用逻辑 |
| 图表库 | Chart.js + react-chartjs-2 | react-native-chart-kit | 原生图表支持 |
| 导航系统 | Next.js App Router | React Navigation | 原生导航体验 |
| 工具库 | dayjs, clsx | dayjs, react-native-utils | 日期处理可复用 |
| 主题系统 | CSS变量 + Tailwind | React Native Paper主题 | 适配原生主题系统 |
| 存储方案 | localStorage | AsyncStorage | 本地持久化存储 |
| 打包工具 | - | React Native CLI | 原生打包工具 |

### 1.2 项目结构设计

```
/src
  /api                  # API客户端(从Web端复用)
    api-client.ts       # 基础API客户端
    endpoints.ts        # API端点定义
  /components           # UI组件
    /ui                 # 基础UI组件
    /auth               # 认证相关组件
    /dashboard          # 仪表盘组件
    /transactions       # 交易相关组件
    /categories         # 分类相关组件
    /budgets            # 预算相关组件
    /statistics         # 统计分析组件
    /books              # 账本相关组件
    /settings           # 设置相关组件
  /hooks                # 自定义钩子(大部分从Web端复用)
  /navigation           # 导航配置
    AppNavigator.tsx    # 主导航器
    AuthNavigator.tsx   # 认证导航器
    MainNavigator.tsx   # 主界面导航器
  /screens              # 屏幕组件(对应Web端的pages)
    /auth               # 认证相关屏幕
    /dashboard          # 仪表盘屏幕
    /transactions       # 交易相关屏幕
    /categories         # 分类相关屏幕
    /budgets            # 预算相关屏幕
    /statistics         # 统计相关屏幕
    /books              # 账本相关屏幕
    /settings           # 设置相关屏幕
  /store                # 状态管理(从Web端复用)
  /styles               # 样式定义
    theme.ts            # 主题定义
  /types                # 类型定义(从Web端复用)
  /utils                # 工具函数(从Web端复用)
  App.tsx               # 应用入口
```

### 1.3 代码复用策略

1. **业务逻辑层复用**:
   - API调用逻辑(api目录)
   - 状态管理(store目录)
   - 数据处理工具(utils目录)
   - 类型定义(types目录)
   - 自定义钩子(hooks目录)

2. **UI层适配**:
   - 将Web组件转换为React Native组件
   - 使用React Native Paper替代shadcn/ui
   - 将CSS样式转换为StyleSheet样式
   - 适配移动端交互模式

3. **导航系统转换**:
   - 将Next.js路由映射到React Navigation
   - 实现类似的路由保护机制
   - 保持URL结构一致性(便于API调用)

### 1.4 开发与部署流程

1. **开发环境搭建**:
   - 安装React Native CLI
   - 配置Android Studio和Xcode
   - 设置模拟器和真机调试环境

2. **开发流程**:
   - 先完成核心框架搭建
   - 实现认证流程
   - 按优先级开发功能模块
   - 进行跨平台测试

3. **打包与发布**:
   - Android: 生成签名APK/AAB
   - iOS: 通过TestFlight测试后上架App Store
   - 配置CI/CD自动化构建流程

## 2. 页面转换规划

### 2.1 认证模块

#### 登录页面(Login Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 登录表单 | LoginForm | 使用React Native Paper的TextInput、Button |
| 表单验证 | 复用逻辑 | 使用相同的React Hook Form + Zod |
| 记住我功能 | 复用逻辑 | 使用AsyncStorage替代localStorage |
| 页面布局 | 重新设计 | 适配移动端垂直布局 |

#### 注册页面(Register Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 注册表单 | RegisterForm | 使用React Native Paper的TextInput、Button |
| 表单验证 | 复用逻辑 | 使用相同的React Hook Form + Zod |
| 页面布局 | 重新设计 | 适配移动端垂直布局 |

#### 密码找回页面(Forgot Password Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 找回表单 | ForgotPasswordForm | 使用React Native Paper的TextInput、Button |
| 表单验证 | 复用逻辑 | 使用相同的React Hook Form + Zod |
| 页面布局 | 重新设计 | 适配移动端垂直布局 |

### 2.2 主界面模块

#### 仪表盘页面(Dashboard Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 余额卡片 | BalanceCard | 使用React Native Paper的Card、Surface |
| 预算进度 | BudgetProgress | 使用react-native-progress替代Web进度条 |
| 最近交易列表 | RecentTransactionsList | 使用FlatList替代普通列表 |
| 图表组件 | 使用react-native-chart-kit | 替代Chart.js |
| 页面布局 | 重新设计 | 适配移动端垂直滚动布局 |

#### 交易列表页面(Transactions Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 交易列表 | TransactionList | 使用FlatList实现高性能列表 |
| 分组显示 | GroupedTransactionList | 使用SectionList实现分组 |
| 筛选器 | TransactionFilters | 使用Modal或Bottom Sheet实现筛选面板 |
| 加载状态 | 使用ActivityIndicator | 替代Web加载动画 |
| 下拉刷新 | 添加RefreshControl | Web端不需要此功能 |

#### 添加交易页面(Add Transaction Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 交易表单 | TransactionForm | 使用React Native Paper的组件 |
| 数字键盘 | NumericKeyboard | 使用自定义数字键盘组件 |
| 分类选择器 | CategorySelector | 使用FlatList网格布局 |
| 日期选择器 | DatePicker | 使用react-native-date-picker |
| 智能记账 | SmartAccountingDialog | 使用Modal实现对话框 |

#### 交易详情页面(Transaction Detail Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 详情卡片 | TransactionDetailCard | 使用React Native Paper的Card |
| 操作按钮 | ActionButtons | 使用React Native Paper的Button |
| 页面布局 | 重新设计 | 适配移动端垂直布局 |

### 2.3 分类与预算模块

#### 分类管理页面(Categories Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 分类列表 | CategoryList | 使用FlatList实现 |
| 分类网格 | CategoryGrid | 使用FlatList的numColumns属性实现网格 |
| 类型切换 | CategoryTypeToggle | 使用React Native Paper的SegmentedControl |
| 添加按钮 | AddCategoryButton | 使用FAB(浮动操作按钮) |

#### 预算列表页面(Budgets Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 预算列表 | BudgetList | 使用FlatList实现 |
| 预算卡片 | BudgetCard | 使用React Native Paper的Card |
| 类型选择器 | BudgetTypeSelector | 使用React Native Paper的Chip组 |
| 添加按钮 | AddBudgetButton | 使用FAB(浮动操作按钮) |

### 2.4 统计与账本模块

#### 统计分析页面(Statistics Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 统计卡片 | StatsSummaryCard | 使用React Native Paper的Card |
| 趋势图表 | TrendChart | 使用react-native-chart-kit的LineChart |
| 分类分布 | CategoryDistribution | 使用react-native-chart-kit的PieChart |
| 日期范围选择器 | DateRangePicker | 使用自定义日期范围选择器 |

#### 账本管理页面(Books Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 账本列表 | BookList | 使用FlatList实现 |
| 账本卡片 | BookCard | 使用React Native Paper的Card |
| 添加按钮 | AddBookButton | 使用FAB(浮动操作按钮) |
| 空状态 | EmptyState | 使用自定义空状态组件 |

### 2.5 设置模块

#### 设置页面(Settings Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 设置列表 | SettingsList | 使用FlatList实现 |
| 设置项 | SettingsItem | 使用React Native Paper的List.Item |
| 主题切换 | ThemeSwitcher | 使用React Native Paper的Switch |
| 个人资料 | ProfileSection | 使用自定义个人资料组件 |

#### 个人资料页面(Profile Screen)

| Web组件 | React Native组件 | 转换策略 |
|--------|-----------------|---------|
| 个人资料表单 | ProfileForm | 使用React Native Paper的TextInput |
| 头像上传 | AvatarUploader | 使用react-native-image-picker |
| 保存反馈 | SaveFeedback | 使用React Native Paper的Snackbar |

## 3. 实施路线图

### 3.1 第一阶段: 基础架构(1-2周)

- 创建React Native项目
- 配置导航系统
- 设置状态管理
- 实现API客户端
- 创建基础UI组件
- 实现主题系统

### 3.2 第二阶段: 认证模块(1周)

- 实现登录页面
- 实现注册页面
- 实现密码找回页面
- 实现认证状态管理

### 3.3 第三阶段: 核心功能(2-3周)

- 实现仪表盘页面
- 实现交易列表页面
- 实现添加交易页面
- 实现交易详情页面
- 实现分类管理页面
- 实现预算管理页面

### 3.4 第四阶段: 高级功能(2周)

- 实现统计分析页面
- 实现账本管理页面
- 实现设置页面
- 实现个人资料页面

### 3.5 第五阶段: 测试与优化(1-2周)

- 进行跨平台测试
- 优化性能
- 修复bug
- 准备发布

## 4. 注意事项与挑战

1. **平台差异**:
   - 处理iOS和Android的UI差异
   - 适配不同屏幕尺寸和分辨率
   - 处理平台特定功能(如通知)

2. **性能优化**:
   - 优化列表渲染性能
   - 减少不必要的重渲染
   - 优化图片和资源加载

3. **离线功能**:
   - 实现数据本地缓存
   - 处理网络连接中断情况
   - 实现数据同步机制

4. **原生功能集成**:
   - 集成相机和图片库
   - 实现推送通知
   - 处理权限请求
