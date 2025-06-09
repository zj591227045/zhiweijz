#!/bin/bash
# 清理Android构建文件

set -e

echo "🧹 清理Android构建文件..."

# 1. 清理Gradle缓存
if [ -d "../android/.gradle" ]; then
    echo "🗑️ 删除Gradle缓存..."
    rm -rf ../android/.gradle
fi

# 2. 清理构建目录
if [ -d "../android/build" ]; then
    echo "🗑️ 删除根构建目录..."
    rm -rf ../android/build
fi

if [ -d "../android/app/build" ]; then
    echo "🗑️ 删除app构建目录..."
    rm -rf ../android/app/build
fi

# 3. 清理本地配置文件
if [ -f "../android/local.properties" ]; then
    echo "🗑️ 删除本地配置文件..."
    rm ../android/local.properties
fi

# 4. 清理APK文件
if [ -f "app-debug.apk" ]; then
    echo "🗑️ 删除APK文件..."
    rm app-debug.apk
fi

# 5. 清理capacitor生成的文件
if [ -d "../android/capacitor-cordova-android-plugins" ]; then
    echo "🗑️ 删除Capacitor插件缓存..."
    rm -rf ../android/capacitor-cordova-android-plugins
fi

echo "✅ Android清理完成！"
echo ""
echo "📋 下次构建时这些文件会自动重新生成" 