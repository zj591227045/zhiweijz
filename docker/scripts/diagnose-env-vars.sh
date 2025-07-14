#!/bin/bash

# Docker环境变量诊断脚本
# 用于诊断生产环境下数据库连接配置问题

set -e

# 设置脚本权限
chmod +x "$0" 2>/dev/null || true

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=================================="
echo "🔍 Docker环境变量诊断工具"
echo "=================================="
echo ""

# 检查当前目录
if [ ! -f "docker-compose.yml" ]; then
    log_error "请在docker目录下运行此脚本"
    exit 1
fi

# 1. 检查.env文件
log_info "1. 检查环境变量文件..."
if [ -f ".env" ]; then
    log_success "✅ .env文件存在"
    echo "   文件内容预览："
    echo "   ===================="
    head -20 .env | while read line; do
        if [[ $line =~ ^[[:space:]]*# ]] || [[ -z $line ]]; then
            echo "   $line"
        else
            key=$(echo "$line" | cut -d'=' -f1)
            echo "   $key=***"
        fi
    done
    echo "   ===================="
else
    log_warning "⚠️ .env文件不存在，将使用默认值"
fi

echo ""

# 2. 检查Docker Compose环境变量替换
log_info "2. 检查Docker Compose环境变量配置..."

# 读取.env文件中的数据库配置
if [ -f ".env" ]; then
    DB_NAME=$(grep "^DB_NAME=" .env 2>/dev/null | cut -d'=' -f2 || echo "")
    DB_USER=$(grep "^DB_USER=" .env 2>/dev/null | cut -d'=' -f2 || echo "")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env 2>/dev/null | cut -d'=' -f2 || echo "")
    JWT_SECRET=$(grep "^JWT_SECRET=" .env 2>/dev/null | cut -d'=' -f2 || echo "")
else
    DB_NAME=""
    DB_USER=""
    DB_PASSWORD=""
    JWT_SECRET=""
fi

# 显示将要使用的配置
echo "   数据库配置（从.env文件读取）："
echo "   DB_NAME: ${DB_NAME:-zhiweijz} (默认值)"
echo "   DB_USER: ${DB_USER:-zhiweijz} (默认值)"
echo "   DB_PASSWORD: ${DB_PASSWORD:+***} ${DB_PASSWORD:-zhiweijz123 (默认值)}"
echo "   JWT_SECRET: ${JWT_SECRET:+***} ${JWT_SECRET:-默认值}"

echo ""

# 3. 检查Docker Compose配置
log_info "3. 检查Docker Compose配置..."
if grep -q "DATABASE_URL.*postgresql://" docker-compose.yml; then
    log_success "✅ Docker Compose中DATABASE_URL配置正确"
    database_url_line=$(grep "DATABASE_URL.*postgresql://" docker-compose.yml)
    echo "   配置行: $database_url_line"
else
    log_error "❌ Docker Compose中DATABASE_URL配置有问题"
fi

echo ""

# 4. 模拟环境变量替换
log_info "4. 模拟环境变量替换结果..."
final_db_name=${DB_NAME:-zhiweijz}
final_db_user=${DB_USER:-zhiweijz}
final_db_password=${DB_PASSWORD:-zhiweijz123}
final_database_url="postgresql://${final_db_user}:${final_db_password}@postgres:5432/${final_db_name}"

echo "   最终DATABASE_URL: $final_database_url"

echo ""

# 5. 检查容器是否运行
log_info "5. 检查容器状态..."
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "zhiweijz-backend"; then
    log_success "✅ 后端容器正在运行"
    
    # 检查容器内的环境变量
    log_info "6. 检查容器内环境变量..."
    echo "   容器内DATABASE_URL:"
    docker exec zhiweijz-backend printenv DATABASE_URL 2>/dev/null || log_warning "   无法获取容器内DATABASE_URL"
    
    echo "   容器内NODE_ENV:"
    docker exec zhiweijz-backend printenv NODE_ENV 2>/dev/null || log_warning "   无法获取容器内NODE_ENV"
    
    echo "   容器内DOCKER_ENV:"
    docker exec zhiweijz-backend printenv DOCKER_ENV 2>/dev/null || log_warning "   无法获取容器内DOCKER_ENV"
    
    # 检查容器内是否存在.env文件
    log_info "7. 检查容器内.env文件..."
    if docker exec zhiweijz-backend test -f .env 2>/dev/null; then
        log_warning "⚠️ 容器内存在.env文件，可能覆盖Docker环境变量"
        echo "   容器内.env文件内容："
        docker exec zhiweijz-backend head -10 .env 2>/dev/null | while read line; do
            if [[ $line =~ ^[[:space:]]*# ]] || [[ -z $line ]]; then
                echo "   $line"
            else
                key=$(echo "$line" | cut -d'=' -f1)
                echo "   $key=***"
            fi
        done
    else
        log_success "✅ 容器内不存在.env文件，环境变量来源正确"
    fi
    
else
    log_warning "⚠️ 后端容器未运行"
fi

echo ""

# 6. 检查数据库容器
log_info "8. 检查数据库容器..."
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "zhiweijz-postgres"; then
    log_success "✅ 数据库容器正在运行"
    
    echo "   数据库容器环境变量:"
    echo "   POSTGRES_DB: $(docker exec zhiweijz-postgres printenv POSTGRES_DB 2>/dev/null || echo '获取失败')"
    echo "   POSTGRES_USER: $(docker exec zhiweijz-postgres printenv POSTGRES_USER 2>/dev/null || echo '获取失败')"
    echo "   POSTGRES_PASSWORD: $(docker exec zhiweijz-postgres printenv POSTGRES_PASSWORD 2>/dev/null | sed 's/./*/g' || echo '获取失败')"
else
    log_warning "⚠️ 数据库容器未运行"
fi

echo ""

# 7. 测试数据库连接
log_info "9. 测试数据库连接..."
if docker ps --format "table {{.Names}}" | grep -q "zhiweijz-postgres" && docker ps --format "table {{.Names}}" | grep -q "zhiweijz-backend"; then
    log_info "   从后端容器测试数据库连接..."
    if docker exec zhiweijz-backend bash -c "echo 'SELECT 1;' | npx prisma db execute --stdin" >/dev/null 2>&1; then
        log_success "✅ 数据库连接测试成功"
    else
        log_error "❌ 数据库连接测试失败"
        echo "   请检查："
        echo "   1. 数据库配置是否正确"
        echo "   2. 网络连接是否正常"
        echo "   3. 数据库是否已完全启动"
    fi
else
    log_warning "⚠️ 容器未运行，跳过连接测试"
fi

echo ""
echo "=================================="
echo "🎯 诊断总结"
echo "=================================="

# 总结建议
if [ -f ".env" ]; then
    log_info "✅ 环境变量文件配置正常"
else
    log_warning "⚠️ 建议创建.env文件以自定义配置"
fi

echo ""
log_info "如果仍有问题，请检查："
echo "1. .env文件中的数据库配置是否正确"
echo "2. 容器内是否存在覆盖环境变量的.env文件"
echo "3. Docker Compose环境变量替换是否正常工作"
echo "4. 数据库容器是否完全启动"
echo ""
