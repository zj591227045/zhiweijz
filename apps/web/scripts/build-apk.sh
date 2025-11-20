#!/bin/bash
# 生成Android APK文件

set -e

echo "📦 生成Android APK..."

# 确保在正确的目录运行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "📂 工作目录: $(pwd)"

# 设置备份目录（提前定义）
BACKUP_DIR="/tmp/apk-build-backup-$$"
mkdir -p "$BACKUP_DIR"

# 1. 设置调试版本环境变量
echo "🔧 设置调试版本环境变量..."
export BUILD_TYPE=debug
export IS_DEBUG_BUILD=true
export NEXT_PUBLIC_BUILD_TYPE=debug
export NEXT_PUBLIC_IS_DEBUG_BUILD=true

# 1.1. 临时移动admin和所有debug相关目录
echo "📁 临时移动admin和debug相关目录..."
mkdir -p /tmp/zhiweijz-excluded-dirs-apk
if [ -d "src/app/admin" ]; then
    mv src/app/admin /tmp/zhiweijz-excluded-dirs-apk/
    echo "✅ admin目录已移动"
fi

# 移动所有debug相关目录
for debug_dir in src/app/*debug*; do
    if [ -d "$debug_dir" ]; then
        dir_name=$(basename "$debug_dir")
        mv "$debug_dir" "/tmp/zhiweijz-excluded-dirs-apk/"
        echo "✅ $dir_name 目录已移动"
    fi
done

# 1.2. 重新构建前端（使用调试版本配置）
echo "🏗️ 重新构建前端（调试版本配置）..."
echo "   - 排除admin管理页面和debug页面"
if BUILD_MODE=mobile NEXT_PUBLIC_IS_MOBILE=true IS_MOBILE_BUILD=true NEXT_PUBLIC_BUILD_TYPE=debug NEXT_PUBLIC_IS_DEBUG_BUILD=true npm run build:mobile; then
    echo "✅ 调试版本前端构建成功"
else
    echo "❌ 调试版本前端构建失败"
    # 恢复目录
    if [ -d "/tmp/zhiweijz-excluded-dirs-apk/admin" ]; then
        mv /tmp/zhiweijz-excluded-dirs-apk/admin src/app/
    fi
    for excluded_dir in /tmp/zhiweijz-excluded-dirs-apk/*debug*; do
        if [ -d "$excluded_dir" ]; then
            dir_name=$(basename "$excluded_dir")
            mv "$excluded_dir" "src/app/"
        fi
    done
    exit 1
fi

# 1.3. 恢复admin和所有debug相关目录
echo "🔄 恢复admin和debug相关目录..."
if [ -d "/tmp/zhiweijz-excluded-dirs-apk/admin" ]; then
    mv /tmp/zhiweijz-excluded-dirs-apk/admin src/app/
    echo "✅ admin目录已恢复"
fi

# 恢复所有debug相关目录
for excluded_dir in /tmp/zhiweijz-excluded-dirs-apk/*debug*; do
    if [ -d "$excluded_dir" ]; then
        dir_name=$(basename "$excluded_dir")
        mv "$excluded_dir" "src/app/"
        echo "✅ $dir_name 目录已恢复"
    fi
done

# 2. 同步项目
echo "🔄 同步项目..."
npx cap sync android

# 3. 进入Android目录
cd ../android

# 3.1 修复所有 Capacitor 插件的 Java 版本兼容性问题
echo "🔧 修复 Java 版本兼容性..."

# 修复 capacitor-android 核心库
CAPACITOR_CORE_BUILD="../../node_modules/@capacitor/android/capacitor/build.gradle"
if [ -f "$CAPACITOR_CORE_BUILD" ]; then
    sed -i.tmp 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' "$CAPACITOR_CORE_BUILD"
    rm -f "$CAPACITOR_CORE_BUILD.tmp"
    echo "✅ Capacitor 核心库已修复"
fi

# 修复所有 Capacitor 插件
for plugin_build in ../../node_modules/@capacitor/*/android/build.gradle; do
    if [ -f "$plugin_build" ]; then
        sed -i.tmp 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' "$plugin_build"
        rm -f "$plugin_build.tmp"
    fi
done
echo "✅ Capacitor 插件已修复"

# 3.2 修复RevenueCat插件的Kotlin版本问题
echo "🔧 修复RevenueCat插件Kotlin版本..."
REVENUECAT_BUILD_FILE="../../node_modules/@revenuecat/purchases-capacitor/android/build.gradle"
if [ -f "$REVENUECAT_BUILD_FILE" ]; then
    # 备份原文件
    cp "$REVENUECAT_BUILD_FILE" "$BACKUP_DIR/revenuecat.build.gradle.backup"
    # 修改Kotlin版本和JVM target
    sed -i.tmp 's/org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.20/org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.10/' "$REVENUECAT_BUILD_FILE"
    sed -i.tmp 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' "$REVENUECAT_BUILD_FILE"
    rm -f "$REVENUECAT_BUILD_FILE.tmp"
    echo "✅ RevenueCat插件配置已修复"
