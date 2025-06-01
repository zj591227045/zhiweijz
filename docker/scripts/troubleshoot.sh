#!/bin/bash

# 只为记账 Docker 故障排除脚本
# 用于诊断和解决常见的Docker部署问题

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

# 检查系统信息
check_system_info() {
    echo ""
    echo "=================================="
    echo "🔍 系统信息检查"
    echo "=================================="
    
    log_info "操作系统信息:"
    uname -a
    
    if [ -f /etc/os-release ]; then
        echo ""
        log_info "发行版信息:"
        cat /etc/os-release | grep -E "^(NAME|VERSION)="
    fi
    
    echo ""
    log_info "内存信息:"
    free -h
    
    echo ""
    log_info "磁盘空间:"
    df -h .
    
    echo ""
    log_info "CPU信息:"
    nproc
    cat /proc/cpuinfo | grep "model name" | head -1
}

# 检查Docker环境
check_docker_environment() {
    echo ""
    echo "=================================="
    echo "🐳 Docker 环境检查"
    echo "=================================="
    
    # 检查Docker版本
    log_info "Docker版本:"
    docker --version
    
    # 检查Docker状态
    log_info "Docker服务状态:"
    if systemctl is-active --quiet docker 2>/dev/null; then
        log_success "Docker服务正在运行"
    else
        log_warning "Docker服务状态异常"
    fi
    
    # 检查Docker信息
    echo ""
    log_info "Docker系统信息:"
    docker system info | grep -E "(Server Version|Storage Driver|Logging Driver|Cgroup Driver|Kernel Version)"
    
    # 检查Docker Compose版本
    echo ""
    log_info "Docker Compose版本检查:"
    if docker compose version >/dev/null 2>&1; then
        docker compose version
        log_success "Docker Compose V2 可用"
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose --version
        log_success "Docker Compose V1 可用"
    else
        log_error "Docker Compose 未安装"
    fi
}

# 检查网络连接
check_network() {
    echo ""
    echo "=================================="
    echo "🌐 网络连接检查"
    echo "=================================="
    
    # 检查DNS解析
    log_info "DNS解析测试:"
    if nslookup docker.io >/dev/null 2>&1; then
        log_success "DNS解析正常"
    else
        log_warning "DNS解析可能有问题"
    fi
    
    # 检查Docker Hub连接
    log_info "Docker Hub连接测试:"
    if curl -f -s --connect-timeout 10 https://registry-1.docker.io/v2/ >/dev/null 2>&1; then
        log_success "Docker Hub连接正常"
    else
        log_warning "Docker Hub连接可能有问题"
    fi
}

# 检查资源使用情况
check_resource_usage() {
    echo ""
    echo "=================================="
    echo "📊 资源使用情况"
    echo "=================================="
    
    # 检查内存使用
    log_info "内存使用情况:"
    free -h | grep -E "(Mem|Swap)"
    
    # 检查磁盘使用
    echo ""
    log_info "磁盘使用情况:"
    df -h | grep -E "(Filesystem|/dev/)"
    
    # 检查Docker空间使用
    echo ""
    log_info "Docker空间使用:"
    docker system df 2>/dev/null || log_warning "无法获取Docker空间信息"
}

# 清理Docker环境
cleanup_docker() {
    echo ""
    echo "=================================="
    echo "🧹 Docker 环境清理"
    echo "=================================="
    
    log_info "停止所有容器..."
    docker stop $(docker ps -q) 2>/dev/null || log_info "没有运行中的容器"
    
    log_info "删除所有容器..."
    docker rm $(docker ps -aq) 2>/dev/null || log_info "没有容器需要删除"
    
    log_info "清理未使用的镜像..."
    docker image prune -f
    
    log_info "清理未使用的网络..."
    docker network prune -f
    
    log_info "清理未使用的卷..."
    docker volume prune -f
    
    log_success "Docker环境清理完成"
}

# 测试基本Docker功能
test_docker_basic() {
    echo ""
    echo "=================================="
    echo "🧪 Docker 基本功能测试"
    echo "=================================="
    
    log_info "测试Docker基本功能..."
    
    # 测试运行简单容器
    if docker run --rm hello-world >/dev/null 2>&1; then
        log_success "Docker基本功能正常"
    else
        log_error "Docker基本功能异常"
        return 1
    fi
    
    # 测试Docker Compose
    log_info "测试Docker Compose功能..."
    
    # 创建临时测试文件
    cat > /tmp/test-compose.yml << EOF
version: '3.8'
services:
  test:
    image: alpine:latest
    command: echo "Docker Compose test successful"
EOF
    
    local compose_cmd=""
    if docker compose version >/dev/null 2>&1; then
        compose_cmd="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        compose_cmd="docker-compose"
    else
        log_error "Docker Compose不可用"
        return 1
    fi
    
    if $compose_cmd -f /tmp/test-compose.yml up --remove-orphans >/dev/null 2>&1; then
        log_success "Docker Compose功能正常"
    else
        log_error "Docker Compose功能异常"
        return 1
    fi
    
    # 清理测试文件
    rm -f /tmp/test-compose.yml
}

