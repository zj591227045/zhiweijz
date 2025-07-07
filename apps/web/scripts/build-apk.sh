#!/bin/bash
# 生成Android APK文件

set -e

echo "📦 生成Android APK..."

# 1. 同步项目
echo "🔄 同步项目..."
npx cap sync android

# 2. 进入Android目录  
cd ../android

# 3. 备份原始文件到临时目录
echo "💾 备份原始配置..."
BACKUP_DIR="/tmp/apk-build-backup-$$"
mkdir -p "$BACKUP_DIR"
cp app/src/main/res/values/strings.xml "$BACKUP_DIR/strings.xml.backup"
cp app/build.gradle "$BACKUP_DIR/build.gradle.backup"

# 4. 修改应用名称为调试版本
echo "🔧 设置调试版本应用名称..."
sed -i.tmp 's/<string name="app_name">只为记账<\/string>/<string name="app_name">只为记账-dev<\/string>/' app/src/main/res/values/strings.xml
sed -i.tmp 's/<string name="title_activity_main">只为记账<\/string>/<string name="title_activity_main">只为记账-dev<\/string>/' app/src/main/res/values/strings.xml
rm -f app/src/main/res/values/strings.xml.tmp

# 5. 修改包名为调试版本（只修改applicationId，保持namespace不变）
echo "🔧 设置调试版本包名..."
sed -i.tmp 's/applicationId "cn.jacksonz.pwa.twa.zhiweijz"/applicationId "cn.jacksonz.pwa.twa.zhiweijz.debug"/' app/build.gradle
rm -f app/build.gradle.tmp

# 6. 修改strings.xml中的包名引用
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
}

# 设置退出时执行清理
trap cleanup EXIT

# 7. 清理并构建APK
echo "🏗️ 构建APK..."
./gradlew clean
./gradlew assembleDebug

# 8. 复制APK到web目录
echo "📁 复制APK文件..."
cp app/build/outputs/apk/debug/app-debug.apk ../web/app-debug.apk

echo "✅ APK生成完成！"
echo "📱 APK文件位置: app-debug.apk"
echo "🏷️  应用名称: 只为记账-dev (调试版本)"
echo "📦 包名: cn.jacksonz.pwa.twa.zhiweijz.debug"
echo "🎯 现在调试版与正式版可以共存安装！"
echo "⚠️  注意：只修改了applicationId，保持了原始的类路径结构"
echo ""
echo "📋 安装APK到设备："
echo "adb install app-debug.apk" 