# 只为记账 - 管理员功能

## 概述

本目录包含"只为记账"系统管理员功能的完整技术规划和实现指南。管理员功能为系统提供了完整的后台管理能力，包括用户管理、系统配置、公告管理、数据统计等。

## 📁 文档结构

```
docs/admin/
├── README.md                    # 本文件，总体说明
├── technology_planning.md       # 技术规划总览
├── database_schema.md           # 数据库设计详解
├── api_design.md               # API接口设计
├── llm_logging_implementation.md # LLM日志实现指南
└── upgrade_guide.md            # 数据库升级指南
```

## 🚀 快速开始

### 1. 升级前检查
```bash
# 检查升级准备情况
cd server
node scripts/check-upgrade-readiness.js
```

### 2. 数据库升级（Docker环境）
```bash
# 自动升级（推荐）
./server/scripts/docker-upgrade.sh

# 自定义管理员密码
DEFAULT_ADMIN_PASSWORD=your_password ./server/scripts/docker-upgrade.sh
```

### 3. 访问管理界面
升级完成后，访问 `http://your-domain/admin`
- 默认账号：`admin`
- 默认密码：`zhiweijz2025`

## 🔧 升级文件

### 数据库相关文件
```
server/
├── prisma/
│   ├── schema.prisma           # 更新的Prisma Schema
│   └── migrations/
│       └── admin_extension.sql # 数据库升级SQL
└── scripts/
    ├── upgrade-database.js     # 数据库升级脚本
    ├── docker-upgrade.sh       # Docker环境升级脚本
    ├── check-upgrade-readiness.js # 升级前检查
    └── generate-admin-password.js # 密码哈希生成
```

## 📊 新增功能

### 🔐 管理员认证系统
- 独立的管理员账号体系
- 支持多种管理员角色（超级管理员、普通管理员）
- JWT身份验证和会话管理
- 安全的密码存储（bcrypt加密）

### ⚙️ 系统配置管理
- 全局系统参数配置
- 用户注册开关控制
- LLM服务全局配置
- 系统限制参数设置

### 📢 公告系统
- 向用户发送系统公告和通知
- 支持不同优先级和状态
- 高效的已读状态管理
- 目标用户筛选（新用户/所有用户等）

### 📊 数据统计与监控
- 用户注册统计
- 记账记录统计
- API调用监控
- LLM使用统计
- 前端访问分析

### 📋 日志记录系统
- **前端访问日志**：记录用户页面访问
- **API调用日志**：记录所有接口调用详情
- **LLM调用日志**：详细记录AI服务使用情况
- 支持表分区，优化大数据量性能

## 🏗️ 技术架构

### 数据库设计
- **PostgreSQL** 作为主数据库
- **表分区** 支持大量日志数据
- **索引优化** 保证查询性能
- **版本控制** 支持平滑升级

### 后端架构
- 基于现有的 **Node.js + Express** 架构
- **Prisma ORM** 进行数据库操作
- **JWT** 认证和权限控制
- **中间件** 自动记录日志

### 前端架构
- **Next.js + React** 管理界面
- **Tailwind CSS** 样式框架
- **shadcn/ui** 组件库
- **Chart.js** 数据可视化

## 🔒 安全特性

### 认证与授权
- 独立的管理员认证系统
- JWT Token 和会话管理
- 基于角色的权限控制
- 管理页面路由保护

### 数据安全
- 密码bcrypt加密存储
- 敏感数据访问控制
- SQL注入防护
- API速率限制

### 隐私保护
- 用户数据脱敏显示
- 操作日志记录
- 数据访问审计
- 定期数据清理

## 📈 性能优化

### 数据库优化
- **分区表**：日志表按月分区，提高查询性能
- **索引策略**：为常用查询建立复合索引
- **统计聚合**：定期聚合统计数据，减少实时计算
- **数据清理**：自动清理过期日志，控制数据量

### 查询优化
- 分页查询减少内存占用
- 缓存常用统计数据
- 异步处理大量数据操作
- 批量操作提高效率

## 🔄 升级策略

### 版本兼容性
- 从 v1.0.0 升级到 v1.1.0
- 完全向后兼容
- 零数据丢失
- 平滑过渡

### 升级方案
1. **Docker环境**：使用自动化脚本
2. **本地环境**：手动执行升级步骤
3. **回滚支持**：自动备份，支持快速回滚
4. **验证检查**：升级后自动验证功能

### 部署注意事项
- 升级前创建数据库备份
- 确保足够的磁盘空间
- 在非业务高峰时间升级
- 升级后验证所有功能

## 📚 使用指南

### 管理员日常操作
1. **用户管理**：查看、添加、禁用用户账号
2. **系统配置**：修改全局系统设置
3. **公告管理**：发布系统通知和公告
4. **数据监控**：查看系统使用统计
5. **日志查看**：分析用户行为和系统性能

### 维护任务
- 定期检查系统运行状态
- 清理过期日志数据
- 监控系统性能指标
- 备份重要数据
- 更新系统配置

## 🛠️ 开发指南

### 本地开发环境
```bash
# 安装依赖
cd server && npm install
cd apps/web && npm install

# 配置环境变量
cp .env.example .env

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run dev
```

### 添加新功能
1. 更新数据库Schema
2. 创建API接口
3. 实现前端页面
4. 添加权限控制
5. 编写测试用例
6. 更新文档

## 🧪 测试

### 升级测试
```bash
# 测试升级脚本
npm run test:upgrade

# 验证数据完整性
npm run test:data-integrity

# 功能测试
npm run test:admin-features
```

### 性能测试
- 大量数据下的查询性能
- 并发访问压力测试
- 内存和CPU使用监控
- 数据库连接池测试

## 📞 支持与反馈

### 常见问题
请查看 [upgrade_guide.md](./upgrade_guide.md) 中的故障排除部分。

### 技术支持
- GitHub Issues：报告Bug和功能请求
- 邮件支持：技术问题咨询
- 文档更新：欢迎提交改进建议

### 贡献指南
欢迎为项目贡献代码和文档：
1. Fork 项目仓库
2. 创建功能分支
3. 提交代码更改
4. 发起 Pull Request

---

**注意**：这是一个重要的系统升级，请在升级前仔细阅读所有相关文档，并在测试环境中验证升级流程。如有疑问，请及时联系技术支持。 