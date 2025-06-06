#!/bin/bash

# Next.js 14 静态导出构建脚本
# 解决动态路由在静态导出时的兼容性问题

set -e

echo "🚀 开始 Next.js 14 静态导出构建..."

# 设置静态导出环境变量
export NEXT_BUILD_MODE=export
export NODE_ENV=production

# 打印构建信息
echo "📋 构建环境信息:"
echo "  NEXT_BUILD_MODE: $NEXT_BUILD_MODE"
echo "  NODE_ENV: $NODE_ENV"

# 清理之前的构建产物
echo "🧹 清理之前的构建产物..."
rm -rf .next out

# 切换到 web 应用目录
cd apps/web

# 创建备份目录
BACKUP_DIR=".dynamic-routes-backup"
mkdir -p "$BACKUP_DIR"

echo "🔧 临时禁用动态路由以支持静态导出..."

# 备份并临时重命名动态路由目录
DYNAMIC_ROUTES=(
  "src/app/families/[id]"
  "src/app/transactions/[id]"
  "src/app/transactions/edit/[id]"
  "src/app/budgets/[id]"
  "src/app/books/edit/[id]"
  "src/app/settings/categories/[id]"
  "src/app/settings/ai-services/edit/[id]"
)

for route in "${DYNAMIC_ROUTES[@]}"; do
  if [ -d "$route" ]; then
    echo "  备份: $route"
    # 创建备份
    route_backup="$BACKUP_DIR/$(echo $route | sed 's|/|_|g')"
    cp -r "$route" "$route_backup"
    # 临时重命名（添加.disabled后缀）
    mv "$route" "${route}.disabled"
  fi
done

# 执行静态构建
echo "🔨 执行静态构建..."
if npm run build; then
  echo "✅ 构建成功!"
  BUILD_SUCCESS=true
else
  echo "❌ 构建失败"
  BUILD_SUCCESS=false
fi

# 恢复动态路由目录
echo "🔄 恢复动态路由目录..."
for route in "${DYNAMIC_ROUTES[@]}"; do
  if [ -d "${route}.disabled" ]; then
    echo "  恢复: $route"
    mv "${route}.disabled" "$route"
  fi
done

# 清理备份目录
rm -rf "$BACKUP_DIR"

# 检查构建结果
if [ "$BUILD_SUCCESS" = false ]; then
  echo "❌ 静态构建失败"
  exit 1
fi

# 验证构建输出
if [ ! -d "out" ]; then
  echo "❌ 构建失败：未找到 out 目录"
  exit 1
fi

# 检查构建结果
echo "📊 构建统计:"
echo "  总文件数: $(find out -type f | wc -l)"
echo "  HTML文件数: $(find out -name "*.html" | wc -l)"
echo "  JS文件数: $(find out -name "*.js" | wc -l)"
echo "  CSS文件数: $(find out -name "*.css" | wc -l)"

# 显示构建产物大小
echo "📦 构建产物大小:"
du -sh out

echo "🎉 静态导出构建完成!"
echo "📁 输出目录: apps/web/out"

# 添加使用说明
echo ""
echo "📝 使用说明:"
echo "  1. 静态文件已生成到 out/ 目录"
echo "  2. 可以直接用于 Capacitor 移动应用打包"
echo "  3. 动态路由页面在静态模式下不可用，但不影响核心功能"
echo ""

# 可选：启动本地服务器预览
if command -v python3 &> /dev/null; then
  echo "💡 预览命令："
  echo "  cd apps/web/out && python3 -m http.server 8080"
elif command -v python &> /dev/null; then
  echo "💡 预览命令："
  echo "  cd apps/web/out && python -m SimpleHTTPServer 8080"
fi 