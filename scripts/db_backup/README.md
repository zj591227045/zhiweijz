# 数据库备份管理系统

一个功能完整的PostgreSQL数据库备份和恢复管理系统，支持多种备份模式和灵活的配置选项。

## 🚀 快速开始

### 1. 配置数据库连接

编辑 `config.conf` 文件，设置数据库连接参数：

```bash
# 数据库连接配置
DB_HOST=10.255.0.97
DB_PORT=5432
DB_NAME=zhiweijz
DB_USER=zhiweijz
DB_PASSWORD=zhiweijz123
```

### 2. 启动管理界面

```bash
./manager.sh
```

### 3. 或者直接使用命令行

```bash
# 完整备份
./backup.sh full

# 交互式恢复
./restore.sh interactive
```

## 📁 文件结构

```
db_backup/
├── config.conf          # 配置文件
├── config_loader.sh     # 配置加载器
├── db_utils.sh          # 数据库工具函数
├── backup.sh            # 备份脚本
├── restore.sh           # 恢复脚本
├── manager.sh           # 管理界面
├── backups/             # 备份文件目录
├── logs/                # 日志文件目录
└── README.md            # 使用文档
```

## ⚙️ 配置选项

### 数据库连接
- `DB_HOST`: 数据库服务器IP地址
- `DB_PORT`: 数据库端口
- `DB_NAME`: 数据库名称
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码

### 容器配置
- `PG_CONTAINER_IMAGE`: PostgreSQL客户端容器镜像
- `USE_DOCKER`: 是否使用Docker容器执行备份
- `DOCKER_NETWORK_MODE`: Docker网络模式（host/bridge/none）

### 备份配置
- `BACKUP_DIR`: 备份文件存储目录
- `BACKUP_PREFIX`: 备份文件名前缀
- `COMPRESS_BACKUP`: 是否压缩备份文件
- `BACKUP_RETENTION_DAYS`: 备份保留天数
- `BACKUP_FORMAT`: 备份格式（plain/custom/directory/tar）

### 备份类型
- `BACKUP_FULL_DATA`: 是否备份完整数据
- `BACKUP_SCHEMA_ONLY`: 是否备份表结构
- `BACKUP_DATA_ONLY`: 是否备份数据

### 恢复配置
- `RESTORE_MODE`: 恢复模式（full/schema/data/table）
- `CREATE_SAFETY_BACKUP`: 恢复前是否创建安全备份
- `CLEAN_TARGET_DB`: 恢复时是否清理目标数据库

## 🔧 使用方法

### 备份操作

#### 1. 完整备份（推荐）
```bash
./backup.sh full
```
备份完整的数据库结构和数据。

#### 2. 结构备份
```bash
./backup.sh schema
```
仅备份数据库表结构，不包含数据。

#### 3. 数据备份
```bash
./backup.sh data
```
仅备份数据，不包含表结构。

#### 4. 表备份
```bash
./backup.sh table users,orders,products
```
备份指定的表。

#### 5. 执行所有备份
```bash
./backup.sh all
```
根据配置执行所有启用的备份类型。

### 恢复操作

#### 1. 交互式恢复（推荐）
```bash
./restore.sh interactive
```
通过交互式界面选择备份文件和恢复选项。

#### 2. 完整恢复
```bash
./restore.sh full
```
从完整备份恢复整个数据库。

#### 3. 结构恢复
```bash
./restore.sh schema
```
仅恢复数据库表结构。

#### 4. 数据恢复
```bash
./restore.sh data
```
仅恢复数据。

#### 5. 表恢复
```bash
./restore.sh table backup_file.sql users,orders
```
恢复指定的表。

### 管理操作

#### 1. 查看备份列表
```bash
./restore.sh list
```

#### 2. 备份统计信息
```bash
./backup.sh stats
```

#### 3. 清理旧备份
```bash
./backup.sh cleanup
```

#### 4. 测试数据库连接
```bash
./db_utils.sh
```

## 🔍 备份文件格式

系统支持多种备份格式：

### 1. Plain格式（默认）
- 文件扩展名：`.sql`
- 特点：SQL文本格式，可读性好，支持压缩
- 适用：小到中型数据库

### 2. Custom格式
- 文件扩展名：`.dump`
- 特点：PostgreSQL自定义格式，支持并行恢复
- 适用：大型数据库，需要快速恢复

### 3. Directory格式
- 文件扩展名：`_dir`
- 特点：目录格式，每个表一个文件
- 适用：需要选择性恢复的场景

### 4. Tar格式
- 文件扩展名：`.tar`
- 特点：tar归档格式
- 适用：需要打包传输的场景

## 🛡️ 安全特性

### 1. 安全备份
恢复前自动创建当前数据库的安全备份，防止数据丢失。

### 2. 配置验证
启动时自动验证配置文件的正确性。

### 3. 连接测试
执行操作前测试数据库连接。

### 4. 日志记录
详细的操作日志，便于问题排查。

## 📊 监控和维护

### 1. 自动清理
根据配置自动清理过期的备份文件。

### 2. 备份统计
提供详细的备份统计信息。

### 3. 磁盘空间监控
显示备份目录的磁盘使用情况。

## 🚨 故障排除

### 1. 数据库连接失败
- 检查数据库服务是否运行
- 验证连接参数是否正确
- 确认网络连通性
- 检查用户权限

### 2. Docker相关问题
- 确认Docker服务正在运行
- 检查容器镜像是否可用
- 验证网络模式设置
- 查看Docker日志

### 3. 备份失败
- 检查磁盘空间是否充足
- 验证备份目录权限
- 查看详细错误日志
- 检查数据库锁定情况

### 4. 恢复失败
- 确认备份文件完整性
- 检查目标数据库权限
- 验证恢复模式设置
- 查看恢复日志

## 📝 最佳实践

### 1. 备份策略
- 每日执行完整备份
- 每周执行结构备份
- 重要操作前手动备份

### 2. 存储管理
- 定期清理旧备份
- 监控磁盘空间使用
- 考虑异地备份存储

### 3. 恢复测试
- 定期测试备份恢复
- 验证数据完整性
- 记录恢复时间

### 4. 安全考虑
- 保护配置文件安全
- 限制备份文件访问权限
- 使用强密码

## 🔄 自动化

### 1. 定时备份
使用cron设置定时备份：

```bash
# 每天凌晨2点执行完整备份
0 2 * * * /path/to/db_backup/backup.sh full

# 每周日凌晨3点清理旧备份
0 3 * * 0 /path/to/db_backup/backup.sh cleanup
```

### 2. 监控脚本
创建监控脚本检查备份状态：

```bash
#!/bin/bash
# 检查最近24小时是否有成功的备份
find /path/to/backups -name "*.sql*" -mtime -1 | grep -q . || echo "警告：24小时内无备份文件"
```

## 📞 支持

如有问题或建议，请查看：
1. 日志文件：`logs/backup.log`
2. 配置文件：`config.conf`
3. 错误信息和解决方案

---

**注意**：使用前请仔细阅读配置文件，确保所有参数设置正确。建议在生产环境使用前先在测试环境验证。
