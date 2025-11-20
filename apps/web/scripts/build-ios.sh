#!/bin/bash
# iOS构建脚本 - 增强版本，包含错误处理和诊断
#
# 用法: ./scripts/build-ios.sh [选项]
#
# 选项:
#   --skip-build    跳过Next.js构建，只同步现有的out目录
#   --skip-pod      跳过pod install
#   --no-open       构建完成后不询问是否打开Xcode
#   --help          显示此帮助信息
#
# 示例:
#   ./scripts/build-ios.sh                    # 完整构建
#   ./scripts/build-ios.sh --skip-build       # 只同步文件
#   ./scripts/build-ios.sh --skip-pod         # 跳过依赖更新

set -e

# 解析命令行参数
SKIP_BUILD=false
SKIP_POD=false
NO_OPEN=false

for arg in "$@"; do
    case $arg in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-pod)
            SKIP_POD=true
            shift
            ;;
        --no-open)
            NO_OPEN=true
            shift
            ;;
        --help)
            echo "iOS构建脚本"
            echo ""
            echo "用法: ./scripts/build-ios.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --skip-build    跳过Next.js构建，只同步现有的out目录"
            echo "  --skip-pod      跳过pod install"
            echo "  --no-open       构建完成后不询问是否打开Xcode"
            echo "  --help          显示此帮助信息"
            echo ""
            exit 0
            ;;
        *)
            echo "未知选项: $arg"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

# 切换到脚本所在目录的上一级（apps/web）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🍎 开始构建iOS应用..."
echo "📂 工作目录: $(pwd)"
echo ""

# 检查必要的工具
echo "🔍 检查构建环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "   ✓ Node.js: $NODE_VERSION"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm未找到"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "   ✓ npm: $NPM_VERSION"

# 检查 Xcode（可选，因为可能在没有 Xcode 的环境下构建）
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version 2>/dev/null | head -1)
    echo "   ✓ Xcode: $XCODE_VERSION"
else
    echo "   ⚠ Xcode未安装（如需在设备上运行，请安装Xcode）"
fi

# 检查 CocoaPods
if command -v pod &> /dev/null; then
    POD_VERSION=$(pod --version)
    echo "   ✓ CocoaPods: $POD_VERSION"
else
    echo "   ⚠ CocoaPods未安装（iOS依赖管理需要）"
    echo "   💡 安装: sudo gem install cocoapods"
fi

# 检查Capacitor配置
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ capacitor.config.ts未找到"
    exit 1
fi
echo "   ✓ Capacitor配置存在"

echo ""

# 检查是否跳过构建
if [ "$SKIP_BUILD" = true ]; then
    echo "⏭️ 跳过Next.js构建（使用现有out目录）"
    
    # 验证out目录存在
    if [ ! -d "out" ]; then
        echo "❌ out目录不存在，无法跳过构建"
        echo "💡 请先运行完整构建，或移除 --skip-build 选项"
        exit 1
    fi
    
    echo "✅ 找到现有构建: $(find out -type f 2>/dev/null | wc -l) 个文件"
    echo ""
else
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

# 4. 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "❌ 环境变量文件 .env.local 不存在"
    echo "请先创建 .env.local 文件并配置RevenueCat iOS API密钥"
    exit 1
fi

# 4.1. 验证iOS RevenueCat配置
echo "🔍 验证iOS RevenueCat配置..."
if ! grep -q "NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_" .env.local; then
    echo "⚠️ 警告：未找到有效的iOS RevenueCat API密钥配置"
    echo "请确保 .env.local 中配置了正确的 NEXT_PUBLIC_REVENUECAT_IOS_API_KEY"
fi

# 4.3. 构建静态文件
echo "🏗️ 构建静态文件（移动端模式）..."
if npm run build; then
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
    if [ -f "next.config.js.backup" ]; then
        cp next.config.js.backup next.config.js
        rm next.config.js.backup
        echo "✅ 配置已恢复"
    else
        echo "⚠️ 备份文件不存在，跳过恢复"
    fi

    # 6.1. 环境变量文件保持不变（直接使用.env.local）
    echo "🔧 使用 .env.local 作为iOS构建配置"
    echo ""
fi

