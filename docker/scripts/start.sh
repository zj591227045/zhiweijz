#!/bin/bash

# 只为记账 Docker 部署启动脚本
# 一键启动完整的应用栈

set -e

# 项目名称
PROJECT_NAME="zhiweijz"

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

# 获取环境变量或默认值
get_env_var() {
    local var_name=$1
    local default_value=$2
    local value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d'=' -f2 || echo "")
    echo "${value:-$default_value}"
}

# 检查Docker是否运行
check_docker() {
    log_info "检查Docker环境..."
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker未运行，请先启动Docker"
        exit 1
    fi
    log_success "Docker环境正常"
}

# 检查Docker Compose是否可用
check_docker_compose() {
    log_info "检查Docker Compose..."
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "Docker Compose未安装"
        exit 1
    fi
    log_success "Docker Compose可用"
}

# 设置Docker镜像源
setup_docker_mirrors() {
    log_info "检查Docker镜像源配置..."

    # 检查是否需要设置镜像源
    if grep -q "docker\.1ms\.run\|docker\.xuanyuan\.me\|dockers\.xuanyuan\.me" docker-compose.yml 2>/dev/null; then
        log_success "Docker镜像源已配置"
        return 0
    fi

    # 询问是否设置镜像源
    echo ""
    log_warning "检测到使用官方Docker镜像源，在中国大陆可能下载较慢"
    read -p "是否自动配置国内镜像源？(Y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "跳过镜像源配置"
        return 0
    fi

    # 运行镜像源设置脚本
    if [ -f "scripts/setup-mirrors.sh" ]; then
        log_info "正在配置Docker镜像源..."
        if ./scripts/setup-mirrors.sh; then
            log_success "Docker镜像源配置完成"
        else
            log_warning "镜像源配置失败，继续使用官方源"
        fi
    else
        log_warning "镜像源设置脚本不存在，跳过配置"
    fi
}

# 清理旧容器
cleanup_old_containers() {
    log_info "清理旧容器..."

    # 停止并删除旧容器
    docker-compose -p "$PROJECT_NAME" down --remove-orphans 2>/dev/null || true

    # 删除悬空镜像
    docker image prune -f >/dev/null 2>&1 || true

    log_success "旧容器清理完成"
}

# 构建镜像
build_images() {
    log_info "构建应用镜像..."

    # 构建后端镜像
    log_info "构建后端镜像..."
    docker-compose -p "$PROJECT_NAME" build backend

    # 构建前端镜像
    log_info "构建前端镜像..."
    docker-compose -p "$PROJECT_NAME" build frontend

    # 构建Nginx镜像
    log_info "构建Nginx镜像..."
    docker-compose -p "$PROJECT_NAME" build nginx

    log_success "所有镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."

    # 启动数据库
    log_info "启动PostgreSQL数据库..."
    docker-compose -p "$PROJECT_NAME" up -d postgres

    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 10

    # 启动后端服务
    log_info "启动后端服务..."
    docker-compose -p "$PROJECT_NAME" up -d backend

    # 等待后端启动
    log_info "等待后端服务启动..."
    sleep 15

    # 启动前端服务
    log_info "启动前端服务..."
    docker-compose -p "$PROJECT_NAME" up -d frontend

    # 等待前端启动
    log_info "等待前端服务启动..."
    sleep 10

    # 启动Nginx
    log_info "启动Nginx反向代理..."
    docker-compose -p "$PROJECT_NAME" up -d nginx

    log_success "所有服务启动完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    # 检查容器状态
    echo ""
    echo "=== 容器状态 ==="
    docker-compose -p "$PROJECT_NAME" ps

    echo ""
    echo "=== 服务健康检查 ==="

    # 获取端口配置
    local http_port=$(get_env_var "NGINX_HTTP_PORT" "80")
    local https_port=$(get_env_var "NGINX_HTTPS_PORT" "443")

    # 检查数据库
    if docker-compose -p "$PROJECT_NAME" exec -T postgres pg_isready -U zhiweijz -d zhiweijz >/dev/null 2>&1; then
        log_success "数据库连接正常"
    else
        log_warning "数据库连接异常"
    fi

    # 检查后端API
    sleep 5
    local api_url="http://localhost:${http_port}/api/health"
    if curl -f "$api_url" >/dev/null 2>&1; then
        log_success "后端API正常"
    else
        log_warning "后端API异常"
    fi

    # 检查前端
    local frontend_url="http://localhost:${http_port}/health"
    if curl -f "$frontend_url" >/dev/null 2>&1; then
        log_success "前端服务正常"
    else
        log_warning "前端服务异常"
    fi
}

