#!/bin/bash
# 测试移动端构建脚本

set -e

echo "🧪 测试移动端构建配置..."

# 检查是否在正确的目录
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ 请在apps/web目录下运行此脚本"
    exit 1
fi

# 1. 清理之前的构建
echo "🧹 清理构建缓存..."
rm -rf .next out node_modules/.cache

# 2. 备份当前配置
echo "📦 备份当前配置..."
if [ -f "next.config.js.backup" ]; then
    rm next.config.js.backup
fi
cp next.config.js next.config.js.backup

# 3. 使用移动端配置
echo "🔧 应用移动端配置..."
cp next.config.mobile.js next.config.js

# 4. 测试构建
echo "🏗️ 测试移动端构建..."
if NEXT_PUBLIC_IS_MOBILE=true IS_MOBILE_BUILD=true NEXT_BUILD_MODE=export npm run build; then
    echo "✅ 移动端构建成功"
    BUILD_SUCCESS=true
else
    echo "❌ 移动端构建失败"
    BUILD_SUCCESS=false
fi

# 5. 恢复配置
echo "🔄 恢复原始配置..."
cp next.config.js.backup next.config.js
rm next.config.js.backup

# 6. 验证构建结果
if [ "$BUILD_SUCCESS" = true ]; then
    echo ""
    echo "📊 构建结果分析："
    
    # 检查总文件数
    TOTAL_FILES=$(find out -type f | wc -l)
    echo "  总文件数: $TOTAL_FILES"
    
    # 检查HTML文件数
    HTML_FILES=$(find out -name "*.html" | wc -l)
    echo "  HTML文件数: $HTML_FILES"
    
    # 检查admin页面是否被排除
    if [ -d "out/admin" ]; then
        echo "  ⚠️ admin目录仍存在: $(ls -la out/admin | wc -l) 个文件"
        echo "  admin文件列表:"
        ls -la out/admin/ | head -10
    else
        echo "  ✅ admin页面已成功排除"
    fi
    
    # 检查关键页面是否存在
    REQUIRED_PAGES=(
        "out/index.html"
        "out/dashboard/index.html"
        "out/transactions/index.html"
        "out/settings/index.html"
    )
    
    echo ""
    echo "📋 关键页面检查："
    for page in "${REQUIRED_PAGES[@]}"; do
        if [ -f "$page" ]; then
            echo "  ✅ $page"
        else
            echo "  ❌ $page (缺失)"
        fi
    done
    
    # 检查构建产物大小
    echo ""
    echo "📦 构建产物大小:"
    du -sh out
    
    # 检查是否有admin相关的JS文件
    echo ""
    echo "🔍 检查admin相关文件:"
    ADMIN_JS_FILES=$(find out -name "*.js" -exec grep -l "admin\|Admin" {} \; 2>/dev/null | wc -l)
    if [ "$ADMIN_JS_FILES" -gt 0 ]; then
        echo "  ⚠️ 发现 $ADMIN_JS_FILES 个可能包含admin代码的JS文件"
        find out -name "*.js" -exec grep -l "admin\|Admin" {} \; 2>/dev/null | head -5
    else
        echo "  ✅ 未发现admin相关的JS文件"
    fi
    
    echo ""
    echo "✅ 移动端构建测试完成！"
    
    # 提供后续操作建议
    echo ""
    echo "📋 后续操作："
    echo "1. iOS构建: ./scripts/build-ios.sh"
    echo "2. Android构建: ./scripts/build-android.sh"
    echo "3. 修复iOS权限: ./scripts/fix-ios-sandbox.sh"
    
else
    echo ""
    echo "❌ 移动端构建测试失败"
    echo ""
    echo "🔧 故障排除："
    echo "1. 检查Node.js版本: node --version"
    echo "2. 清理依赖: rm -rf node_modules && npm install"
    echo "3. 检查构建日志中的具体错误信息"
    echo "4. 确认所有必要的依赖已安装"
    
    exit 1
fi
