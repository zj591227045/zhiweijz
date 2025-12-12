#!/bin/bash
# S3恢复工具快速启动脚本 - 独立运行版本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "S3对象存储恢复工具"
echo "=========================================="
echo ""

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    echo "请先安装 Node.js (建议版本 >= 18)"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"
echo ""

# 检查依赖包
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "⚠ 首次运行，正在安装依赖..."
    cd "$SCRIPT_DIR"
    npm config set registry https://registry.npmmirror.com
    npm install
    echo ""
fi

# 运行独立恢复工具
cd "$SCRIPT_DIR"
node s3-restore-standalone.js "$@"