# 修复常见问题
fix_common_issues() {
    echo ""
    echo "=================================="
    echo "🔧 修复常见问题"
    echo "=================================="
    
    # 重启Docker服务
    log_info "重启Docker服务..."
    if sudo systemctl restart docker 2>/dev/null; then
        log_success "Docker服务重启成功"
        sleep 5
    else
        log_warning "无法重启Docker服务，可能需要手动重启"
    fi
    
    # 更新Docker Compose
    log_info "检查Docker Compose更新..."
    if command -v docker-compose >/dev/null 2>&1; then
        local current_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_info "当前Docker Compose版本: $current_version"
        log_info "建议使用Docker Compose V2 (docker compose)"
    fi
}

# 生成诊断报告
generate_report() {
    local report_file="docker-diagnostic-$(date +%Y%m%d-%H%M%S).txt"
    
    echo ""
    echo "=================================="
    echo "📋 生成诊断报告"
    echo "=================================="
    
    {
        echo "只为记账 Docker 诊断报告"
        echo "生成时间: $(date)"
        echo "=================================="
        echo ""
        
        echo "系统信息:"
        uname -a
        echo ""
        
        echo "Docker版本:"
        docker --version
        echo ""
        
        echo "Docker Compose版本:"
        if docker compose version >/dev/null 2>&1; then
            docker compose version
        elif command -v docker-compose >/dev/null 2>&1; then
            docker-compose --version
        else
            echo "Docker Compose 未安装"
        fi
        echo ""
        
        echo "内存信息:"
        free -h
        echo ""
        
        echo "磁盘空间:"
        df -h
        echo ""
        
        echo "Docker系统信息:"
        docker system info 2>/dev/null || echo "无法获取Docker系统信息"
        echo ""
        
        echo "运行中的容器:"
        docker ps 2>/dev/null || echo "无法获取容器信息"
        echo ""
        
        echo "Docker网络:"
        docker network ls 2>/dev/null || echo "无法获取网络信息"
        echo ""
        
    } > "$report_file"
    
    log_success "诊断报告已生成: $report_file"
}

# 显示解决方案建议
show_solutions() {
    echo ""
    echo "=================================="
    echo "💡 常见问题解决方案"
    echo "=================================="
    
    echo -e "${YELLOW}段错误 (Segmentation fault) 解决方案:${NC}"
    echo "1. 重启Docker服务: sudo systemctl restart docker"
    echo "2. 更新Docker到最新版本"
    echo "3. 使用Docker Compose V2: docker compose 而不是 docker-compose"
    echo "4. 增加系统内存或清理磁盘空间"
    echo "5. 检查内核版本兼容性"
    echo ""
    
    echo -e "${YELLOW}内存不足解决方案:${NC}"
    echo "1. 关闭不必要的应用程序"
    echo "2. 增加交换空间"
    echo "3. 升级系统内存"
    echo ""
    
    echo -e "${YELLOW}网络问题解决方案:${NC}"
    echo "1. 检查防火墙设置"
    echo "2. 配置Docker镜像源"
    echo "3. 检查DNS设置"
    echo ""
    
    echo -e "${YELLOW}权限问题解决方案:${NC}"
    echo "1. 将用户添加到docker组: sudo usermod -aG docker \$USER"
    echo "2. 重新登录或重启系统"
    echo "3. 使用sudo运行Docker命令"
    echo ""
}

# 主菜单
show_menu() {
    echo ""
    echo "=================================="
    echo "🛠️  只为记账 Docker 故障排除工具"
    echo "=================================="
    echo ""
    echo "请选择操作:"
    echo "1. 完整系统检查"
    echo "2. 检查Docker环境"
    echo "3. 测试Docker功能"
    echo "4. 清理Docker环境"
    echo "5. 修复常见问题"
    echo "6. 生成诊断报告"
    echo "7. 查看解决方案建议"
    echo "8. 退出"
    echo ""
    read -p "请输入选项 (1-8): " choice
    
    case $choice in
        1)
            check_system_info
            check_docker_environment
            check_network
            check_resource_usage
            ;;
        2)
            check_docker_environment
            ;;
        3)
            test_docker_basic
            ;;
        4)
            read -p "确定要清理Docker环境吗？这将删除所有容器和未使用的资源 (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                cleanup_docker
            else
                log_info "取消清理操作"
            fi
            ;;
        5)
            fix_common_issues
            ;;
        6)
            generate_report
            ;;
        7)
            show_solutions
            ;;
        8)
            log_info "退出故障排除工具"
            exit 0
            ;;
        *)
            log_error "无效选项，请重新选择"
            show_menu
            ;;
    esac
}

# 主函数
main() {
    # 检查是否以root权限运行
    if [ "$EUID" -eq 0 ]; then
        log_warning "建议不要以root权限运行此脚本"
    fi
    
    # 显示菜单
    while true; do
        show_menu
        echo ""
        read -p "是否继续使用故障排除工具？(Y/n): " continue_choice
        if [[ $continue_choice =~ ^[Nn]$ ]]; then
            break
        fi
    done
    
    log_success "感谢使用只为记账故障排除工具！"
}

# 执行主函数
main "$@" 