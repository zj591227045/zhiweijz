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

# 3. 构建静态文件（使用移动端构建模式）
echo "🏗️ 构建静态文件（移动端模式）..."
echo "   - 设置 IS_MOBILE_BUILD=true 以简化admin页面"
echo "   - 使用静态导出模式"
IS_MOBILE_BUILD=true NEXT_BUILD_MODE=export npm run build

# 4. 恢复原配置
echo "🔄 恢复原始配置..."
cp next.config.js.backup next.config.js
rm next.config.js.backup

# 5. 检查构建结果
echo "🔍 检查构建结果..."
if [ ! -d "out" ]; then
    echo "❌ 构建失败：out目录不存在"
    exit 1
fi

echo "✅ 静态文件构建成功，文件数量: $(find out -type f | wc -l)"

# 6. 检查并添加Android平台（如果不存在）
if [ ! -d "android/app" ]; then
    echo "📱 添加Android平台..."
    npx cap add android
else
    echo "📱 Android平台已存在，跳过添加步骤"
fi

# 7. 同步到Capacitor Android项目
echo "📱 同步到Android项目..."
npx cap sync android

# 8. 验证同步结果
if [ -d "android/app/src/main/assets/public" ]; then
    echo "✅ 文件同步成功"
else
    echo "⚠️ 同步可能有问题，请检查android/app/src/main/assets/目录"
fi

# 9. 打开Android Studio
echo "🚀 打开Android Studio..."
npx cap open android

echo ""
echo "✅ Android构建完成！"
echo ""
echo "📋 构建信息："
echo "   - 使用移动端构建模式（admin页面已简化）"
echo "   - 静态文件已导出到 out/ 目录"
echo "   - 文件已同步到 android/ 项目"
echo ""
echo "📋 后续操作："
echo "1. 在Android Studio中选择设备或模拟器"
echo "2. 点击Run按钮直接运行应用"
echo "3. 或使用Build > Build Bundle(s)/APK(s) > Build APK(s)生成APK文件"
echo ""
echo "🔧 故障排除："
echo "   - 如果遇到admin页面相关错误，请确认IS_MOBILE_BUILD环境变量已设置"
echo "   - 如果构建失败，请检查out/目录是否正确生成" 