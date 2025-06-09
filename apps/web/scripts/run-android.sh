#!/bin/bash
# 直接运行Android应用

set -e

echo "🤖 运行Android应用..."

# 1. 构建和同步
echo "🔄 同步更新..."
npx cap sync android

# 2. 运行应用
echo "🚀 启动应用..."
npx cap run android

echo "✅ Android应用运行完成！" 