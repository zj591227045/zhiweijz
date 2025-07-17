# Scripts 目录结构

本目录包含只为记账项目的各种脚本，按用途分类组织。

## 📁 目录结构

```
server/scripts/
├── database/           # 数据库操作脚本
├── migration/          # 数据库迁移脚本
├── deployment/         # 部署相关脚本
├── testing/           # 测试脚本
├── utilities/         # 工具脚本
└── README.md          # 本文件
```

## 🗄️ database/ - 数据库操作脚本

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `check-db.js` | 检查数据库连接和状态 | `node database/check-db.js` |
| `create-default-account-book.js` | 创建默认账本 | `node database/create-default-account-book.js` |
| `create-test-data.js` | 创建测试数据 | `node database/create-test-data.js` |
| `generate-token.js` | 生成JWT令牌 | `node database/generate-token.js` |

## 🔄 migration/ - 数据库迁移脚本

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `docker-safe-migrate.sh` | Docker环境安全迁移 | `./migration/docker-safe-migrate.sh` |
| `init-database.sh` | 数据库初始化 | `./migration/init-database.sh` |
| `migration-manager.js` | 迁移管理器 | `node migrations/migration-manager.js` |
| `version-conflict-resolver.js` | 版本冲突解决器 | `node migration/version-conflict-resolver.js` |
| `validate-migration.js` | 验证迁移结果 | `node migration/validate-migration.js` |
| `verify-database-sync.js` | 验证数据库同步 | `node migration/verify-database-sync.js` |
| `fix-migration-state.js` | 修复迁移状态 | `node migration/fix-migration-state.js` |
| `mark-all-migrations.sh` | 标记所有迁移为已应用 | `./migration/mark-all-migrations.sh` |
| `migrate-custodial-members.ts` | 迁移托管成员 | `npx ts-node migration/migrate-custodial-members.ts` |
| `migrate-refresh-day.sh` | 迁移预算刷新日期 | `./migration/migrate-refresh-day.sh` |

## 🚀 deployment/ - 部署相关脚本

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `start.sh` | 应用启动脚本 | `./deployment/start.sh` |

## 🧪 testing/ - 测试脚本

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `test-budget-auto-continuation.ts` | 测试预算自动延续 | `npx ts-node testing/test-budget-auto-continuation.ts` |
| `test-budget-date-utils.ts` | 测试预算日期工具 | `npx ts-node testing/test-budget-date-utils.ts` |
| `test-category-logic.ts` | 测试分类逻辑 | `npx ts-node testing/test-category-logic.ts` |

## 🛠️ utilities/ - 工具脚本

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `add-default-budget.ts` | 添加默认预算 | `npx ts-node utilities/add-default-budget.ts` |
| `budget-scheduler.ts` | 预算调度器 | `npx ts-node utilities/budget-scheduler.ts` |
| `cleanup-user-category-configs.ts` | 清理用户分类配置 | `npx ts-node utilities/cleanup-user-category-configs.ts` |
| `create-budget-for-user.ts` | 为用户创建预算 | `npx ts-node utilities/create-budget-for-user.ts` |
| `create-personal-budget.ts` | 创建个人预算 | `npx ts-node utilities/create-personal-budget.ts` |
| `initialize-user-settings.ts` | 初始化用户设置 | `npx ts-node utilities/initialize-user-settings.ts` |

## 🔧 常用操作

### 数据库相关

```bash
# 检查数据库状态
node database/check-db.js

# 创建测试数据
node database/create-test-data.js

# 生成JWT令牌
node database/generate-token.js
```

### 迁移相关

```bash
# 运行迁移管理器
node migrations/migration-manager.js

# 解决版本冲突
node migration/version-conflict-resolver.js

# 验证迁移结果
node migration/validate-migration.js
```

### 测试相关

```bash
# 运行所有测试脚本
npx ts-node testing/test-budget-auto-continuation.ts
npx ts-node testing/test-budget-date-utils.ts
npx ts-node testing/test-category-logic.ts
```

### 工具相关

```bash
# 初始化用户设置
npx ts-node utilities/initialize-user-settings.ts

# 清理用户分类配置
npx ts-node utilities/cleanup-user-category-configs.ts

# 创建预算
npx ts-node utilities/create-budget-for-user.ts
```

## 📝 注意事项

1. **权限设置**: 确保shell脚本有执行权限
   ```bash
   chmod +x migration/*.sh
   chmod +x deployment/*.sh
   ```

2. **环境变量**: 运行前确保设置了正确的环境变量
   ```bash
   export DATABASE_URL="your_database_url"
   export JWT_SECRET="your_jwt_secret"
   ```

3. **依赖检查**: TypeScript脚本需要安装相关依赖
   ```bash
   npm install
   ```

4. **执行顺序**: 某些脚本有依赖关系，请按正确顺序执行

## 🔗 相关文档

- [数据库迁移规范](../../docs/DATABASE_MIGRATION_STANDARDS.md)
- [版本冲突解决方案](../../docs/VERSION_CONFLICT_RESOLUTION.md)
- [快速参考指南](../../docs/QUICK_REFERENCE.md)
