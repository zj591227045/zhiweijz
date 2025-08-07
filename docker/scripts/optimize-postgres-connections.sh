#!/bin/bash

# PostgreSQL连接数优化脚本
# 用于重启PostgreSQL服务以应用新的连接数配置

set -e

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
echo "🔧 PostgreSQL连接数优化工具"
echo "=================================="
echo ""

# 检查当前目录
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose-fnOS.yml" ]; then
    log_error "请在docker目录下运行此脚本"
    exit 1
fi

# 选择合适的compose文件
COMPOSE_FILE="docker-compose.yml"
if [ -f "docker-compose-fnOS.yml" ]; then
    COMPOSE_FILE="docker-compose-fnOS.yml"
    log_info "使用fnOS配置文件: $COMPOSE_FILE"
else
    log_info "使用标准配置文件: $COMPOSE_FILE"
fi

# 检测Docker Compose命令
detect_compose_command() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        log_error "未找到Docker Compose命令"
        exit 1
    fi
}

COMPOSE_CMD=$(detect_compose_command)
log_info "使用Docker Compose命令: $COMPOSE_CMD"

echo ""
log_info "当前PostgreSQL配置优化包括："
echo "   - max_connections: 200 (默认100)"
echo "   - shared_buffers: 256MB (默认128MB)"
echo "   - effective_cache_size: 1GB"
echo "   - work_mem: 4MB"
echo "   - maintenance_work_mem: 64MB"
echo ""

# 检查PostgreSQL容器状态
POSTGRES_CONTAINER=""
if [ "$COMPOSE_FILE" = "docker-compose-fnOS.yml" ]; then
    POSTGRES_CONTAINER="zhiweijz-postgres"
else
    # 从环境变量或默认值获取项目名称
    PROJECT_NAME=${PROJECT_NAME:-zhiweijz}
    POSTGRES_CONTAINER="${PROJECT_NAME}-postgres"
fi

log_info "检查PostgreSQL容器状态..."
if docker ps --format "table {{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
    log_success "PostgreSQL容器正在运行: $POSTGRES_CONTAINER"
    CONTAINER_RUNNING=true
else
    log_warning "PostgreSQL容器未运行: $POSTGRES_CONTAINER"
    CONTAINER_RUNNING=false
fi

echo ""

# 如果容器正在运行，询问是否重启
if [ "$CONTAINER_RUNNING" = true ]; then
    echo "为了应用新的PostgreSQL配置，需要重启数据库容器。"
    echo "这将暂时中断数据库连接（通常几秒钟）。"
    echo ""
    read -p "是否继续重启PostgreSQL容器？(y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
    
    echo ""
    log_info "重启PostgreSQL容器..."
    
    # 重启PostgreSQL服务
    $COMPOSE_CMD -f $COMPOSE_FILE restart postgres
    
    # 等待容器启动
    log_info "等待PostgreSQL容器启动..."
    sleep 5
    
    # 检查容器健康状态
    log_info "检查PostgreSQL容器健康状态..."
    for i in {1..30}; do
        if docker exec $POSTGRES_CONTAINER pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL容器已就绪"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL容器启动超时"
            exit 1
        fi
        
        echo -n "."
        sleep 1
    done
    
else
    log_info "启动PostgreSQL容器..."
    $COMPOSE_CMD -f $COMPOSE_FILE up -d postgres
    
    # 等待容器启动
    log_info "等待PostgreSQL容器启动..."
    sleep 10
    
    # 检查容器健康状态
    log_info "检查PostgreSQL容器健康状态..."
    for i in {1..30}; do
        if docker exec $POSTGRES_CONTAINER pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL容器已就绪"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL容器启动超时"
            exit 1
        fi
        
        echo -n "."
        sleep 1
    done
fi

echo ""

# 验证新配置
log_info "验证PostgreSQL配置..."

# 检查最大连接数
MAX_CONNECTIONS=$(docker exec $POSTGRES_CONTAINER psql -U postgres -t -c "SHOW max_connections;" 2>/dev/null | xargs || echo "未知")
log_info "当前最大连接数: $MAX_CONNECTIONS"

# 检查共享缓冲区
SHARED_BUFFERS=$(docker exec $POSTGRES_CONTAINER psql -U postgres -t -c "SHOW shared_buffers;" 2>/dev/null | xargs || echo "未知")
log_info "当前共享缓冲区: $SHARED_BUFFERS"

# 检查当前连接数
CURRENT_CONNECTIONS=$(docker exec $POSTGRES_CONTAINER psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "未知")
log_info "当前活跃连接数: $CURRENT_CONNECTIONS"

echo ""

if [ "$MAX_CONNECTIONS" = "200" ]; then
    log_success "✅ PostgreSQL配置优化成功！"
    echo ""
    echo "优化后的配置："
    echo "   - 最大连接数: $MAX_CONNECTIONS"
    echo "   - 共享缓冲区: $SHARED_BUFFERS"
    echo "   - 当前连接数: $CURRENT_CONNECTIONS"
    echo ""
    echo "建议："
    echo "   1. 监控应用程序的数据库连接使用情况"
    echo "   2. 如果仍然出现连接数问题，可以进一步调整Prisma连接池配置"
    echo "   3. 考虑在应用程序中实现连接池管理"
else
    log_warning "⚠️ PostgreSQL配置可能未完全生效"
    echo ""
    echo "当前配置："
    echo "   - 最大连接数: $MAX_CONNECTIONS (期望: 200)"
    echo "   - 共享缓冲区: $SHARED_BUFFERS"
    echo ""
    echo "可能的原因："
    echo "   1. 容器启动时间较长，配置尚未完全加载"
    echo "   2. Docker Compose文件配置有误"
    echo "   3. 容器内存限制导致配置无法应用"
    echo ""
    echo "建议："
    echo "   1. 等待几分钟后重新运行此脚本检查"
    echo "   2. 检查Docker容器日志: docker logs $POSTGRES_CONTAINER"
    echo "   3. 手动连接数据库验证配置"
fi

echo ""
log_info "脚本执行完成"
