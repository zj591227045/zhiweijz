# 只为记账 - 启动脚本

本目录包含用于启动项目的脚本，这些脚本配置为实时显示调试日志。

## 可用脚本

### 1. 启动后端服务

```bash
# 确保脚本有执行权限
chmod +x ./scripts/start-backend.sh

# 运行脚本
./scripts/start-backend.sh
```

此脚本将：
- 设置必要的环境变量以启用详细日志
- 检查依赖是否已安装
- 使用nodemon启动后端服务，实时监控文件变化
- 显示彩色日志输出

### 2. 启动前端服务

```bash
# 确保脚本有执行权限
chmod +x ./scripts/start-frontend.sh

# 运行脚本
./scripts/start-frontend.sh
```

此脚本将：
- 设置必要的环境变量以启用详细日志
- 检查依赖是否已安装
- 使用Next.js的开发服务器启动前端，使用turbopack加速构建
- 通过环境变量启用详细日志，显示彩色日志输出

### 3. 同时启动所有服务

```bash
# 确保脚本有执行权限
chmod +x ./scripts/start-all.sh

# 运行脚本
./scripts/start-all.sh
```

此脚本将：
- 如果安装了tmux，使用tmux创建多个窗口分别运行后端和前端服务
- 如果未安装tmux，将在后台启动服务并将日志输出到文件

## 日志级别

这些脚本设置了以下环境变量以启用详细日志：

### 后端
- `DEBUG=express:*,prisma:*,app:*`：启用Express、Prisma和应用程序的调试日志
- `NODE_ENV=development`：设置为开发环境
- `LOG_LEVEL=debug`：设置日志级别为debug

### 前端
- `NODE_ENV=development`：设置为开发环境
- `NEXT_TELEMETRY_DISABLED=1`：禁用Next.js遥测
- `DEBUG=next:*,react:*,app:*`：启用Next.js、React和应用程序的调试日志

## 自定义

如需自定义日志级别或其他设置，可以编辑脚本文件中的环境变量。

---

# 完整功能测试脚本

这套测试脚本提供了完整的前端和后端功能测试，确保在更新代码时不会破坏现有功能。

## 📋 测试脚本概览

### 🎯 主要测试脚本

| 脚本 | 命令 | 描述 | 耗时 |
|------|------|------|------|
| **完整测试** | `npm run test:full` | 运行所有测试套件 | 15-30分钟 |
| **后端API测试** | `npm run test:backend-api` | 测试所有API端点 | 3-5分钟 |
| **前端功能测试** | `npm run test:frontend` | 测试前端页面和组件 | 5-10分钟 |
| **端到端测试** | `npm run test:e2e` | 测试完整用户流程 | 10-15分钟 |
| **回归测试** | `npm run test:regression` | 完整回归测试套件 | 20-40分钟 |
| **健康检查** | `npm run test:health` | 快速系统健康检查 | 1-2分钟 |

### 🔧 测试配置文件

- `test-config.json` - 基础测试配置
- `regression-config.json` - 回归测试配置

## 🚀 快速开始

### 1. 环境准备

确保已安装所有依赖：

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd apps/web && npm install
```

### 2. 数据库准备

确保数据库正常运行并已执行迁移：

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 3. 运行测试

#### 快速健康检查
```bash
npm run test:health
```

#### 完整功能测试
```bash
npm run test:full
```

#### 单独运行特定测试
```bash
# 只测试后端API
npm run test:backend-api

# 只测试前端
npm run test:frontend

