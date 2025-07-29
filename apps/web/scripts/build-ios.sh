#!/bin/bash
# iOS构建脚本 - 增强版本，包含错误处理和诊断

set -e

echo "🍎 开始构建iOS应用..."

# 检查必要的工具
echo "🔍 检查构建环境..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx未找到，请确保Node.js已正确安装"
    exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ xcodebuild未找到，请确保Xcode已正确安装"
    exit 1
fi

# 检查Capacitor配置
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ capacitor.config.ts未找到"
    exit 1
fi

# 1. 清理之前的构建产物
echo "🧹 清理之前的构建产物..."
rm -rf out .next

# 2. 备份原配置
echo "📦 备份原始配置..."
if [ -f "next.config.js.backup" ]; then
    rm next.config.js.backup
fi
cp next.config.js next.config.js.backup

# 3. 使用移动端专用配置构建Next.js应用
echo "🔧 应用移动端配置（排除admin页面）..."
cp next.config.mobile.js next.config.js

# 3.1. 临时移动admin、debug和test目录到项目外部以排除构建
echo "📁 临时移动admin、debug和test目录..."

# 创建临时目录
TEMP_DIR="/tmp/zhiweijz-excluded-dirs-$$"
mkdir -p "$TEMP_DIR"

# 移动admin目录
if [ -d "src/app/admin" ]; then
    mv src/app/admin "$TEMP_DIR/"
    echo "✅ admin目录已移动到 $TEMP_DIR/admin"
    ADMIN_BACKUP_PATH="$TEMP_DIR/admin"
else
    echo "⚠️ admin目录不存在，跳过移动"
    ADMIN_BACKUP_PATH=""
fi

# 移动debug目录
if [ -d "src/app/debug" ]; then
    mv src/app/debug "$TEMP_DIR/"
    echo "✅ debug目录已移动到 $TEMP_DIR/debug"
    DEBUG_BACKUP_PATH="$TEMP_DIR/debug"
else
    echo "⚠️ debug目录不存在，跳过移动"
    DEBUG_BACKUP_PATH=""
fi

# 移动所有test开头的目录
TEST_BACKUP_PATHS=""
for test_dir in src/app/test*; do
    if [ -d "$test_dir" ]; then
        dir_name=$(basename "$test_dir")
        mv "$test_dir" "$TEMP_DIR/"
        echo "✅ $dir_name 目录已移动到 $TEMP_DIR/$dir_name"
        TEST_BACKUP_PATHS="$TEST_BACKUP_PATHS $TEMP_DIR/$dir_name"
    fi
done

if [ -z "$TEST_BACKUP_PATHS" ]; then
    echo "⚠️ 没有找到test开头的目录"
fi

# 4. 构建静态文件
echo "🏗️ 构建静态文件（移动端模式）..."
if NEXT_PUBLIC_IS_MOBILE=true NEXT_BUILD_MODE=export npm run build; then
    echo "✅ 静态文件构建成功"
    echo "📊 构建统计: $(find out -type f | wc -l) 个文件"
    # 验证admin、debug和test页面是否被排除
    EXCLUDED_FOUND=false
    if [ -d "out/admin" ]; then
        echo "⚠️ admin页面可能未完全排除"
        EXCLUDED_FOUND=true
    fi
    if [ -d "out/debug" ]; then
        echo "⚠️ debug页面可能未完全排除"
        EXCLUDED_FOUND=true
    fi
    # 检查test开头的目录
    for test_out in out/test*; do
        if [ -d "$test_out" ]; then
            echo "⚠️ $(basename "$test_out") 页面可能未完全排除"
            EXCLUDED_FOUND=true
        fi
    done

    if [ "$EXCLUDED_FOUND" = false ]; then
        echo "✅ admin、debug和test页面已成功排除"
    fi
