#!/bin/bash

# 批量标记所有迁移为已应用
# 用于修复迁移状态不一致的问题

set -e

echo "🔧 开始批量标记迁移为已应用..."

# 所有需要标记的迁移
migrations=(
    "20250515140114_add_password_reset_token"
    "20250515140202_add_user_settings"
    "20250515_fix_email_uniqueness"
    "20250516003807_add_name_to_budget"
    "20250516024140_add_account_book_model"
    "20250517060000_add_category_budget_table"
    "20250517062712_add_missing_columns"
    "20250517064314_add_user_category_config"
    "20250517083516_add_user_birth_date"
    "20250517122223_add_security_tables"
    "20250517235836_add_account_book_type_and_family_relation"
    "20250518000000_add_budget_type"
    "20250519000000_add_budget_history_table"
    "20250520000000_add_transaction_metadata"
    "20250521000000_add_budget_history_fields"
    "20250521000001_add_budget_amount_modified_fields"
    "20250527000000_add_created_by_to_account_books"
    "20250527000001_add_missing_family_member_fields"
    "20250527000002_add_missing_tables_and_enums"
    "20250527000003_add_foreign_keys"
    "20250527000004_add_is_custodial_to_users"
)

# 逐个标记迁移
for migration in "${migrations[@]}"; do
    echo "📝 标记迁移: $migration"
    if npx prisma migrate resolve --applied "$migration" 2>/dev/null; then
        echo "✅ 成功标记: $migration"
    else
        echo "⚠️  标记失败或已存在: $migration"
    fi
done

echo "🎉 批量标记完成！"

# 检查最终状态
echo "📊 检查迁移状态..."
npx prisma migrate status
