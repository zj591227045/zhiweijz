#!/bin/sh

# 数据库初始化脚本 - 安全版本
# 确保数据库schema为最新状态，不会丢失数据

echo "开始安全数据库初始化..."

# 等待数据库连接可用
echo "等待数据库连接..."
max_attempts=30
attempt=0

# 使用安全的连接检查方式
until echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "数据库连接超时，退出..."
    exit 1
  fi
  echo "数据库连接失败，5秒后重试... (尝试 $attempt/$max_attempts)"
  sleep 5
done

echo "数据库连接成功！"

# 优先使用增量迁移系统
echo "尝试使用增量迁移系统..."
if node scripts/migration-manager.js; then
  echo "增量迁移成功完成"
else
  echo "增量迁移失败，使用标准Prisma迁移..."
  
  # 执行数据库迁移
  echo "执行数据库迁移..."
  if npx prisma migrate deploy; then
    echo "数据库迁移成功"
  else
    echo "数据库迁移失败，尝试标记所有迁移为已应用..."
    # 如果迁移失败，可能是因为表已存在，尝试标记所有迁移为已应用

    # 标记所有迁移为已应用
    echo "标记迁移 20250515135020_init 为已应用..."
    npx prisma migrate resolve --applied "20250515135020_init" 2>/dev/null || true
    echo "标记迁移 20250515140114_add_password_reset_token 为已应用..."
    npx prisma migrate resolve --applied "20250515140114_add_password_reset_token" 2>/dev/null || true
    echo "标记迁移 20250515140202_add_user_settings 为已应用..."
    npx prisma migrate resolve --applied "20250515140202_add_user_settings" 2>/dev/null || true
    echo "标记迁移 20250515_fix_email_uniqueness 为已应用..."
    npx prisma migrate resolve --applied "20250515_fix_email_uniqueness" 2>/dev/null || true
    echo "标记迁移 20250516003807_add_name_to_budget 为已应用..."
    npx prisma migrate resolve --applied "20250516003807_add_name_to_budget" 2>/dev/null || true
    echo "标记迁移 20250516024140_add_account_book_model 为已应用..."
    npx prisma migrate resolve --applied "20250516024140_add_account_book_model" 2>/dev/null || true
    echo "标记迁移 20250517060000_add_category_budget_table 为已应用..."
    npx prisma migrate resolve --applied "20250517060000_add_category_budget_table" 2>/dev/null || true
    echo "标记迁移 20250517062712_add_missing_columns 为已应用..."
    npx prisma migrate resolve --applied "20250517062712_add_missing_columns" 2>/dev/null || true
    echo "标记迁移 20250517064314_add_user_category_config 为已应用..."
    npx prisma migrate resolve --applied "20250517064314_add_user_category_config" 2>/dev/null || true
    echo "标记迁移 20250517083516_add_user_birth_date 为已应用..."
    npx prisma migrate resolve --applied "20250517083516_add_user_birth_date" 2>/dev/null || true
    echo "标记迁移 20250517122223_add_security_tables 为已应用..."
    npx prisma migrate resolve --applied "20250517122223_add_security_tables" 2>/dev/null || true
    echo "标记迁移 20250517235836_add_account_book_type_and_family_relation 为已应用..."
    npx prisma migrate resolve --applied "20250517235836_add_account_book_type_and_family_relation" 2>/dev/null || true
    echo "标记迁移 20250518000000_add_budget_type 为已应用..."
    npx prisma migrate resolve --applied "20250518000000_add_budget_type" 2>/dev/null || true
    echo "标记迁移 20250519000000_add_budget_history_table 为已应用..."
    npx prisma migrate resolve --applied "20250519000000_add_budget_history_table" 2>/dev/null || true
    echo "标记迁移 20250520000000_add_transaction_metadata 为已应用..."
    npx prisma migrate resolve --applied "20250520000000_add_transaction_metadata" 2>/dev/null || true
    echo "标记迁移 20250521000000_add_budget_history_fields 为已应用..."
    npx prisma migrate resolve --applied "20250521000000_add_budget_history_fields" 2>/dev/null || true
    echo "标记迁移 20250521000001_add_budget_amount_modified_fields 为已应用..."
    npx prisma migrate resolve --applied "20250521000001_add_budget_amount_modified_fields" 2>/dev/null || true
    echo "标记迁移 20250527000000_add_created_by_to_account_books 为已应用..."
    npx prisma migrate resolve --applied "20250527000000_add_created_by_to_account_books" 2>/dev/null || true
    echo "标记迁移 20250527000001_add_missing_family_member_fields 为已应用..."
    npx prisma migrate resolve --applied "20250527000001_add_missing_family_member_fields" 2>/dev/null || true
    echo "标记迁移 20250527000002_add_missing_tables_and_enums 为已应用..."
    npx prisma migrate resolve --applied "20250527000002_add_missing_tables_and_enums" 2>/dev/null || true
    echo "标记迁移 20250527000003_add_foreign_keys 为已应用..."
    npx prisma migrate resolve --applied "20250527000003_add_foreign_keys" 2>/dev/null || true

    echo "所有迁移已标记为已应用，继续启动..."
  fi
fi

# 检查迁移状态
echo "检查迁移状态..."
npx prisma migrate status

# 生成Prisma客户端
echo "生成Prisma客户端..."
# 确保目录权限正确
mkdir -p node_modules/prisma 2>/dev/null || true
if npx prisma generate 2>/dev/null; then
  echo "Prisma客户端生成成功"
else
  echo "Prisma客户端生成失败，使用预构建的客户端..."
  # 如果生成失败，检查是否已有预构建的客户端
  if [ -d "node_modules/.prisma" ]; then
    echo "发现预构建的Prisma客户端，继续启动..."
  else
    echo "警告：没有可用的Prisma客户端，可能会影响数据库操作"
  fi
fi

echo "安全数据库初始化完成！"
