#!/bin/bash

# 只为记账 Docker 镜像源设置脚本
# 自动检测并配置最快的Docker镜像源

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 镜像源列表
MIRRORS=(
    "https://docker.1ms.run"
    "https://docker.xuanyuan.me"
    "https://dockers.xuanyuan.me"
    "https://docker.m.daocloud.io"
    "https://dockerproxy.com"
    "https://mirror.baidubce.com"
    "https://ccr.ccs.tencentyun.com"
)

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

# 测试镜像源连通性
test_mirror() {
    local mirror=$1
    log_info "测试镜像源: $mirror"
    
    # 测试连通性（超时5秒）
    if curl -s --connect-timeout 5 --max-time 10 "$mirror/v2/" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 查找最快的镜像源
find_fastest_mirror() {
    log_info "正在测试镜像源连通性..."
    
    local fastest_mirror=""
    local fastest_time=999999
    
    for mirror in "${MIRRORS[@]}"; do
        log_info "测试: $mirror"
        
        # 测试连通性和响应时间
        local start_time=$(date +%s%N)
        if curl -s --connect-timeout 5 --max-time 10 "$mirror/v2/" >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
            
            log_success "✅ $mirror - 响应时间: ${response_time}ms"
            
            if [ $response_time -lt $fastest_time ]; then
                fastest_time=$response_time
                fastest_mirror=$mirror
            fi
        else
            log_warning "❌ $mirror - 连接失败"
        fi
    done
    
    if [ -n "$fastest_mirror" ]; then
        log_success "最快镜像源: $fastest_mirror (${fastest_time}ms)"
        echo "$fastest_mirror"
        return 0
    else
        log_error "未找到可用的镜像源"
        return 1
    fi
}

# 更新docker-compose.yml文件
update_compose_file() {
    local mirror=$1
    local compose_file="docker-compose.yml"
    
    if [ ! -f "$compose_file" ]; then
        log_error "未找到 $compose_file 文件"
        return 1
    fi
    
    log_info "更新 $compose_file 使用镜像源: $mirror"
    
    # 备份原文件
    cp "$compose_file" "${compose_file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 更新PostgreSQL镜像
    if grep -q "image:.*postgres:" "$compose_file"; then
        sed -i.tmp "s|image: .*postgres:|image: ${mirror}/postgres:|g" "$compose_file"
        rm -f "${compose_file}.tmp"
        log_success "✅ PostgreSQL镜像源已更新"
    fi
    
    # 更新其他可能的镜像
    if grep -q "image:.*nginx:" "$compose_file"; then
        sed -i.tmp "s|image: .*nginx:|image: ${mirror}/nginx:|g" "$compose_file"
        rm -f "${compose_file}.tmp"
        log_success "✅ Nginx镜像源已更新"
    fi
    
    if grep -q "image:.*redis:" "$compose_file"; then
        sed -i.tmp "s|image: .*redis:|image: ${mirror}/redis:|g" "$compose_file"
        rm -f "${compose_file}.tmp"
        log_success "✅ Redis镜像源已更新"
    fi
}

# 测试镜像拉取
test_image_pull() {
    local mirror=$1
    log_info "测试镜像拉取..."
    
    # 尝试拉取一个小镜像进行测试
    local test_image="${mirror}/hello-world:latest"
    
    if docker pull "$test_image" >/dev/null 2>&1; then
        log_success "✅ 镜像拉取测试成功"
        # 清理测试镜像
        docker rmi "$test_image" >/dev/null 2>&1 || true
        return 0
    else
        log_warning "❌ 镜像拉取测试失败"
        return 1
    fi
}

# 显示使用说明
show_usage() {
    echo "使用方法:"
    echo "  $0                    自动选择最快的镜像源"
    echo "  $0 --mirror <URL>     使用指定的镜像源"
    echo "  $0 --test             仅测试镜像源连通性"
    echo "  $0 --restore          恢复原始配置"
    echo "  $0 --help             显示此帮助信息"
    echo ""
    echo "可用的镜像源:"
    for mirror in "${MIRRORS[@]}"; do
        echo "  - $mirror"
    done
}

# 恢复原始配置
restore_config() {
    local compose_file="docker-compose.yml"
    local backup_file=$(ls -t "${compose_file}.backup."* 2>/dev/null | head -n1)
    
    if [ -n "$backup_file" ] && [ -f "$backup_file" ]; then
        cp "$backup_file" "$compose_file"
        log_success "✅ 配置已恢复到: $backup_file"
    else
        log_warning "未找到备份文件，手动恢复镜像源配置"
        # 恢复为官方镜像
        sed -i.tmp 's|image: .*/postgres:|image: postgres:|g' "$compose_file"
        sed -i.tmp 's|image: .*/nginx:|image: nginx:|g' "$compose_file"
        sed -i.tmp 's|image: .*/redis:|image: redis:|g' "$compose_file"
        rm -f "${compose_file}.tmp"
        log_success "✅ 已恢复为官方镜像源"
    fi
}

# 主函数
main() {
    echo ""
    echo "=================================="
    echo "🐳 只为记账 Docker 镜像源设置"
    echo "=================================="
    echo ""
    
    case "${1:-}" in
        --help)
            show_usage
            exit 0
            ;;
        --test)
            log_info "测试所有镜像源连通性..."
            for mirror in "${MIRRORS[@]}"; do
                if test_mirror "$mirror"; then
                    log_success "✅ $mirror"
                else
                    log_warning "❌ $mirror"
                fi
            done
            exit 0
            ;;
        --restore)
            restore_config
            exit 0
            ;;
        --mirror)
            if [ -z "${2:-}" ]; then
                log_error "请指定镜像源URL"
                show_usage
                exit 1
            fi
            SELECTED_MIRROR="$2"
            ;;
        "")
            # 自动选择最快镜像源
            if SELECTED_MIRROR=$(find_fastest_mirror); then
                log_success "自动选择镜像源: $SELECTED_MIRROR"
            else
                log_error "无法找到可用的镜像源"
                exit 1
            fi
            ;;
        *)
            log_error "未知参数: $1"
            show_usage
            exit 1
            ;;
    esac
    
    # 更新配置文件
    if update_compose_file "$SELECTED_MIRROR"; then
        echo ""
        log_success "🎉 镜像源配置完成！"
        echo ""
        echo -e "${BLUE}使用的镜像源:${NC} $SELECTED_MIRROR"
        echo ""
        echo -e "${BLUE}下一步操作:${NC}"
        echo -e "  1. 运行 ${YELLOW}./scripts/start.sh${NC} 启动服务"
        echo -e "  2. 或运行 ${YELLOW}docker-compose pull${NC} 预拉取镜像"
        echo ""
        
        # 可选：测试镜像拉取
        read -p "是否测试镜像拉取？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            test_image_pull "$SELECTED_MIRROR"
        fi
    else
        log_error "镜像源配置失败"
        exit 1
    fi
}

# 检查Docker是否运行
if ! docker info >/dev/null 2>&1; then
    log_error "Docker未运行，请先启动Docker"
    exit 1
fi

# 执行主函数
main "$@"
