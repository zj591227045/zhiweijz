#!/bin/bash
# iOS构建脚本

set -e

echo "🍎 开始构建iOS应用..."

# 1. 备份原配置
echo "📦 备份原始配置..."
cp next.config.js next.config.js.backup

# 2. 使用Capacitor配置构建Next.js应用
echo "🔧 应用Capacitor配置..."
cp next.config.capacitor.js next.config.js

# 3. 构建静态文件
echo "🏗️ 构建静态文件..."
NEXT_BUILD_MODE=export npm run build

# 4. 恢复原配置
echo "🔄 恢复原始配置..."
cp next.config.js.backup next.config.js

# 5. 同步到Capacitor
echo "📱 同步到iOS项目..."
npx cap sync ios

# 6. 打开Xcode
echo "🚀 打开Xcode..."
npx cap open ios

echo "✅ iOS构建完成！" 