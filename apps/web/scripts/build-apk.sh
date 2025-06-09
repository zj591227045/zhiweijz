#!/bin/bash
# 生成Android APK文件

set -e

echo "📦 生成Android APK..."

# 1. 同步项目
echo "🔄 同步项目..."
npx cap sync android

# 2. 进入Android目录  
cd ../android

# 3. 清理并构建APK
echo "🏗️ 构建APK..."
./gradlew clean
./gradlew assembleDebug

# 4. 复制APK到web目录
echo "📁 复制APK文件..."
cp app/build/outputs/apk/debug/app-debug.apk ../web/app-debug.apk

echo "✅ APK生成完成！"
echo "📱 APK文件位置: app-debug.apk"
echo ""
echo "📋 安装APK到设备："
echo "adb install app-debug.apk" 