# 只测试端到端流程
npm run test:e2e
```

## 📊 测试详情

### 🔙 后端API测试 (`test-backend-api.js`)

**测试内容：**
- ✅ 用户认证（注册、登录、认证检查）
- ✅ 账本管理（创建、获取、更新、删除）
- ✅ 分类管理（获取、创建自定义分类）
- ✅ 交易管理（创建、获取、更新交易记录）
- ✅ 预算管理（创建、获取预算）
- ✅ 统计数据（支出、收入、预算统计）

**特点：**
- 自动创建和清理测试数据
- 完整的API端点覆盖
- 错误处理验证
- 响应数据格式验证

### 🎨 前端功能测试 (`test-frontend.js`)

**测试内容：**
- ✅ 页面渲染测试（所有主要页面）
- ✅ TypeScript编译检查
- ✅ 代码规范检查（ESLint）
- ✅ 构建过程测试
- ✅ 依赖完整性检查
- ✅ 环境变量检查
- ✅ API集成测试

**特点：**
- 自动启动和停止前端服务
- 页面可访问性验证
- 构建产物检查
- 开发环境验证

### 🔄 端到端测试 (`test-e2e.js`)

**测试内容：**
- ✅ 完整用户注册流程
- ✅ 用户登录流程
- ✅ 仪表盘访问和数据显示
- ✅ 账本管理完整流程
- ✅ 交易记录管理流程
- ✅ 预算管理流程
- ✅ 统计页面功能

**特点：**
- 自动启动前后端服务
- 模拟真实用户操作
- 前后端协作验证
- 数据一致性检查

### 🔍 回归测试 (`test-regression.js`)

**测试内容：**
- ✅ 所有单元测试和集成测试
- ✅ API功能完整性
- ✅ 前端构建和功能
- ✅ 端到端用户流程
- ✅ 性能回归检测
- ✅ 基线数据比较

**特点：**
- 全面的功能覆盖
- 性能回归检测
- 基线数据管理
- 详细的测试报告

### ⚡ 健康检查 (`test-health-check.js`)

**检查内容：**
- ✅ 后端API连通性
- ✅ 数据库连接状态
- ✅ 前端服务状态
- ✅ 磁盘空间使用
- ✅ 内存使用情况
- ✅ 依赖完整性
- ✅ 环境变量配置
- ✅ 端口可用性

**特点：**
- 快速系统状态检查
- 资源使用监控
- 问题早期发现
- 详细的健康报告

## 📈 测试报告

所有测试都会生成详细的报告，保存在 `test-reports/` 目录中：

- `test-report-{timestamp}.json` - 完整测试报告
- `regression-report-{timestamp}.json` - 回归测试报告
- `health-check-{timestamp}.json` - 健康检查报告
- `baseline.json` - 基线数据（用于回归比较）

## 🚨 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口使用情况
   lsof -i :3000
   lsof -i :3003
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   cd server
   npx prisma db pull
   ```

3. **依赖缺失**
   ```bash
   # 重新安装依赖
   npm install
   cd server && npm install
   cd apps/web && npm install
   ```

4. **测试超时**
   - 增加配置文件中的 `timeout` 值
   - 检查系统资源使用情况

### 调试模式

设置环境变量启用详细日志：

```bash
export DEBUG=true
export VERBOSE=true
npm run test:full
```

## 📝 最佳实践

### 1. 定期运行测试

建议在以下情况运行测试：

- ✅ 每次代码提交前
- ✅ 合并分支前
- ✅ 发布新版本前
- ✅ 定期健康检查（每日/每周）

### 2. 测试优先级

根据重要性选择测试：

1. **关键更新** → 运行完整回归测试
2. **功能开发** → 运行相关功能测试
3. **Bug修复** → 运行相关测试 + 回归测试
4. **日常检查** → 运行健康检查

### 3. 持续集成

可以将这些脚本集成到CI/CD流水线中：

```yaml
# GitHub Actions 示例
- name: Run Full Tests
  run: npm run test:full

- name: Run Health Check
  run: npm run test:health
```

## 🎯 测试策略

### 开发阶段
```bash
# 快速验证
npm run test:health

# 功能验证
npm run test:backend-api
npm run test:frontend
```

### 发布前
```bash
# 完整验证
npm run test:regression
```

### 生产监控
```bash
# 定期检查
npm run test:health
```

这套测试脚本确保了项目的稳定性和可靠性，帮助您在开发过程中及时发现和解决问题。