# 获取系统IP地址
get_system_ips() {
    local ips=()
    
    # 获取本机IP地址（排除回环地址）
    if command -v ifconfig >/dev/null 2>&1; then
        # macOS/Linux 使用 ifconfig
        local local_ips=$(ifconfig | grep -E "inet [0-9]" | grep -v "127.0.0.1" | awk '{print $2}' | head -3)
        while IFS= read -r ip; do
            [ -n "$ip" ] && ips+=("$ip")
        done <<< "$local_ips"
    elif command -v ip >/dev/null 2>&1; then
        # Linux 使用 ip 命令
        local local_ips=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
        [ -n "$local_ips" ] && ips+=("$local_ips")
        
        # 备用方法：获取所有网络接口IP
        local all_ips=$(ip addr show | grep -E "inet [0-9]" | grep -v "127.0.0.1" | awk '{print $2}' | cut -d'/' -f1 | head -3)
        while IFS= read -r ip; do
            [ -n "$ip" ] && [[ ! " ${ips[@]} " =~ " ${ip} " ]] && ips+=("$ip")
        done <<< "$all_ips"
    fi
    
    # 如果没有找到IP，尝试其他方法
    if [ ${#ips[@]} -eq 0 ]; then
        # 尝试使用 hostname 命令
        local hostname_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
        [ -n "$hostname_ip" ] && ips+=("$hostname_ip")
    fi
    
    # 输出IP地址数组
    printf '%s\n' "${ips[@]}"
}

# 显示访问信息
show_access_info() {
    # 获取端口配置
    local http_port=$(get_env_var "NGINX_HTTP_PORT" "80")
    local https_port=$(get_env_var "NGINX_HTTPS_PORT" "443")
    local db_port=$(get_env_var "POSTGRES_PORT" "5432")
    
    # 获取系统IP地址
    local system_ips=($(get_system_ips))
    
    echo ""
    echo "=================================="
    log_success "🎉 只为记账部署完成！"
    echo "=================================="
    echo ""
    echo -e "${BLUE}访问地址:${NC}"
    
    # 本地访问
    echo -e "${YELLOW}📱 本地访问:${NC}"
    local localhost_http="http://localhost"
    local localhost_https="https://localhost"
    
    if [ "$http_port" != "80" ]; then
        localhost_http="http://localhost:${http_port}"
    fi
    if [ "$https_port" != "443" ]; then
        localhost_https="https://localhost:${https_port}"
    fi
    
    echo -e "  🌐 前端应用: ${YELLOW}${localhost_http}${NC}"
    echo -e "  🔧 API接口: ${YELLOW}${localhost_http}/api${NC}"
    
    # 网络访问
    if [ ${#system_ips[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}🌍 网络访问:${NC}"
        for ip in "${system_ips[@]}"; do
            local network_http="http://${ip}"
            local network_https="https://${ip}"
            
            if [ "$http_port" != "80" ]; then
                network_http="http://${ip}:${http_port}"
            fi
            if [ "$https_port" != "443" ]; then
                network_https="https://${ip}:${https_port}"
            fi
            
            echo -e "  🌐 前端应用: ${YELLOW}${network_http}${NC}"
            echo -e "  🔧 API接口: ${YELLOW}${network_http}/api${NC}"
            
            # 如果配置了HTTPS，也显示HTTPS地址
            if [ "$https_port" != "443" ] || [ -f "/etc/ssl/certs/localhost.crt" ]; then
                echo -e "  🔒 HTTPS访问: ${YELLOW}${network_https}${NC}"
            fi
            echo ""
        done
    else
        echo ""
        log_warning "未能检测到网络IP地址，请手动确认网络访问地址"
    fi
    
    # 数据库访问
    echo -e "${YELLOW}🗄️ 数据库访问:${NC}"
    echo -e "  📍 本地连接: ${YELLOW}localhost:${db_port}${NC}"
    if [ ${#system_ips[@]} -gt 0 ]; then
        for ip in "${system_ips[@]}"; do
            echo -e "  📍 网络连接: ${YELLOW}${ip}:${db_port}${NC}"
        done
    fi
    
    echo ""
    echo -e "${BLUE}数据库信息:${NC}"
    echo -e "  📊 数据库名: ${YELLOW}zhiweijz${NC}"
    echo -e "  👤 用户名: ${YELLOW}zhiweijz${NC}"
    echo -e "  🔑 密码: ${YELLOW}zhiweijz123${NC}"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo -e "  📋 查看日志: ${YELLOW}docker-compose -p ${PROJECT_NAME} logs -f${NC}"
    echo -e "  🔄 重启服务: ${YELLOW}docker-compose -p ${PROJECT_NAME} restart${NC}"
    echo -e "  🛑 停止服务: ${YELLOW}docker-compose -p ${PROJECT_NAME} down${NC}"
    echo -e "  🧹 清理数据: ${YELLOW}docker-compose -p ${PROJECT_NAME} down -v${NC}"
    echo ""
    echo -e "${BLUE}💡 访问提示:${NC}"
    echo -e "  • 本地访问：在本机浏览器中使用 localhost 地址"
    echo -e "  • 网络访问：在同一网络的其他设备上使用 IP 地址访问"
    echo -e "  • 移动设备：确保手机/平板与电脑在同一WiFi网络下"
    echo -e "  • 防火墙：如无法访问，请检查防火墙设置"
    echo ""
    log_success "享受使用只为记账！"
}

# 主函数
main() {
    echo ""
    echo "=================================="
    echo "🚀 只为记账 Docker 部署脚本"
    echo "=================================="
    echo ""

    # 检查环境
    check_docker
    check_docker_compose

    # 设置Docker镜像源
    setup_docker_mirrors

    # 清理旧环境
    cleanup_old_containers

    # 构建镜像
    build_images

    # 启动服务
    start_services

    # 检查服务状态
    check_services

    # 显示访问信息
    show_access_info
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"
