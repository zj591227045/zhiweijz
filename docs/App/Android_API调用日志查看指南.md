# Android API调用日志查看指南

## 概述
本指南介绍如何在Android开发环境中查看API调用日志，帮助调试API连接和token问题。

## 🔧 已修复的问题

### 1. 登录/注册使用真实API
- ✅ **LoginActivity**: 从`mockLogin`改为`login`真实API调用
- ✅ **RegisterActivity**: 从`mockRegister`改为`register`真实API调用
- ✅ **Token获取**: 确保从真实API获取有效token

### 2. 账本ID修复
- ✅ **DashboardActivity**: 使用用户ID作为账本ID而不是固定值"1"
- ✅ **用户信息**: 从AuthStorage获取真实用户信息

### 3. 增强日志记录
- ✅ **ApiClient**: 详细的请求/响应日志
- ✅ **DashboardStore**: API调用状态和数据日志
- ✅ **认证流程**: Token保存和使用日志

## 📱 查看API调用日志

### 方法1: 使用ADB Logcat（推荐）

#### 基本命令
```bash
# 查看所有日志
adb logcat

# 过滤应用日志
adb logcat | grep "zhiweijizhangandroid"

# 过滤API相关日志
adb logcat | grep -E "(ApiClient|DashboardStore|LoginActivity|RegisterActivity)"
```

#### 专门的API调试命令
```bash
# 查看API请求和响应
adb logcat | grep -E "\[ApiClient\]"

# 查看登录流程
adb logcat | grep -E "\[LoginActivity\]|\[RegisterActivity\]|\[AuthStorage\]"

# 查看仪表盘数据加载
adb logcat | grep -E "\[DashboardStore\]|\[DashboardActivity\]"

# 查看所有相关日志
adb logcat | grep -E "\[(ApiClient|DashboardStore|LoginActivity|RegisterActivity|DashboardActivity|AuthStorage)\]"
```

#### 实时监控（清除历史日志）
```bash
# 清除日志缓存并实时监控
adb logcat -c && adb logcat | grep -E "\[(ApiClient|DashboardStore|LoginActivity)\]"
```

### 方法2: 使用Android Studio Logcat

1. **打开Android Studio**
2. **连接设备/模拟器**
3. **打开Logcat窗口**: View → Tool Windows → Logcat
4. **设置过滤器**:
   - Package Name: `com.zhiweijizhangandroid`
   - Log Level: `Verbose`
   - Filter: `ApiClient|DashboardStore|LoginActivity`

### 方法3: 在应用中查看日志

应用中的所有关键操作都会通过`println()`输出日志，包括：
- API请求URL和参数
- 响应状态码和数据
- Token保存和使用情况
- 错误信息和堆栈跟踪

## 🔍 关键日志标识

### 登录流程日志
```
[LoginActivity] 开始API登录请求: user@example.com
[ApiClient] 请求: POST http://10.255.0.97/api/auth/login
[ApiClient] Headers: {Authorization=Bearer null, Content-Type=application/json}
[ApiClient] 响应状态: 200
[LoginActivity] API登录成功，token: eyJhbGciOiJIUzI1NiIsInR5...
[AuthStorage] 登录状态已保存: username
```

### API调用日志
```
[DashboardActivity] 加载仪表盘数据，用户ID: 123, 账本ID: 123
[DashboardActivity] 当前token: eyJhbGciOiJIUzI1NiIsInR5...
[DashboardStore] 开始获取仪表盘数据，账本ID: 123
[DashboardStore] 开始并行请求API数据...
[DashboardStore] 请求月度统计: 2025-01-01 到 2025-01-31
[ApiClient] 请求: GET http://10.255.0.97/api/statistics/overview?accountBookId=123&startDate=2025-01-01&endDate=2025-01-31
[ApiClient] Headers: {Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5..., Content-Type=application/json}
```

### 错误日志
```
[ApiClient] 请求失败: 401 Unauthorized
[ApiClient] 错误响应体: {"message":"Token已过期"}
[DashboardStore] 获取仪表盘数据失败: Token已过期
```

## 🐛 常见问题诊断

### 1. Token问题
**症状**: API返回401 Unauthorized
**检查**:
```bash
adb logcat | grep -E "token|Token|AUTH"
```
**解决**: 确认登录成功并且token正确保存

### 2. 网络连接问题
**症状**: 连接超时或网络错误
**检查**:
```bash
adb logcat | grep -E "网络|连接|timeout|connection"
```
**解决**: 确认API服务器地址和网络连接

### 3. 数据解析问题
**症状**: 数据显示为空或格式错误
**检查**:
```bash
adb logcat | grep -E "响应体|解析|parsing"
```
**解决**: 检查API响应格式是否符合预期

## 📋 测试步骤

### 1. 登录测试
1. 启动应用
2. 输入正确的邮箱和密码
3. 观察日志中的API调用过程
4. 确认token获取和保存

### 2. 仪表盘数据测试
1. 登录成功后进入仪表盘
2. 观察API并行请求日志
3. 检查数据获取和解析过程
4. 确认UI更新

### 3. 错误处理测试
1. 使用错误的登录信息
2. 断开网络连接
3. 观察错误日志和用户提示

## 🚀 性能监控

### API响应时间
```bash
adb logcat | grep -E "请求:|响应状态:" | while read line; do echo "$(date '+%H:%M:%S') $line"; done
```

### 内存和CPU使用
```bash
adb shell top | grep zhiweijizhangandroid
```

## 📝 日志分析技巧

1. **时间戳**: 所有日志都包含时间戳，便于追踪请求顺序
2. **标签过滤**: 使用`[组件名]`标签快速定位问题
3. **错误堆栈**: 异常会打印完整堆栈跟踪
4. **数据验证**: 关键数据会在日志中显示，便于验证

现在您可以使用这些命令来监控API调用，确认token是否正确获取和使用！
