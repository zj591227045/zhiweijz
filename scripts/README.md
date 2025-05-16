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
