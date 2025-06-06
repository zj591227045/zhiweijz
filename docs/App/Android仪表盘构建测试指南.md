# Android仪表盘构建测试指南

## 🔨 构建步骤

### 1. 环境准备
确保已安装：
- Android Studio
- Android SDK
- Android模拟器或真机

### 2. 构建命令
```bash
cd apps/android
./gradlew clean assembleDebug
```

### 3. 安装到设备
```bash
# 安装到模拟器或连接的设备
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 🧪 测试步骤

### 1. 登录测试
1. 启动应用
2. 使用任意邮箱和6位以上密码登录
3. 验证登录成功后跳转到仪表盘

### 2. 仪表盘功能测试

#### 月度概览测试
- ✅ 验证显示"本月概览"标题
- ✅ 验证显示当前月份（如"2024年01月"）
- ✅ 验证收入显示：¥8,500.00（绿色）
- ✅ 验证支出显示：¥6,200.00（红色）
- ✅ 验证结余显示：¥2,300.00（绿色，因为是正数）

#### 预算进度测试
- ✅ 验证显示"预算执行情况"标题
- ✅ 验证显示个人预算：64.0% (¥3,200/¥5,000)
- ✅ 验证显示餐饮预算：80.0% (¥1,200/¥1,500) - 橙色警告
- ✅ 验证显示交通预算：75.0% (¥600/¥800) - 蓝色正常
- ✅ 验证进度条颜色正确
- ✅ 测试折叠/展开按钮功能

#### 最近交易测试
- ✅ 验证显示"最近交易"标题
- ✅ 验证按日期分组显示
- ✅ 验证今天的交易：
  - 午餐 -¥25.50（红色）
  - 加油 -¥120.00（红色）
- ✅ 验证昨天的交易：
  - 月薪 +¥5,000.00（绿色）
  - 日用品 -¥89.90（红色）
- ✅ 验证图标显示正确
- ✅ 测试点击交易项目（应显示"功能即将推出"提示）

### 3. 交互测试
- ✅ 测试滚动流畅性
- ✅ 测试卡片点击反馈
- ✅ 测试"查看全部"按钮（应显示提示）
- ✅ 测试应用生命周期（最小化/恢复）

### 4. 错误处理测试
- ✅ 断网情况下启动应用（应显示模拟数据）
- ✅ API超时情况（应自动降级到模拟数据）
- ✅ 内存不足情况（应正常处理）

## 📱 预期效果

### 1. 视觉效果
- 卡片式布局，圆角设计
- 清晰的颜色区分（收入绿色，支出红色）
- 合理的间距和字体大小
- 流畅的滚动体验

### 2. 数据显示
- 所有金额格式化为"¥X,XXX.XX"
- 百分比显示为"XX.X%"
- 日期格式为"YYYY-MM-DD"
- 图标与分类匹配

### 3. 交互反馈
- 按钮点击有视觉反馈
- Toast提示信息清晰
- 加载状态明显
- 错误信息友好

## 🐛 常见问题

### 1. 构建失败
**问题**：Gradle构建失败
**解决**：
```bash
./gradlew clean
./gradlew build --refresh-dependencies
```

### 2. 安装失败
**问题**：APK安装失败
**解决**：
```bash
adb uninstall com.zhiweijizhangandroid
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 3. 应用崩溃
**问题**：启动时崩溃
**解决**：检查logcat日志
```bash
adb logcat | grep "zhiweijizhangandroid"
```

### 4. 数据不显示
**问题**：仪表盘显示空白
**解决**：
- 检查网络连接
- 验证模拟数据是否正常
- 查看控制台日志

## 📊 性能指标

### 1. 启动时间
- 冷启动：< 3秒
- 热启动：< 1秒

### 2. 内存使用
- 正常运行：< 100MB
- 峰值使用：< 150MB

### 3. 网络请求
- API超时：10秒
- 重试次数：3次
- 降级策略：自动使用模拟数据

## 🔍 调试技巧

### 1. 日志查看
```bash
# 查看应用日志
adb logcat | grep "DashboardActivity\|DashboardStore\|ApiClient"

# 查看错误日志
adb logcat | grep "ERROR\|FATAL"
```

### 2. 状态检查
在DashboardActivity中添加调试日志：
```kotlin
println("[Debug] 仪表盘数据状态: ${data.isLoading}, 错误: ${data.error}")
```

### 3. 网络调试
检查API请求：
```kotlin
println("[Debug] API请求: $method $url")
println("[Debug] API响应: $responseBody")
```

## ✅ 验收标准

### 1. 功能完整性
- [ ] 所有UI组件正常显示
- [ ] 数据加载和显示正确
- [ ] 交互功能正常工作
- [ ] 错误处理机制有效

### 2. 性能表现
- [ ] 启动时间符合要求
- [ ] 滚动流畅无卡顿
- [ ] 内存使用合理
- [ ] 无内存泄漏

### 3. 用户体验
- [ ] 界面美观，符合设计规范
- [ ] 交互反馈及时
- [ ] 错误提示友好
- [ ] 加载状态清晰

通过以上测试步骤，可以全面验证Android仪表盘页面的功能完整性和用户体验！
