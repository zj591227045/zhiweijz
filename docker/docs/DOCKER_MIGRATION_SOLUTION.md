# Docker镜像分发时的数据库迁移解决方案

## 问题描述

在Docker镜像公开分发时，用户启动容器后可能遇到数据库架构不匹配的问题，导致应用无法正常运行。

## 解决方案

### 1. 自动化数据库迁移

修改了 `server/scripts/start.sh` 启动脚本，内置完整的数据库迁移逻辑：

- **自动检测数据库状态**：区分全新数据库和现有数据库
- **智能迁移策略**：优先使用Prisma迁移，失败时自动降级到强制同步
- **关键字段保障**：确保所有关键字段都存在
- **连接重试机制**：等待数据库完全启动后再执行迁移

### 2. 增强的Docker镜像

更新了 `server/Dockerfile`：

- **添加PostgreSQL客户端**：支持数据库操作和备份
- **完整脚本复制**：确保所有迁移脚本都包含在镜像中
- **权限设置**：正确设置脚本执行权限

### 3. 构建和分发流程

#### 构建新版本镜像

```bash
# 构建包含修复的新版本
cd docker
./scripts/build-and-push.sh --backend-version 0.1.6

# 或仅构建后端
./scripts/build-and-push.sh --backend-only --backend-version 0.1.6
```

#### 更新docker-compose.yml

```yaml
services:
  backend:
    image: zj591227045/zhiweijz-backend:0.1.6  # 使用新版本
```

### 4. 用户使用流程

用户获取Docker镜像后，只需要：

```bash
# 1. 下载配置文件
git clone https://github.com/your-repo/zhiweijz.git
cd zhiweijz/docker

# 2. 启动服务（自动处理数据库迁移）
docker-compose up -d

# 3. 查看启动日志（可选）
docker-compose logs -f backend
```

### 5. 迁移过程说明

启动时的自动迁移过程：

1. **等待数据库连接**：最多等待60秒
2. **检测数据库状态**：判断是否为全新安装
3. **执行迁移**：
   - 全新数据库：执行完整初始化
   - 现有数据库：执行增量迁移
4. **字段补全**：确保所有关键字段存在
5. **生成客户端**：更新Prisma客户端
6. **启动应用**：开始提供服务

### 6. 故障恢复

如果自动迁移失败，用户可以：

```bash
# 查看详细日志
docker-compose logs backend

# 手动执行迁移（如果需要）
docker exec zhiweijz-backend npx prisma migrate deploy

# 重启服务
docker-compose restart backend
```

### 7. 版本兼容性

- **向前兼容**：新版本镜像可以处理旧版本数据库
- **数据安全**：迁移过程不会丢失现有数据
- **回滚支持**：可以回退到之前的镜像版本

## 技术细节

### 关键修改

1. **启动脚本优化** (`server/scripts/start.sh`)：
   - 移除对外部脚本的依赖
   - 内置完整迁移逻辑
   - 增加错误处理和重试机制

2. **Dockerfile增强** (`server/Dockerfile`)：
   - 添加PostgreSQL客户端工具
   - 确保脚本权限正确设置

3. **构建脚本** (`docker/scripts/build-and-push.sh`)：
   - 支持多平台构建
   - 自动更新版本号
   - 验证关键文件存在

### 数据库字段检查

自动确保以下关键字段存在：
- `users.is_custodial` - 托管用户标识
- `budgets.refresh_day` - 预算刷新日期
- `account_books.created_by` - 账本创建者
- `account_books.user_llm_setting_id` - LLM设置关联
- `budgets.family_member_id` - 家庭成员关联

## 使用建议

1. **定期更新**：建议用户定期拉取最新镜像
2. **备份数据**：重要数据建议定期备份
3. **监控日志**：关注启动日志，确保迁移成功
4. **测试环境**：生产环境使用前建议先在测试环境验证

## 总结

通过这套解决方案，Docker镜像分发时的数据库迁移问题得到了彻底解决：

- ✅ **自动化**：无需手动干预
- ✅ **安全性**：不会丢失现有数据  
- ✅ **兼容性**：支持新旧版本数据库
- ✅ **可靠性**：多重保障机制
- ✅ **易用性**：用户体验友好
