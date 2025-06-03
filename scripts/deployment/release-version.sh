#!/bin/bash

# 版本发布脚本
# 自动化版本更新、Docker镜像构建和发布流程

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
DOCKER_USERNAME="zj591227045"
BACKEND_IMAGE="zhiweijz-backend"
FRONTEND_IMAGE="zhiweijz-frontend"
NGINX_IMAGE="zhiweijz-nginx"

echo -e "${GREEN}智慧记账版本发布脚本${NC}"
echo "=================================="

# 解析命令行参数
VERSION_TYPE="patch"  # 默认为patch版本
SKIP_TESTS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --major)
            VERSION_TYPE="major"
            shift
            ;;
        --minor)
            VERSION_TYPE="minor"
            shift
            ;;
        --patch)
            VERSION_TYPE="patch"
            shift
            ;;
        --version)
            CUSTOM_VERSION="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  --major          主版本号升级 (不兼容的API更改)"
            echo "  --minor          次版本号升级 (向后兼容的功能新增)"
            echo "  --patch          补丁版本号升级 (向后兼容的问题修正)"
            echo "  --version VER    指定具体版本号"
            echo "  --skip-tests     跳过测试"
            echo "  --dry-run        预览模式，不执行实际操作"
            echo "  --help           显示帮助"
            exit 0
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

# 检查工作目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查Git状态
if [ "$DRY_RUN" = false ]; then
    if ! git diff-index --quiet HEAD --; then
        echo -e "${RED}❌ 工作目录有未提交的更改，请先提交或暂存${NC}"
        exit 1
    fi
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}当前版本: ${YELLOW}${CURRENT_VERSION}${NC}"

# 计算新版本
if [ -n "$CUSTOM_VERSION" ]; then
    NEW_VERSION="$CUSTOM_VERSION"
else
    if [ "$DRY_RUN" = true ]; then
        NEW_VERSION=$(npm version --no-git-tag-version $VERSION_TYPE --dry-run | sed 's/v//')
    else
        NEW_VERSION=$(npm version --no-git-tag-version $VERSION_TYPE | sed 's/v//')
    fi
fi

echo -e "${BLUE}新版本: ${GREEN}${NEW_VERSION}${NC}"

# 预览模式
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] 预览模式，以下操作将被执行：${NC}"
    echo "1. 更新package.json版本号到 $NEW_VERSION"
    echo "2. 运行测试 (如果未跳过)"
    echo "3. 构建Docker镜像: $DOCKER_USERNAME/$BACKEND_IMAGE:$NEW_VERSION"
    echo "4. 更新docker-compose.yml"
    echo "5. 提交更改并创建Git标签"
    echo "6. 推送到远程仓库"
    exit 0
fi

# 确认发布
echo ""
echo -e "${YELLOW}确认发布版本 ${GREEN}${NEW_VERSION}${YELLOW}？(y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "发布已取消"
    exit 0
fi

# 运行测试
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${BLUE}1️⃣ 运行测试...${NC}"
    cd server
    if npm test; then
        echo -e "${GREEN}✅ 测试通过${NC}"
    else
        echo -e "${RED}❌ 测试失败，发布中止${NC}"
        exit 1
    fi
    cd ..
else
    echo -e "${YELLOW}⏭️  跳过测试${NC}"
fi

# 更新迁移管理器版本映射
echo -e "${BLUE}2️⃣ 更新迁移管理器...${NC}"
# 这里可以添加自动更新迁移管理器的逻辑

# 构建Docker镜像
echo -e "${BLUE}3️⃣ 构建Docker镜像...${NC}"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --file server/Dockerfile \
    --tag "${DOCKER_USERNAME}/${BACKEND_IMAGE}:${NEW_VERSION}" \
    --tag "${DOCKER_USERNAME}/${BACKEND_IMAGE}:latest" \
    --push \
    .

echo -e "${GREEN}✅ Docker镜像构建完成${NC}"

# 更新docker-compose.yml
echo -e "${BLUE}4️⃣ 更新docker-compose.yml...${NC}"
cd docker

# 备份原文件
cp docker-compose.yml "docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"

# 更新版本号
sed -i.tmp "s|image: ${DOCKER_USERNAME}/${BACKEND_IMAGE}:.*|image: ${DOCKER_USERNAME}/${BACKEND_IMAGE}:${NEW_VERSION}|g" docker-compose.yml
rm -f docker-compose.yml.tmp

echo -e "${GREEN}✅ docker-compose.yml已更新${NC}"
cd ..

# 提交更改
echo -e "${BLUE}5️⃣ 提交更改...${NC}"
git add .
git commit -m "Release v${NEW_VERSION}

- 更新版本号到 ${NEW_VERSION}
- 更新Docker镜像版本
- 自动化数据库迁移支持
"

# 创建Git标签
echo -e "${BLUE}6️⃣ 创建Git标签...${NC}"
git tag "v${NEW_VERSION}"

# 推送到远程仓库
echo -e "${BLUE}7️⃣ 推送到远程仓库...${NC}"
git push origin main --tags

echo ""
echo -e "${GREEN}🎉 版本 ${NEW_VERSION} 发布成功！${NC}"
echo ""
echo -e "${BLUE}发布信息:${NC}"
echo -e "  版本号: ${YELLOW}${NEW_VERSION}${NC}"
echo -e "  Docker镜像: ${YELLOW}${DOCKER_USERNAME}/${BACKEND_IMAGE}:${NEW_VERSION}${NC}"
echo -e "  Git标签: ${YELLOW}v${NEW_VERSION}${NC}"
echo ""
echo -e "${BLUE}用户使用方法:${NC}"
echo -e "  1. 拉取最新镜像: ${YELLOW}docker pull ${DOCKER_USERNAME}/${BACKEND_IMAGE}:${NEW_VERSION}${NC}"
echo -e "  2. 更新服务: ${YELLOW}docker-compose pull && docker-compose up -d${NC}"
echo ""
echo -e "${GREEN}数据库迁移将在容器启动时自动执行！${NC}"
