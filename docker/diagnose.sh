#!/bin/bash

# 只为记账 Docker 问题诊断脚本

# 设置颜色
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
echo "🔍 只为记账 Docker 问题诊断"
echo "=================================="
echo ""

# 检查容器状态
log_info "检查容器状态..."
echo ""
docker-compose -p zhiweijz ps
echo ""

# 检查网络
log_info "检查Docker网络..."
if docker network ls | grep -q "zhiweijz-network"; then
    log_success "Docker网络存在"
    echo ""
    echo "网络中的容器:"
    docker network inspect zhiweijz-network --format='{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}' 2>/dev/null
else
    log_warning "Docker网络不存在"
fi
echo ""

# 检查Nginx配置
log_info "检查Nginx配置..."
if [ -f "config/nginx.conf" ]; then
    log_success "Nginx配置文件存在"
    
    # 检查前端upstream配置
    frontend_upstream=$(grep -A 2 "upstream frontend" config/nginx.conf | grep "server" | awk '{print $2}' | tr -d ';')
    if [ "$frontend_upstream" = "zhiweijz-frontend:3001" ]; then
        log_success "✓ 前端upstream配置正确: $frontend_upstream"
    else
        log_warning "✗ 前端upstream配置可能有问题: $frontend_upstream"
    fi
    
    # 检查后端upstream配置
    backend_upstream=$(grep -A 2 "upstream backend" config/nginx.conf | grep "server" | awk '{print $2}' | tr -d ';')
    if [ "$backend_upstream" = "zhiweijz-backend:3000" ]; then
        log_success "✓ 后端upstream配置正确: $backend_upstream"
    else
        log_warning "✗ 后端upstream配置可能有问题: $backend_upstream"
    fi
else
    log_error "Nginx配置文件不存在"
fi
echo ""

# 检查容器内部服务
log_info "检查容器内部服务..."

# 检查前端容器
if docker ps --format "table {{.Names}}" | grep -q "zhiweijz-frontend"; then
    log_info "测试前端容器内部服务..."
    if docker exec zhiweijz-frontend curl -f http://localhost:3001/ >/dev/null 2>&1; then
        log_success "✓ 前端容器内部服务正常 (3001端口)"
    else
        log_warning "✗ 前端容器内部服务异常"
        echo "前端容器日志 (最后10行):"
        docker logs zhiweijz-frontend --tail=10
    fi
else
    log_warning "前端容器不存在或未运行"
fi
echo ""

# 检查后端容器
if docker ps --format "table {{.Names}}" | grep -q "zhiweijz-backend"; then
    log_info "测试后端容器内部服务..."
    if docker exec zhiweijz-backend curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "✓ 后端容器内部服务正常 (3000端口)"
    else
        log_warning "✗ 后端容器内部服务异常"
        echo "后端容器日志 (最后10行):"
        docker logs zhiweijz-backend --tail=10
    fi
else
    log_warning "后端容器不存在或未运行"
fi
echo ""

# 检查Nginx容器
if docker ps --format "table {{.Names}}" | grep -q "zhiweijz-nginx"; then
    log_info "测试Nginx容器连通性..."
    
    # 测试到后端的连接
    if docker exec zhiweijz-nginx nc -z zhiweijz-backend 3000 2>/dev/null; then
        log_success "✓ Nginx -> 后端连通"
    else
        log_warning "✗ Nginx -> 后端不通"
    fi
    
    # 测试到前端的连接
    if docker exec zhiweijz-nginx nc -z zhiweijz-frontend 3001 2>/dev/null; then
        log_success "✓ Nginx -> 前端连通"
    else
        log_warning "✗ Nginx -> 前端不通"
    fi
    
    # 检查Nginx配置
    log_info "检查Nginx容器内配置..."
    nginx_frontend_config=$(docker exec zhiweijz-nginx grep -A 2 "upstream frontend" /etc/nginx/nginx.conf | grep "server" | awk '{print $2}' | tr -d ';' 2>/dev/null)
    if [ "$nginx_frontend_config" = "zhiweijz-frontend:3001" ]; then
        log_success "✓ Nginx容器内前端配置正确"
    else
        log_warning "✗ Nginx容器内前端配置错误: $nginx_frontend_config"
        log_info "这说明需要重新构建Nginx镜像或使用配置文件挂载"
    fi
    
    echo ""
    echo "Nginx错误日志 (最后10行):"
    docker logs zhiweijz-nginx --tail=10
else
    log_warning "Nginx容器不存在或未运行"
fi
echo ""

# 提供解决方案
echo "=================================="
log_info "🛠️ 问题解决建议"
echo "=================================="
echo ""

log_info "1. 如果前端容器启动失败："
echo "   - 检查前端镜像版本是否支持3001端口"
echo "   - 重新拉取前端镜像: docker pull zj591227045/zhiweijz-frontend:0.1.2"
echo ""

log_info "2. 如果Nginx代理配置错误："
echo "   - 方案A: 使用配置文件挂载 (推荐，已在docker-compose.yml中配置)"
echo "   - 方案B: 重新构建Nginx镜像:"
echo "     cd .."
echo "     docker build -f docker/config/nginx.Dockerfile -t zj591227045/zhiweijz-nginx:latest ."
echo ""

log_info "3. 重新启动服务："
echo "   docker-compose -p zhiweijz down"
echo "   ./start.sh"
echo ""

log_success "诊断完成！"