# 7. 检查iOS项目目录
if [ ! -d "../ios" ]; then
    echo "❌ iOS项目目录不存在，请先添加iOS平台"
    echo "运行: npx cap add ios"
    exit 1
fi

# 8. 同步到Capacitor（智能错误处理）
echo "📱 同步到iOS项目..."

# 先尝试只复制文件，不运行 pod install
echo "📦 复制Web资源到iOS项目..."
if npx cap copy ios 2>&1 | tee /tmp/cap-copy.log; then
    echo "✅ 文件复制成功"
else
    echo "❌ 文件复制失败"
    cat /tmp/cap-copy.log
    exit 1
fi

# 检查是否跳过 pod install
if [ "$SKIP_POD" = true ]; then
    echo "⏭️ 跳过pod install（使用现有依赖）"
    echo ""
elif ! command -v pod &> /dev/null; then
    echo "⚠️ CocoaPods 未安装，跳过依赖更新"
    echo "💡 如需安装: sudo gem install cocoapods"
    echo ""
else
    echo "📦 更新iOS依赖（pod install）..."
    
    # 直接运行 pod install，避免使用 xcodebuild
    cd ../ios/App
    
    if pod install 2>&1 | tee /tmp/pod-install.log; then
        echo "✅ iOS依赖更新成功"
        cd - > /dev/null
    else
        POD_EXIT_CODE=$?
        echo ""
        echo "⚠️ pod install 遇到问题（退出码: $POD_EXIT_CODE）"
        
        # 检查是否是网络问题
        if grep -q "CDN:" /tmp/pod-install.log && grep -q "error" /tmp/pod-install.log; then
            echo ""
            echo "🌐 可能是网络问题，建议："
            echo "   1. 检查网络连接"
            echo "   2. 稍后重试: cd apps/ios/App && pod install"
            echo "   3. 或使用代理"
        fi
        
        # 检查是否是 Xcode 问题
        if grep -q "xcodebuild" /tmp/pod-install.log; then
            echo ""
            echo "🔍 检测到 Xcode 相关问题"
            echo "💡 尝试运行: sudo xcodebuild -runFirstLaunch"
        fi
        
        cd - > /dev/null
        echo ""
        echo "⚠️ 依赖更新失败，但文件已同步"
        echo "💡 你可以稍后手动运行: cd apps/ios/App && pod install"
        echo "💡 或使用 --skip-pod 选项跳过此步骤"
        echo ""
    fi
fi

# 更新 Capacitor 配置
echo "⚙️ 更新Capacitor配置..."
if npx cap update ios 2>&1 | tee /tmp/cap-update.log; then
    echo "✅ 配置更新成功"
else
    echo "⚠️ 配置更新遇到问题，但不影响主要功能"
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

# 11. 打开Xcode（可选）
echo ""
echo "✅ iOS构建完成！"
echo ""
echo "📊 构建摘要："
echo "   - Web资源: $(find out -type f 2>/dev/null | wc -l) 个文件"
echo "   - iOS项目: ../ios/App/App.xcworkspace"
echo ""

# 根据选项决定是否询问打开 Xcode
if [ "$NO_OPEN" = true ]; then
    echo "💡 稍后可以手动打开: open apps/ios/App/App.xcworkspace"
else
    # 询问是否打开 Xcode
    read -p "🚀 是否现在打开Xcode？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if open ../ios/App/App.xcworkspace 2>/dev/null; then
            echo "✅ Xcode已打开"
        else
            echo "⚠️ 无法自动打开，请手动打开: ../ios/App/App.xcworkspace"
        fi
    else
        echo "💡 稍后可以手动打开: open apps/ios/App/App.xcworkspace"
    fi
fi

echo ""
echo "📋 后续操作："
echo "1. 在Xcode中选择目标设备或模拟器"
echo "2. 确保开发者账号已配置（如需真机调试）"
echo "3. 点击Run按钮（⌘+R）构建并运行应用"
echo ""
echo "🔧 常见问题："
echo "• 如果遇到签名错误: 在Xcode中配置Team和Bundle ID"
echo "• 如果遇到依赖问题: cd apps/ios/App && pod install"
echo "• 如果需要清理: Product > Clean Build Folder (⇧⌘K)"
echo ""