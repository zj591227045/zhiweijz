#!/bin/bash

# 升级到版本1.8.1脚本
# 主要功能：强制更新智能记账和图片分析提示词

set -e

echo "🚀 开始升级到版本1.8.1..."
echo "📝 此版本将强制更新智能记账和图片分析提示词"

# 检查当前目录
if [ ! -f "migrations/migration-manager.js" ]; then
    echo "❌ 错误: 请在server目录下运行此脚本"
    exit 1
fi

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查迁移文件是否存在
MIGRATION_FILE="migrations/incremental/update-smart-accounting-prompts-v1.8.1.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ 错误: 迁移文件不存在: $MIGRATION_FILE"
    exit 1
fi

echo "✅ 环境检查通过"

# 显示当前版本
echo "🔍 检查当前数据库版本..."
CURRENT_VERSION=$(node migrations/migration-manager.js version 2>/dev/null || echo "未知")
echo "当前版本: $CURRENT_VERSION"

# 询问用户确认
echo ""
echo "⚠️  重要提醒:"
echo "   - 此次更新将强制覆盖现有的智能记账提示词配置"
echo "   - 用户之前的自定义提示词将被替换为最新版本"
echo "   - 建议在生产环境执行前先备份数据库"
echo ""

read -p "是否继续执行升级? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 用户取消升级"
    exit 1
fi

# 执行迁移
echo "🔄 执行数据库迁移..."
if node migrations/migration-manager.js migrate 1.8.1; then
    echo "✅ 迁移执行成功"
else
    echo "❌ 迁移执行失败"
    exit 1
fi

# 验证迁移结果
echo "🔍 验证迁移结果..."
NEW_VERSION=$(node migrations/migration-manager.js version 2>/dev/null || echo "未知")
echo "新版本: $NEW_VERSION"

if [ "$NEW_VERSION" = "1.8.1" ]; then
    echo "✅ 版本升级成功"
else
    echo "⚠️  版本可能未正确更新，当前版本: $NEW_VERSION"
fi

# 可选：运行测试脚本
if [ -f "scripts/test-migration-v1.8.1.js" ]; then
    echo ""
    read -p "是否运行迁移测试脚本? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧪 运行迁移测试..."
        if node scripts/test-migration-v1.8.1.js; then
            echo "✅ 测试通过"
        else
            echo "⚠️  测试失败，但迁移可能已成功"
        fi
    fi
fi

echo ""
echo "🎉 升级到版本1.8.1完成！"
echo ""
echo "📋 后续步骤:"
echo "   1. 重启应用服务以确保配置生效"
echo "   2. 在管理后台验证提示词是否已更新"
echo "   3. 测试智能记账和图片分析功能"
echo ""
echo "📚 详细文档: docs/migration-v1.8.1-prompts-update.md"
