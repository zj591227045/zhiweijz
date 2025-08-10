#!/bin/bash
# Android构建脚本

set -e

echo "🤖 开始构建Android应用..."

# 1. 清理之前的构建产物
echo "🧹 清理之前的构建产物..."
rm -rf out .next

# 2. 临时移动admin和所有debug相关目录
echo "📁 临时移动admin和debug相关目录..."
mkdir -p /tmp/zhiweijz-excluded-dirs
if [ -d "src/app/admin" ]; then
    mv src/app/admin /tmp/zhiweijz-excluded-dirs/
    echo "✅ admin目录已移动"
fi

# 移动所有debug相关目录
for debug_dir in src/app/*debug*; do
    if [ -d "$debug_dir" ]; then
        dir_name=$(basename "$debug_dir")
        mv "$debug_dir" "/tmp/zhiweijz-excluded-dirs/"
        echo "✅ $dir_name 目录已移动"
    fi
done

# 3. 备份并应用移动端配置
echo "🔧 应用移动端配置..."
if [ -f "next.config.js.backup" ]; then
    rm next.config.js.backup
fi
cp next.config.js next.config.js.backup
cp next.config.mobile.js next.config.js

# 4. 构建静态文件（使用移动端构建模式）
echo "🏗️ 构建静态文件（移动端模式）..."
echo "   - 设置 BUILD_MODE=mobile"
echo "   - 排除admin管理页面和debug页面"
echo "   - 使用静态导出模式"

# 使用正确的环境变量设置
if BUILD_MODE=mobile NEXT_PUBLIC_IS_MOBILE=true IS_MOBILE_BUILD=true npm run build:mobile; then
    echo "✅ 静态文件构建成功"
else
    echo "❌ 静态文件构建失败"
    # 恢复配置
    cp next.config.js.backup next.config.js
    rm next.config.js.backup
    # 恢复目录
    if [ -d "/tmp/zhiweijz-excluded-dirs/admin" ]; then
        mv /tmp/zhiweijz-excluded-dirs/admin src/app/
    fi
    for excluded_dir in /tmp/zhiweijz-excluded-dirs/*debug*; do
        if [ -d "$excluded_dir" ]; then
            dir_name=$(basename "$excluded_dir")
            mv "$excluded_dir" "src/app/"
        fi
    done
    exit 1
fi

# 4. 恢复配置和目录
echo "🔄 恢复原始配置..."
cp next.config.js.backup next.config.js
rm next.config.js.backup

echo "🔄 恢复admin和debug相关目录..."
if [ -d "/tmp/zhiweijz-excluded-dirs/admin" ]; then
    mv /tmp/zhiweijz-excluded-dirs/admin src/app/
    echo "✅ admin目录已恢复"
fi

# 恢复所有debug相关目录
for excluded_dir in /tmp/zhiweijz-excluded-dirs/*debug*; do
    if [ -d "$excluded_dir" ]; then
        dir_name=$(basename "$excluded_dir")
        mv "$excluded_dir" "src/app/"
        echo "✅ $dir_name 目录已恢复"
    fi
done

# 5. 检查构建结果
echo "🔍 检查构建结果..."
if [ ! -d "out" ]; then
    echo "❌ 构建失败：out目录不存在"
    exit 1
fi

echo "✅ 静态文件构建成功，文件数量: $(find out -type f | wc -l)"

# 验证admin页面是否被排除
if [ ! -d "out/admin" ]; then
    echo "✅ admin页面已成功排除"
else
    echo "⚠️ admin页面可能未完全排除，但不影响移动端功能"
fi

# 6. 检查Android平台状态
if [ ! -d "../android" ]; then
    echo "📱 添加Android平台..."
    npx cap add android
else
    echo "📱 Android平台已存在，继续同步..."
    # 检查Android项目完整性
    if [ ! -f "../android/app/build.gradle" ]; then
        echo "⚠️ Android项目不完整，重新创建..."
        rm -rf ../android
        npx cap add android
    fi
fi

# 7. 同步到Capacitor Android项目
echo "📱 同步到Android项目..."
if npx cap sync android; then
    echo "✅ 同步成功"
else
    echo "❌ 同步失败，尝试修复..."
    # 尝试清理并重新同步
    echo "🔄 清理Android项目缓存..."
    rm -rf ../android/app/src/main/assets/public
    rm -rf ../android/app/src/main/assets/capacitor.config.json

    echo "🔄 重新同步..."
    if npx cap sync android; then
        echo "✅ 重新同步成功"
    else
        echo "❌ 重新同步仍然失败，请检查项目配置"
        exit 1
    fi
fi

# 8. 验证同步结果
if [ -d "../android/app/src/main/assets/public" ]; then
    echo "✅ 文件同步验证成功"
    echo "📊 同步文件数量: $(find ../android/app/src/main/assets/public -type f | wc -l)"
else
    echo "❌ 同步验证失败，请检查../android/app/src/main/assets/目录"
    exit 1
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