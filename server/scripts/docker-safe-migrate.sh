#!/bin/bash

# Docker安全迁移脚本
# 确保Docker环境中的数据库迁移安全执行，防止数据丢失

set -e  # 遇到错误立即退出

echo "🔒 Docker安全迁移脚本启动"
echo "================================"

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    exit 1
fi

echo "📊 检查数据库连接..."
npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 错误: 无法连接到数据库"
    exit 1
fi
echo "✅ 数据库连接正常"

# 检查是否为全新数据库
echo "🔍 检查数据库状态..."
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'users';" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

if [ "$USER_COUNT" = "0" ]; then
    echo "📦 检测到全新数据库，执行初始化迁移..."
    npx prisma migrate deploy
    echo "✅ 初始化迁移完成"
else
    echo "🔄 检测到现有数据库，执行安全迁移..."
    
    # 检查迁移状态
    echo "📋 检查迁移状态..."
    npx prisma migrate status
    
    # 检查是否有待应用的迁移
    MIGRATION_STATUS=$(npx prisma migrate status 2>&1)
    
    if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
        echo "✅ 数据库已是最新状态，无需迁移"
    elif echo "$MIGRATION_STATUS" | grep -q "following migration"; then
        echo "⚠️  发现待应用的迁移，开始安全迁移..."
        
        # 创建数据备份（如果可能）
        echo "💾 尝试创建数据备份..."
        BACKUP_FILE="/tmp/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || echo "⚠️  无法创建备份，继续迁移..."
        
        # 执行迁移
        echo "🚀 执行数据库迁移..."
        npx prisma migrate deploy
        
        echo "✅ 迁移完成"
        
        # 验证迁移结果
        echo "🔍 验证迁移结果..."
        npx prisma migrate status
        
    else
        echo "❌ 迁移状态异常，请手动检查"
        echo "$MIGRATION_STATUS"
        exit 1
    fi
fi

# 验证关键表结构
echo "🔍 验证关键表结构..."

# 检查users表的is_custodial字段
CUSTODIAL_FIELD=$(npx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_custodial';" 2>/dev/null | grep -c "is_custodial" || echo "0")

if [ "$CUSTODIAL_FIELD" = "0" ]; then
    echo "❌ 错误: users表缺少is_custodial字段"
    exit 1
fi

echo "✅ 关键表结构验证通过"

# 生成Prisma客户端
echo "🔧 生成Prisma客户端..."
npx prisma generate

echo "🎉 Docker安全迁移完成！"
echo "================================"
