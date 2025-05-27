# 只为记账 数据库管理指南

## 🎯 问题背景

在之前的开发过程中，由于Prisma迁移状态异常，导致数据库更新失败。主要问题包括：

1. **迁移状态不一致** - 开发环境和Docker环境使用不同的初始化方式
2. **迁移文件过多** - 21个迁移文件，容易出现状态冲突
3. **维护复杂** - 需要同时维护多个数据库初始化文件

## 🔧 解决方案

### 统一数据库初始化策略

我们采用了**统一的数据库初始化策略**，确保开发环境和Docker环境使用相同的数据库结构：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prisma Schema │    │  生成脚本        │    │  统一初始化      │
│  (单一数据源)    │───▶│ generate-schema │───▶│  init.sql       │
│                 │    │                 │    │  (Docker环境)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                             │
         ▼                                             ▼
┌─────────────────┐                          ┌─────────────────┐
│  Prisma迁移     │                          │  Docker容器     │
│  (开发环境)     │                          │  自动初始化     │
└─────────────────┘                          └─────────────────┘
```

## 📁 文件结构

```
docker/
├── config/
│   └── init.sql                    # 自动生成的数据库初始化文件
├── scripts/
│   ├── generate-schema.sh          # 从Prisma生成数据库Schema
│   ├── reset-database.sh           # 重置数据库状态
│   └── start.sh                    # 启动脚本（集成数据库初始化）
└── docs/
    └── DATABASE_MANAGEMENT.md      # 本文档
```

## 🛠️ 核心工具

### 1. Schema生成工具 (`generate-schema.sh`)

**功能**: 从当前Prisma schema生成完整的数据库初始化SQL

**使用方法**:
```bash
cd docker
./scripts/generate-schema.sh
```

**工作原理**:
1. 启动临时PostgreSQL容器
2. 使用`prisma db push`将schema推送到临时数据库
3. 导出数据库结构为SQL文件
4. 清理临时容器

### 2. 数据库重置工具 (`reset-database.sh`)

**功能**: 统一重置开发环境和Docker环境的数据库状态

**使用方法**:
```bash
# 重置开发环境
./scripts/reset-database.sh --dev

# 重置Docker环境
./scripts/reset-database.sh --docker

# 重置两个环境
./scripts/reset-database.sh --both
```

**安全特性**:
- 自动备份现有数据
- 确认提示防止误操作
- 验证重置后的数据库状态

## 🔄 工作流程

### 开发时添加新字段

1. **修改Prisma Schema**
   ```bash
   # 编辑 server/prisma/schema.prisma
   vim server/prisma/schema.prisma
   ```

2. **重新生成数据库Schema**
   ```bash
   cd docker
   ./scripts/generate-schema.sh
   ```

3. **重置数据库状态**
   ```bash
   # 重置开发环境（如果需要）
   ./scripts/reset-database.sh --dev
   
   # 重置Docker环境
   ./scripts/reset-database.sh --docker
   ```

4. **测试部署**
   ```bash
   # 测试Docker环境
   ./scripts/start.sh
   
   # 测试开发环境
   cd ../server && npm run dev
   ```

### 部署到生产环境

1. **生成最新Schema**
   ```bash
   ./scripts/generate-schema.sh
   ```

2. **部署**
   ```bash
   ./scripts/start.sh
   ```

## 🔒 环境隔离

### 开发环境
- **数据库初始化**: Prisma迁移 (`prisma migrate`)
- **优势**: 支持增量迁移，保留开发数据
- **适用**: 日常开发和测试

### Docker环境
- **数据库初始化**: SQL脚本 (`init.sql`)
- **优势**: 快速、一致的初始化
- **适用**: 生产部署和新环境搭建

### 统一性保证
- 两个环境的数据库结构完全一致
- 通过自动化脚本确保同步
- 定期验证数据库状态

## 🚨 故障排除

### 问题1: Prisma迁移失败

**症状**: `prisma migrate` 命令报错

**解决方案**:
```bash
# 重置开发环境数据库
./scripts/reset-database.sh --dev
```

### 问题2: Docker数据库初始化失败

**症状**: Docker容器启动时数据库初始化报错

**解决方案**:
```bash
# 重新生成Schema并重置Docker环境
./scripts/generate-schema.sh
./scripts/reset-database.sh --docker
```

### 问题3: 数据库结构不一致

**症状**: 开发环境和Docker环境数据库结构不同

**解决方案**:
```bash
# 重新生成Schema并重置两个环境
./scripts/generate-schema.sh
./scripts/reset-database.sh --both
```

## 📋 最佳实践

### 1. 定期同步
- 每次修改Prisma schema后立即重新生成init.sql
- 定期验证两个环境的数据库一致性

### 2. 版本控制
- 将生成的`init.sql`提交到版本控制
- 在提交信息中说明数据库结构变更

### 3. 备份策略
- 重置数据库前自动备份
- 保留重要的测试数据

### 4. 测试验证
- 每次数据库变更后测试两个环境
- 验证API功能正常

## 🔮 未来改进

1. **自动化CI/CD集成**
   - 在CI流程中自动生成和验证数据库Schema
   - 自动检测数据库结构变更

2. **数据迁移工具**
   - 开发数据迁移脚本
   - 支持生产环境的安全数据迁移

3. **监控和告警**
   - 监控数据库结构一致性
   - 异常时自动告警

---

**注意**: 这个新的数据库管理策略彻底解决了Prisma迁移状态异常的问题，确保开发环境和Docker环境使用完全一致的数据库结构。
