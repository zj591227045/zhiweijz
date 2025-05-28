#!/bin/bash

# Ubuntu Docker Daemon 镜像源配置脚本
# 配置系统级别的Docker镜像源

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

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "此脚本需要root权限运行"
        echo "请使用: sudo $0"
        exit 1
    fi
}

# 备份现有配置
backup_config() {
    local config_file="/etc/docker/daemon.json"
    if [ -f "$config_file" ]; then
        local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$config_file" "$backup_file"
        log_info "已备份现有配置到: $backup_file"
    fi
}

# 配置Docker镜像源
configure_docker_mirrors() {
    local config_file="/etc/docker/daemon.json"
    local config_dir="/etc/docker"
    
    # 创建配置目录
    mkdir -p "$config_dir"
    
    # 创建或更新daemon.json
    cat > "$config_file" << 'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://ccr.ccs.tencentyun.com",
    "https://docker.xuanyuan.me",
    "https://dockers.xuanyuan.me"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF
    
    log_success "Docker镜像源配置已更新"
}

# 重启Docker服务
restart_docker() {
    log_info "重启Docker服务..."
    
    if systemctl restart docker; then
        log_success "Docker服务重启成功"
    else
        log_error "Docker服务重启失败"
        return 1
    fi
    
    # 等待Docker服务启动
    sleep 5
    
    # 检查Docker状态
    if systemctl is-active --quiet docker; then
        log_success "Docker服务运行正常"
    else
        log_error "Docker服务启动异常"
        return 1
    fi
}

# 测试镜像源
test_mirrors() {
    log_info "测试镜像源配置..."
    
    # 显示当前配置
    echo ""
    echo "当前Docker镜像源配置："
    docker info | grep -A 10 "Registry Mirrors:" || echo "未找到镜像源配置"
    
    echo ""
    log_info "测试拉取镜像..."
    
    # 测试拉取hello-world镜像
    if docker pull hello-world:latest; then
        log_success "✅ 镜像拉取测试成功"
        # 清理测试镜像
        docker rmi hello-world:latest >/dev/null 2>&1 || true
        return 0
    else
        log_warning "❌ 镜像拉取测试失败"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Ubuntu Docker Daemon 镜像源配置脚本"
    echo ""
    echo "使用方法:"
    echo "  sudo $0                配置Docker镜像源"
    echo "  sudo $0 --test         仅测试当前配置"
    echo "  sudo $0 --restore      恢复原始配置"
    echo "  sudo $0 --help         显示此帮助信息"
    echo ""
    echo "注意: 此脚本需要root权限运行"
}

# 恢复原始配置
restore_config() {
    local config_file="/etc/docker/daemon.json"
    local backup_file=$(ls -t "${config_file}.backup."* 2>/dev/null | head -n1)
    
    if [ -n "$backup_file" ] && [ -f "$backup_file" ]; then
        cp "$backup_file" "$config_file"
        log_success "✅ 配置已恢复到: $backup_file"
        restart_docker
    else
        log_warning "未找到备份文件，删除当前配置"
        rm -f "$config_file"
        log_success "✅ 已删除镜像源配置，恢复为默认设置"
        restart_docker
    fi
}

# 主函数
main() {
    echo ""
    echo "=================================="
    echo "🐳 Ubuntu Docker 镜像源配置"
    echo "=================================="
    echo ""
    
    case "${1:-}" in
        --help)
            show_help
            exit 0
            ;;
        --test)
            test_mirrors
            exit 0
            ;;
        --restore)
            check_root
            restore_config
            exit 0
            ;;
        "")
            check_root
            backup_config
            configure_docker_mirrors
            restart_docker
            test_mirrors
            
            echo ""
            log_success "🎉 Docker镜像源配置完成！"
            echo ""
            echo -e "${BLUE}配置的镜像源:${NC}"
            echo -e "  • https://docker.m.daocloud.io"
            echo -e "  • https://docker.1ms.run"
            echo -e "  • https://ccr.ccs.tencentyun.com"
            echo -e "  • https://docker.xuanyuan.me"
            echo -e "  • https://dockers.xuanyuan.me"
            echo ""
            echo -e "${BLUE}下一步操作:${NC}"
            echo -e "  运行 ${YELLOW}./scripts/start.sh${NC} 启动应用"
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 