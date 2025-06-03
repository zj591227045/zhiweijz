# Scripts 目录重构迁移指南

## 📋 路径变更映射

### 旧路径 → 新路径

| 旧路径 | 新路径 | 分类 |
|--------|--------|------|
| `scripts/start.sh` | `scripts/deployment/start.sh` | 部署 |
| `scripts/init-database.sh` | `scripts/migration/init-database.sh` | 迁移 |
| `scripts/migration-manager.js` | `scripts/migration/migration-manager.js` | 迁移 |
| `scripts/version-conflict-resolver.js` | `scripts/migration/version-conflict-resolver.js` | 迁移 |
| `scripts/docker-safe-migrate.sh` | `scripts/migration/docker-safe-migrate.sh` | 迁移 |
| `scripts/validate-migration.js` | `scripts/migration/validate-migration.js` | 迁移 |
| `scripts/verify-database-sync.js` | `scripts/migration/verify-database-sync.js` | 迁移 |
| `scripts/fix-migration-state.js` | `scripts/migration/fix-migration-state.js` | 迁移 |
| `scripts/mark-all-migrations.sh` | `scripts/migration/mark-all-migrations.sh` | 迁移 |
| `scripts/migrate-custodial-members.ts` | `scripts/migration/migrate-custodial-members.ts` | 迁移 |
| `scripts/migrate-refresh-day.sh` | `scripts/migration/migrate-refresh-day.sh` | 迁移 |
| `scripts/check-db.js` | `scripts/database/check-db.js` | 数据库 |
| `scripts/create-default-account-book.js` | `scripts/database/create-default-account-book.js` | 数据库 |
| `scripts/create-test-data.js` | `scripts/database/create-test-data.js` | 数据库 |
| `scripts/generate-token.js` | `scripts/database/generate-token.js` | 数据库 |
| `scripts/test-budget-auto-continuation.ts` | `scripts/testing/test-budget-auto-continuation.ts` | 测试 |
| `scripts/test-budget-date-utils.ts` | `scripts/testing/test-budget-date-utils.ts` | 测试 |
| `scripts/test-category-logic.ts` | `scripts/testing/test-category-logic.ts` | 测试 |
| `scripts/add-default-budget.ts` | `scripts/utilities/add-default-budget.ts` | 工具 |
| `scripts/budget-scheduler.ts` | `scripts/utilities/budget-scheduler.ts` | 工具 |
| `scripts/cleanup-user-category-configs.ts` | `scripts/utilities/cleanup-user-category-configs.ts` | 工具 |
| `scripts/create-budget-for-user.ts` | `scripts/utilities/create-budget-for-user.ts` | 工具 |
| `scripts/create-personal-budget.ts` | `scripts/utilities/create-personal-budget.ts` | 工具 |
| `scripts/initialize-user-settings.ts` | `scripts/utilities/initialize-user-settings.ts` | 工具 |

## 🔄 已更新的引用文件

### 1. Docker相关文件

- ✅ `server/Dockerfile`
  - 更新了权限设置路径
  - 更新了启动命令路径

- ✅ `docker/scripts/build-and-push.sh`
  - 更新了文件存在性检查路径

### 2. 启动脚本

- ✅ `server/scripts/deployment/start.sh`
  - 更新了版本冲突解决器路径
  - 更新了数据库初始化脚本路径

## 🚨 需要手动更新的引用

### 1. 文档中的路径引用

检查以下文档是否需要更新路径：
- `docs/DATABASE_MIGRATION_STANDARDS.md`
- `docs/VERSION_CONFLICT_RESOLUTION.md`
- `docs/QUICK_REFERENCE.md`

### 2. 其他脚本中的引用

如果有其他脚本调用了移动的脚本，需要更新路径：

```bash
# 搜索可能的引用
grep -r "scripts/" . --include="*.sh" --include="*.js" --include="*.ts" --include="*.md"
```

### 3. CI/CD 配置

如果有CI/CD配置文件引用了这些脚本，需要更新：
- `.github/workflows/`
- `Makefile`
- 其他自动化脚本

## 📝 使用新路径的示例

### 运行迁移管理器

```bash
# 旧方式
node scripts/migration-manager.js

# 新方式
node scripts/migration/migration-manager.js
```

### 运行版本冲突解决器

```bash
# 旧方式
node scripts/version-conflict-resolver.js

# 新方式
node scripts/migration/version-conflict-resolver.js
```

### 运行数据库检查

```bash
# 旧方式
node scripts/check-db.js

# 新方式
node scripts/database/check-db.js
```

### 运行测试脚本

```bash
# 旧方式
npx ts-node scripts/test-budget-auto-continuation.ts

# 新方式
npx ts-node scripts/testing/test-budget-auto-continuation.ts
```

## 🔧 验证迁移

### 1. 检查Docker构建

```bash
# 验证Docker构建是否正常
docker build -f server/Dockerfile -t test-backend .
```

### 2. 检查脚本权限

```bash
# 检查脚本权限
find server/scripts -name "*.sh" -exec ls -la {} \;
```

### 3. 验证路径引用

```bash
# 在项目根目录运行
grep -r "scripts/" . --include="*.sh" --include="*.js" --include="*.ts" | grep -v node_modules | grep -v ".git"
```

## 📚 相关文档

- [Scripts目录结构说明](README.md)
- [数据库迁移规范](../../docs/DATABASE_MIGRATION_STANDARDS.md)
- [版本冲突解决方案](../../docs/VERSION_CONFLICT_RESOLUTION.md)

## ✅ 迁移完成检查清单

- [x] 创建新的目录结构
- [x] 移动所有脚本文件到对应目录
- [x] 更新Dockerfile中的路径引用
- [x] 更新启动脚本中的路径引用
- [x] 更新构建脚本中的路径检查
- [x] 创建README文档说明新结构
- [x] 创建迁移指南文档
- [ ] 验证Docker构建正常
- [ ] 验证所有脚本可正常执行
- [ ] 更新相关文档中的路径引用

## 🎯 后续维护

1. **新增脚本时**，请按照新的目录结构放置到对应分类目录
2. **引用脚本时**，使用新的路径格式
3. **更新文档时**，确保路径引用正确
4. **定期检查**，确保没有遗漏的旧路径引用
