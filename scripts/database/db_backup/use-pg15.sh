#!/bin/bash

# 临时使用PostgreSQL 15执行备份
# 用途：解决版本不匹配问题

# 设置PostgreSQL 15的路径
export PATH="/opt/homebrew/Cellar/postgresql@15/15.13/bin:$PATH"

# 验证版本
echo "使用的pg_dump版本："
pg_dump --version

echo "使用的psql版本："
psql --version

# 执行备份脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/backup.sh" "$@" 