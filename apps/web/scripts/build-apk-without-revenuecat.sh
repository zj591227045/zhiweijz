#!/bin/bash
# 生成Android APK文件（临时移除RevenueCat插件）

set -e

echo "📦 生成Android APK（无RevenueCat）..."

# 1. 备份package.json
echo "💾 备份package.json..."
cp package.json package.json.backup

# 2. 临时移除RevenueCat依赖
echo "🔧 临时移除RevenueCat依赖..."
sed -i.tmp '/@revenuecat\/purchases-capacitor/d' package.json
rm -f package.json.tmp

# 3. 重新安装依赖
echo "📦 重新安装依赖..."
npm install

# 4. 同步项目
echo "🔄 同步项目..."
npx cap sync android

# 5. 进入Android目录  
cd ../android

# 6. 备份原始文件到临时目录
echo "💾 备份原始配置..."
BACKUP_DIR="/tmp/apk-build-backup-$$"
mkdir -p "$BACKUP_DIR"
cp app/src/main/res/values/strings.xml "$BACKUP_DIR/strings.xml.backup"
cp app/build.gradle "$BACKUP_DIR/build.gradle.backup"

# 7. 修复Kotlin JVM目标版本兼容性问题
echo "🔧 修复Kotlin JVM目标版本..."
sed -i.tmp 's/sourceCompatibility JavaVersion.VERSION_21/sourceCompatibility JavaVersion.VERSION_17/' app/capacitor.build.gradle
sed -i.tmp 's/targetCompatibility JavaVersion.VERSION_21/targetCompatibility JavaVersion.VERSION_17/' app/capacitor.build.gradle
rm -f app/capacitor.build.gradle.tmp

# 8. 修改应用名称为调试版本
echo "🔧 设置调试版本应用名称..."
sed -i.tmp 's/<string name="app_name">只为记账<\/string>/<string name="app_name">只为记账-dev<\/string>/' app/src/main/res/values/strings.xml
sed -i.tmp 's/<string name="title_activity_main">只为记账<\/string>/<string name="title_activity_main">只为记账-dev<\/string>/' app/src/main/res/values/strings.xml
rm -f app/src/main/res/values/strings.xml.tmp

# 9. 修改包名为调试版本（只修改applicationId，保持namespace不变）
echo "🔧 设置调试版本包名..."
sed -i.tmp 's/applicationId "cn.jacksonz.pwa.twa.zhiweijz"/applicationId "cn.jacksonz.pwa.twa.zhiweijz.debug"/' app/build.gradle
rm -f app/build.gradle.tmp

# 10. 修改strings.xml中的包名引用
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
    rm -rf "$BACKUP_DIR"
    
    # 恢复package.json
    cd ../web
    if [ -f "package.json.backup" ]; then
        cp package.json.backup package.json
        echo "✅ package.json 已恢复"
        rm -f package.json.backup
        npm install
    fi
}

# 设置退出时执行清理
trap cleanup EXIT

# 11. 清理并构建APK
echo "🏗️ 构建APK..."
./gradlew clean
./gradlew assembleDebug

# 12. 复制APK到web目录
echo "📁 复制APK文件..."
cp app/build/outputs/apk/debug/app-debug.apk ../web/app-debug-no-revenuecat.apk

echo "✅ APK生成完成！"
echo "📱 APK文件位置: app-debug-no-revenuecat.apk"
echo "🏷️  应用名称: 只为记账-dev (调试版本，无RevenueCat)"
echo "📦 包名: cn.jacksonz.pwa.twa.zhiweijz.debug"
echo "🎯 现在调试版与正式版可以共存安装！"
echo "⚠️  注意：此版本移除了RevenueCat插件"
echo ""
echo "📋 安装APK到设备："
echo "adb install app-debug-no-revenuecat.apk"
