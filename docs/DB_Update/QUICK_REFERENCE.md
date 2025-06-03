# 数据库架构更新快速参考指南

## 🚀 版本发布流程

### 1. 开发新功能时

```bash
# 1. 修改Prisma Schema
vim server/prisma/schema.prisma

# 2. 创建迁移文件
cd server
npx prisma migrate dev --name add_new_feature

# 3. 更新迁移管理器
vim server/scripts/migration/migration-manager.js
# 添加新的迁移定义
```

### 2. 发布新版本

```bash
# 自动化发布 (推荐)
./scripts/release-version.sh --minor

# 或手动发布
npm version minor
docker buildx build --platform linux/amd64,linux/arm64 \
  --file server/Dockerfile \
  --tag zj591227045/zhiweijz-backend:$(cat package.json | jq -r .version) \
  --push .
```

### 3. 用户升级

```bash
# 用户只需要
docker-compose pull
docker-compose up -d
# 数据库迁移自动执行！
```

## 📋 迁移管理器使用

### 添加新迁移

```javascript
// 在 server/scripts/migration/migration-manager.js 中添加
{
  version: '0.1.7',
  name: 'add_new_feature',
  description: '添加新功能',
  dependencies: ['0.1.6'],
  up: this.addNewFeature.bind(this),
  down: this.removeNewFeature.bind(this),
  validate: this.validateNewFeature.bind(this)
}
```

### 实现迁移方法

```javascript
async addNewFeature() {
  console.log('执行迁移: 添加新功能...');
  
  await this.prisma.$executeRaw`
    ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_field TYPE DEFAULT value
  `;
  
  console.log('✅ 新功能添加完成');
}

async removeNewFeature() {
  console.log('回滚迁移: 移除新功能...');
  
  await this.prisma.$executeRaw`
    ALTER TABLE table_name DROP COLUMN IF EXISTS new_field
  `;
  
  console.log('✅ 新功能回滚完成');
}

async validateNewFeature() {
  const result = await this.prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'table_name' AND column_name = 'new_field'
  `;
  return result.length > 0;
}
```

## 🔧 故障排除

### 迁移失败

```bash
# 查看日志
docker logs zhiweijz-backend

# 手动执行迁移
docker exec zhiweijz-backend node scripts/migration/migration-manager.js

# 检查迁移状态
docker exec zhiweijz-backend npx prisma migrate status
```

### 数据库状态检查

```bash
# 进入容器
docker exec -it zhiweijz-backend sh

# 检查表结构
npx prisma db execute --stdin <<< "SELECT * FROM information_schema.columns WHERE table_name = 'users';"

# 检查迁移历史
npx prisma db execute --stdin <<< "SELECT * FROM _migrations ORDER BY executed_at DESC;"
```

## 📊 版本对应关系

| 后端版本 | 数据库Schema | 主要功能 |
|---------|-------------|----------|
| 0.1.4   | 20250519    | 预算刷新日期 |
| 0.1.5   | 20250520    | 托管用户支持 |
| 0.1.6   | 20250521    | 账本增强功能 |
| 0.1.7   | 20250522    | 待开发... |

## 🛡️ 安全检查清单

### 发布前检查

- [ ] 所有测试通过
- [ ] 迁移文件幂等性验证
- [ ] 依赖关系正确
- [ ] 回滚方法可用
- [ ] 验证方法完整

### 发布后验证

- [ ] Docker镜像构建成功
- [ ] 容器启动正常
- [ ] 数据库迁移执行成功
- [ ] 关键功能正常工作
- [ ] 数据完整性验证

## 🔄 回滚流程

### 应用层回滚

```bash
# 回滚到上一版本
docker-compose down
sed -i 's/zhiweijz-backend:0.1.6/zhiweijz-backend:0.1.5/' docker-compose.yml
docker-compose up -d
```

### 数据库回滚

```bash
# 手动回滚迁移 (谨慎使用)
docker exec zhiweijz-backend node scripts/migration/migration-manager.js --rollback 0.1.6
```

## 📝 最佳实践

### 1. 迁移设计原则

- **幂等性**: 可重复执行
- **向后兼容**: 不破坏现有功能
- **原子性**: 要么全部成功，要么全部失败
- **可回滚**: 提供回滚方法

### 2. 版本管理

- **语义化版本**: 遵循 MAJOR.MINOR.PATCH
- **依赖管理**: 明确迁移依赖关系
- **文档更新**: 同步更新文档

### 3. 测试策略

- **单元测试**: 测试迁移逻辑
- **集成测试**: 测试完整流程
- **回滚测试**: 验证回滚功能

### 4. 监控告警

- **迁移时间**: 监控执行时间
- **成功率**: 监控迁移成功率
- **数据完整性**: 验证数据正确性

## 🚨 紧急处理

### 迁移卡住

```bash
# 1. 查看进程
docker exec zhiweijz-backend ps aux

# 2. 检查数据库连接
docker exec zhiweijz-backend npx prisma db execute --stdin <<< "SELECT 1;"

# 3. 重启容器
docker-compose restart backend
```

### 数据损坏

```bash
# 1. 停止服务
docker-compose down

# 2. 恢复备份 (如果有)
# 具体步骤依赖备份策略

# 3. 重新启动
docker-compose up -d
```

## 📞 支持联系

- **文档**: 查看 `docs/DATABASE_MIGRATION_STANDARDS.md`
- **日志**: 使用 `docker logs zhiweijz-backend`
- **调试**: 进入容器 `docker exec -it zhiweijz-backend sh`

---

**记住**: 数据库迁移是关键操作，务必在生产环境使用前充分测试！
