# 管理员模块

## 概述

管理员模块为"只为记账"项目提供了完整的后端管理功能，包括管理员认证、仪表盘统计等核心功能。

## 目录结构

```
src/admin/
├── controllers/           # 控制器层
│   ├── auth.admin.controller.ts       # 管理员认证控制器
│   └── dashboard.admin.controller.ts  # 仪表盘控制器
├── middleware/           # 中间件
│   └── auth.admin.middleware.ts      # 管理员认证中间件
├── routes/              # 路由层
│   ├── auth.admin.routes.ts          # 管理员认证路由
│   ├── dashboard.admin.routes.ts     # 仪表盘路由
│   └── index.ts                      # 路由主入口
├── services/            # 服务层
│   ├── admin.service.ts              # 管理员服务
│   └── dashboard.service.ts          # 仪表盘服务
├── utils/               # 工具层
│   └── jwt.admin.ts                  # 管理员JWT工具
├── scripts/             # 脚本
│   └── init-admin.ts                 # 初始化管理员脚本
└── README.md           # 本文档
```

## 已实现功能

### 1. 管理员认证系统

- ✅ 独立的管理员JWT认证系统
- ✅ 管理员登录/登出功能
- ✅ 认证状态检查
- ✅ 角色权限控制（超级管理员、普通管理员）
- ✅ 默认管理员账号初始化

### 2. 仪表盘统计系统

- ✅ 系统概览数据（用户数、交易数等）
- ✅ 用户统计（注册趋势、活跃用户）
- ✅ 交易统计（交易趋势、分类统计）
- ✅ 系统资源监控（内存、CPU使用情况）

## API接口

### 认证接口

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| POST | `/api/admin/auth/login` | 管理员登录 | 无 |
| GET  | `/api/admin/auth/check` | 检查认证状态 | 管理员认证 |
| POST | `/api/admin/auth/logout` | 管理员登出 | 管理员认证 |

### 仪表盘接口

| 方法 | 路径 | 说明 | 权限要求 |
|------|------|------|----------|
| GET | `/api/admin/dashboard/overview` | 获取概览统计 | 管理员权限 |
| GET | `/api/admin/dashboard/users` | 获取用户统计 | 管理员权限 |
| GET | `/api/admin/dashboard/transactions` | 获取交易统计 | 管理员权限 |
| GET | `/api/admin/dashboard/system` | 获取系统资源 | 管理员权限 |

## 配置

### 环境变量

在 `.env` 文件中添加以下配置：

```env
# 管理员JWT配置（可选，不配置时使用普通JWT配置）
JWT_ADMIN_SECRET=your_admin_jwt_secret
JWT_ADMIN_EXPIRES_IN=24h
```

### 默认管理员账号

- **用户名**: `admin`
- **密码**: `zhiweijz2025`
- **角色**: 超级管理员

⚠️ **重要提示**: 请在生产环境中及时修改默认密码！

## 使用方法

### 1. 初始化管理员账号

```bash
npm run admin:init
```

### 2. 管理员登录

```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "zhiweijz2025"
  }'
```

### 3. 访问仪表盘数据

```bash
# 获取概览统计
curl -X GET http://localhost:3000/api/admin/dashboard/overview \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 获取用户统计（7天）
curl -X GET "http://localhost:3000/api/admin/dashboard/users?period=7d" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 权限系统

### 角色定义

- **SUPER_ADMIN**: 超级管理员，拥有所有权限
- **ADMIN**: 普通管理员，拥有基本管理权限

### 中间件

- `authenticateAdmin`: 验证管理员身份
- `requireAdmin`: 要求管理员权限（普通管理员或超级管理员）
- `requireSuperAdmin`: 要求超级管理员权限

## 安全特性

1. **独立认证系统**: 管理员JWT与普通用户JWT完全分离
2. **较短的Token有效期**: 管理员Token默认24小时有效
3. **密码加密**: 使用bcrypt进行密码哈希，盐值轮数为12
4. **角色权限控制**: 细粒度的权限控制系统
5. **安全响应格式**: 统一的成功/失败响应格式

## 性能优化

1. **并行查询**: 仪表盘数据使用Promise.all并行查询
2. **数据库优化**: 使用原生SQL查询复杂统计数据
3. **错误处理**: 完善的错误处理和日志记录

## 后续扩展

根据技术规划文档，后续将添加：

1. 用户管理模块
2. LLM服务管理模块
3. 公告系统模块
4. 访问日志记录系统
5. 更细粒度的权限控制

## 注意事项

1. 管理员模块与普通用户系统完全独立
2. 所有管理员操作都需要认证
3. 敏感操作建议添加二次确认
4. 定期检查和更新管理员密码
5. 监控管理员操作日志 