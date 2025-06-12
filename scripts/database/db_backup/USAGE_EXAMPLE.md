# 数据库备份工具使用示例

## 快速开始

### 1. 初始化配置

```bash
# 进入备份工具目录
cd scripts/database/db_backup

# 运行设置脚本
./setup.sh
```

### 2. 编辑配置文件

```bash
# 编辑配置文件
nano config.env
```

修改以下关键配置项：

```bash
# 数据库连接配置
DB_HOST=10.255.0.97          # 你的数据库服务器地址
DB_PORT=5432                 # 数据库端口
DB_NAME=zhiweijz            # 数据库名称
DB_USER=zhiweijz            # 数据库用户名
DB_PASSWORD=your_password   # 数据库密码

# 备份配置
USE_DOCKER=true             # 使用Docker执行备份
BACKUP_DIR=./backups        # 备份文件存储目录
COMPRESS_BACKUP=true        # 压缩备份文件
BACKUP_RETENTION_DAYS=30    # 备份保留天数
```

### 3. 测试数据库连接

```bash
./test_connection.sh
```

### 4. 执行备份

```bash
# 完整备份
./backup.sh full

# 仅备份表结构
./backup.sh schema

# 仅备份数据
./backup.sh data

# 备份指定表
./backup.sh table users,orders,products

# 执行所有启用的备份类型
./backup.sh all
```

### 5. 查看备份统计

```bash
./backup.sh stats
```

### 6. 恢复数据

```bash
# 交互式恢复（推荐）
./restore.sh interactive

# 完整恢复
./restore.sh full

# 查看备份列表
./restore.sh list
```

## 配置文件安全性

- `config.env` 文件包含敏感信息（如数据库密码）
- 该文件已被添加到 `.gitignore`，不会被提交到版本控制
- 每个环境需要单独配置此文件
- 模板文件 `config.conf.template` 可以安全地提交到版本控制

## 常见问题

### Q: 如何重新创建配置文件？

```bash
# 删除现有配置文件
rm config.env

# 重新运行设置脚本
./setup.sh
```

### Q: 如何查看当前配置？

```bash
# 直接运行配置加载器
./config_loader.sh
```

### Q: 如何在不同环境间切换配置？

```bash
# 为不同环境创建不同的配置文件
cp config.env config.env.production
cp config.env config.env.development

# 使用时复制对应的配置文件
cp config.env.production config.env
```

### Q: 配置文件丢失了怎么办？

```bash
# 从模板重新创建
cp config.conf.template config.env

# 然后编辑配置文件
nano config.env
```

## 自动化脚本示例

### 定时备份脚本

```bash
#!/bin/bash
# 文件名: daily_backup.sh

cd /path/to/scripts/database/db_backup

# 执行完整备份
./backup.sh full

# 清理旧备份
./backup.sh cleanup

# 发送通知（可选）
if [ $? -eq 0 ]; then
    echo "备份成功完成" | mail -s "数据库备份成功" admin@example.com
else
    echo "备份失败" | mail -s "数据库备份失败" admin@example.com
fi
```

### 添加到crontab

```bash
# 编辑crontab
crontab -e

# 添加每日凌晨2点执行备份
0 2 * * * /path/to/daily_backup.sh
```

## 多环境配置管理

### 环境配置文件命名规范

```
config.env.local        # 本地开发环境
config.env.development  # 开发环境
config.env.staging      # 测试环境
config.env.production   # 生产环境
```

### 环境切换脚本

```bash
#!/bin/bash
# 文件名: switch_env.sh

ENV=$1

if [ -z "$ENV" ]; then
    echo "用法: $0 {local|development|staging|production}"
    exit 1
fi

CONFIG_FILE="config.env.$ENV"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "配置文件不存在: $CONFIG_FILE"
    exit 1
fi

cp "$CONFIG_FILE" config.env
echo "已切换到 $ENV 环境"
```

使用方法：

```bash
# 切换到生产环境
./switch_env.sh production

# 切换到开发环境
./switch_env.sh development
``` 