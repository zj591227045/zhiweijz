#!/bin/bash
# Android构建脚本

set -e

echo "🤖 开始构建Android应用..."

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

# 5. 检查并添加Android平台（如果不存在）
if [ ! -d "../android/app" ]; then
    echo "📱 添加Android平台..."
    npx cap add android
else
    echo "📱 Android平台已存在，跳过添加步骤"
fi

# 6. 同步到Capacitor Android项目
echo "📱 同步到Android项目..."
npx cap sync android

# 7. 打开Android Studio
echo "🚀 打开Android Studio..."
npx cap open android

echo "✅ Android构建完成！"
echo ""
echo "📋 后续操作："
echo "1. 在Android Studio中选择设备或模拟器"
echo "2. 点击Run按钮直接运行应用"
echo "3. 或使用Build > Build Bundle(s)/APK(s) > Build APK(s)生成APK文件" 