fi

# 4. 备份原始配置文件
echo "💾 备份原始配置..."
if [ -f "app/src/main/res/values/strings.xml" ]; then
    cp app/src/main/res/values/strings.xml "$BACKUP_DIR/strings.xml.backup"
fi
if [ -f "app/build.gradle" ]; then
    cp app/build.gradle "$BACKUP_DIR/build.gradle.backup"
fi
if [ -f "build.gradle" ]; then
    cp build.gradle "$BACKUP_DIR/root.build.gradle.backup"
fi
if [ -f "gradle.properties" ]; then
    cp gradle.properties "$BACKUP_DIR/gradle.properties.backup"
fi

# 5. 修改应用名称为调试版本
echo "🔧 设置调试版本应用名称..."
sed -i.tmp 's/<string name="app_name">只为记账<\/string>/<string name="app_name">只为记账-dev<\/string>/' app/src/main/res/values/strings.xml
sed -i.tmp 's/<string name="title_activity_main">只为记账<\/string>/<string name="title_activity_main">只为记账-dev<\/string>/' app/src/main/res/values/strings.xml
rm -f app/src/main/res/values/strings.xml.tmp

# 6. 修改包名为调试版本（只修改applicationId，保持namespace不变）
echo "🔧 设置调试版本包名..."
sed -i.tmp 's/applicationId "cn.jacksonz.pwa.twa.zhiweijz"/applicationId "cn.jacksonz.pwa.twa.zhiweijz.debug"/' app/build.gradle
rm -f app/build.gradle.tmp

# 7. 修改strings.xml中的包名引用
sed -i.tmp 's/<string name="package_name">cn.jacksonz.pwa.twa.zhiweijz<\/string>/<string name="package_name">cn.jacksonz.pwa.twa.zhiweijz.debug<\/string>/' app/src/main/res/values/strings.xml
sed -i.tmp 's/<string name="custom_url_scheme">cn.jacksonz.pwa.twa.zhiweijz<\/string>/<string name="custom_url_scheme">cn.jacksonz.pwa.twa.zhiweijz.debug<\/string>/' app/src/main/res/values/strings.xml
rm -f app/src/main/res/values/strings.xml.tmp

# 清理函数 - 确保在脚本退出时恢复配置
cleanup() {
    echo "🔄 恢复原始配置..."
    if [ -f "$BACKUP_DIR/strings.xml.backup" ]; then
        cp "$BACKUP_DIR/strings.xml.backup" app/src/main/res/values/strings.xml
        echo "✅ strings.xml 已恢复"
    fi
    if [ -f "$BACKUP_DIR/build.gradle.backup" ]; then
        cp "$BACKUP_DIR/build.gradle.backup" app/build.gradle
        echo "✅ build.gradle 已恢复"
    fi
    if [ -f "$BACKUP_DIR/root.build.gradle.backup" ]; then
        cp "$BACKUP_DIR/root.build.gradle.backup" build.gradle
        echo "✅ root build.gradle 已恢复"
    fi
    if [ -f "$BACKUP_DIR/gradle.properties.backup" ]; then
        cp "$BACKUP_DIR/gradle.properties.backup" gradle.properties
        echo "✅ gradle.properties 已恢复"
    fi
    if [ -f "$BACKUP_DIR/revenuecat.build.gradle.backup" ]; then
        cp "$BACKUP_DIR/revenuecat.build.gradle.backup" "../../node_modules/@revenuecat/purchases-capacitor/android/build.gradle"
        echo "✅ RevenueCat build.gradle 已恢复"
    fi
    rm -rf "$BACKUP_DIR"
}

# 设置退出时执行清理
trap cleanup EXIT

# 8. 清理并构建APK
echo "🏗️ 构建APK..."
./gradlew clean
./gradlew assembleDebug

# 9. 复制APK到web目录
echo "📁 复制APK文件..."
cp app/build/outputs/apk/debug/app-debug.apk ../web/app-debug.apk

echo "✅ APK生成完成！"
echo "📱 APK文件位置: app-debug.apk"
echo "🏷️  应用名称: 只为记账-dev (调试版本)"
echo "📦 包名: cn.jacksonz.pwa.twa.zhiweijz.debug"
echo "🎯 现在调试版与正式版可以共存安装！"
echo "⚠️  注意：只修改了applicationId，保持了原始的类路径结构"
echo ""
echo "🔧 调试版本特性："
echo "   - 使用独立的包名和应用名称"
echo "   - 支持独立的版本更新源配置"
echo "   - 可以与生产版本同时安装"
echo "   - 构建时自动设置调试版本标识"
echo ""
echo "📋 安装APK到设备："
echo "adb install app-debug.apk"