else
    echo "❌ 静态文件构建失败"
    # 恢复所有目录
    if [ -n "$ADMIN_BACKUP_PATH" ] && [ -d "$ADMIN_BACKUP_PATH" ]; then
        mv "$ADMIN_BACKUP_PATH" src/app/admin
        echo "🔄 admin目录已恢复"
    fi
    if [ -n "$DEBUG_BACKUP_PATH" ] && [ -d "$DEBUG_BACKUP_PATH" ]; then
        mv "$DEBUG_BACKUP_PATH" src/app/debug
        echo "🔄 debug目录已恢复"
    fi
    # 恢复test目录
    for test_path in $TEST_BACKUP_PATHS; do
        if [ -d "$test_path" ]; then
            dir_name=$(basename "$test_path")
            mv "$test_path" "src/app/$dir_name"
            echo "🔄 $dir_name 目录已恢复"
        fi
    done
    # 恢复配置
    cp next.config.js.backup next.config.js
    exit 1
fi

# 4.1. 恢复所有目录
echo "🔄 恢复admin、debug和test目录..."
if [ -n "$ADMIN_BACKUP_PATH" ] && [ -d "$ADMIN_BACKUP_PATH" ]; then
    mv "$ADMIN_BACKUP_PATH" src/app/admin
    echo "✅ admin目录已恢复"
else
    echo "⚠️ admin备份目录不存在，跳过恢复"
fi

if [ -n "$DEBUG_BACKUP_PATH" ] && [ -d "$DEBUG_BACKUP_PATH" ]; then
    mv "$DEBUG_BACKUP_PATH" src/app/debug
    echo "✅ debug目录已恢复"
else
    echo "⚠️ debug备份目录不存在，跳过恢复"
fi

# 恢复test目录
for test_path in $TEST_BACKUP_PATHS; do
    if [ -d "$test_path" ]; then
        dir_name=$(basename "$test_path")
        mv "$test_path" "src/app/$dir_name"
        echo "✅ $dir_name 目录已恢复"
    fi
done

if [ -z "$TEST_BACKUP_PATHS" ]; then
    echo "⚠️ 没有test目录需要恢复"
fi

# 5. 验证构建输出
if [ ! -d "out" ]; then
    echo "❌ 构建失败：out目录不存在"
    cp next.config.js.backup next.config.js
    exit 1
fi

echo "📊 构建统计: $(find out -type f | wc -l) 个文件"

# 6. 恢复原配置
echo "🔄 恢复原始配置..."
cp next.config.js.backup next.config.js
rm next.config.js.backup

# 7. 检查iOS项目目录
if [ ! -d "../ios" ]; then
    echo "❌ iOS项目目录不存在，请先添加iOS平台"
    echo "运行: npx cap add ios"
    exit 1
fi

# 8. 同步到Capacitor（带错误处理）
echo "📱 同步到iOS项目..."
if npx cap sync ios; then
    echo "✅ 同步成功"
else
    echo "❌ 同步失败，尝试重新安装iOS平台..."
    echo "🔄 重新安装iOS平台..."
    rm -rf ../ios
    npx cap add ios
    npx cap sync ios
fi

# 9. 验证同步结果
if [ -d "../ios/App/App/public" ]; then
    echo "✅ 文件同步验证成功"
else
    echo "⚠️ 同步验证失败，请检查../ios/App/App/public目录"
fi

# 10. 检查iOS项目配置
echo "🔍 检查iOS项目配置..."
if [ -f "../ios/App/App.xcworkspace/contents.xcworkspacedata" ]; then
    echo "✅ Xcode workspace配置正常"
else
    echo "⚠️ Xcode workspace可能有问题"
fi

# 11. 打开Xcode
echo "🚀 打开Xcode..."
if npx cap open ios; then
    echo "✅ Xcode已打开"
else
    echo "⚠️ 无法自动打开Xcode，请手动打开: ../ios/App/App.xcworkspace"
fi

echo ""
echo "✅ iOS构建完成！"
echo ""
echo "📋 后续操作："
echo "1. 在Xcode中选择目标设备或模拟器"
echo "2. 确保开发者账号已配置（如需真机调试）"
echo "3. 点击Run按钮构建并运行应用"
echo ""
echo "🔧 如果遇到构建错误："
echo "1. 检查Xcode中的Build Settings"
echo "2. 确保iOS Deployment Target设置正确"
echo "3. 清理Xcode项目: Product > Clean Build Folder"
echo "4. 重新运行此脚本"