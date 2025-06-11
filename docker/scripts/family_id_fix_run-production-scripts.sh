#!/bin/bash

# Docker环境下运行生产修复脚本
# 使用方法：
# ./docker/scripts/run-production-scripts.sh analysis
# ./docker/scripts/run-production-scripts.sh fix --batch-size=500 --dry-run
# ./docker/scripts/run-production-scripts.sh fix --batch-size=500 --execute
# ./docker/scripts/run-production-scripts.sh rollback --report-file=fix-report-xxx.json --dry-run

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本配置
DOCKER_COMPOSE_FILE="docker/docker-compose.yml"
BACKEND_CONTAINER="zhiweijz-backend"
SCRIPTS_DIR="/app/src/scripts"

# 检查Docker Compose文件是否存在
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Docker Compose文件不存在: $DOCKER_COMPOSE_FILE${NC}"
    exit 1
fi

# 检查后端容器是否运行
check_backend_container() {
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "$BACKEND_CONTAINER.*Up"; then
        echo -e "${RED}❌ 后端容器未运行，请先启动服务${NC}"
        echo -e "${BLUE}💡 启动命令: docker-compose -f $DOCKER_COMPOSE_FILE up -d${NC}"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}Docker环境生产脚本执行工具${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 <command> [options]"
    echo ""
    echo "命令:"
    echo -e "  ${GREEN}analysis${NC}                     - 分析生产数据"
    echo -e "  ${GREEN}fix${NC} [options]               - 修复数据"
    echo -e "  ${GREEN}rollback${NC} [options]          - 回滚数据"
    echo ""
    echo "修复选项:"
    echo "  --batch-size=N          批次大小 (默认: 500)"
    echo "  --max-batches=N         最大批次数"
    echo "  --dry-run               试运行模式"
    echo "  --execute               执行模式"
    echo ""
    echo "回滚选项:"
    echo "  --report-file=FILE      修复报告文件"
    echo "  --dry-run               试运行模式"
    echo "  --execute               执行模式"
    echo ""
    echo "示例:"
    echo "  $0 analysis"
    echo "  $0 fix --batch-size=200 --dry-run"
    echo "  $0 fix --batch-size=500 --execute"
    echo "  $0 rollback --report-file=fix-report-xxx.json --dry-run"
}

# 执行数据分析
run_analysis() {
    echo -e "${BLUE}📊 开始分析生产数据...${NC}"
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T "$BACKEND_CONTAINER" \
        npx ts-node "$SCRIPTS_DIR/production-data-analysis.ts"
    
    echo -e "${GREEN}✅ 数据分析完成${NC}"
}

# 执行数据修复
run_fix() {
    local args="$@"
    
    echo -e "${YELLOW}⚠️  准备执行数据修复${NC}"
    echo -e "${YELLOW}参数: $args${NC}"
    
    # 检查是否为执行模式
    if [[ "$args" == *"--execute"* ]]; then
        echo -e "${RED}🔴 这将修改生产数据！${NC}"
        echo -e "${YELLOW}请确认以下事项：${NC}"
        echo "1. 已备份数据库"
        echo "2. 已进行试运行验证"
        echo "3. 在业务低峰期执行"
        echo ""
        read -p "确认继续执行？(输入 'YES' 确认): " confirm
        
        if [ "$confirm" != "YES" ]; then
            echo -e "${YELLOW}❌ 操作已取消${NC}"
            exit 0
        fi
    fi
    
    echo -e "${BLUE}🔧 开始执行数据修复...${NC}"
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T "$BACKEND_CONTAINER" \
        npx ts-node "$SCRIPTS_DIR/production-batch-fix.ts" $args
    
    echo -e "${GREEN}✅ 数据修复完成${NC}"
}

# 执行数据回滚
run_rollback() {
    local args="$@"
    
    echo -e "${YELLOW}⚠️  准备执行数据回滚${NC}"
    echo -e "${YELLOW}参数: $args${NC}"
    
    # 检查是否为执行模式
    if [[ "$args" == *"--execute"* ]]; then
        echo -e "${RED}🔴 这将回滚生产数据！${NC}"
        echo -e "${YELLOW}请确认以下事项：${NC}"
        echo "1. 已备份当前数据库状态"
        echo "2. 确认需要回滚的报告文件正确"
        echo "3. 已进行试运行验证"
        echo ""
        read -p "确认继续执行？(输入 'YES' 确认): " confirm
        
        if [ "$confirm" != "YES" ]; then
            echo -e "${YELLOW}❌ 操作已取消${NC}"
            exit 0
        fi
    fi
    
    echo -e "${BLUE}🔄 开始执行数据回滚...${NC}"
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T "$BACKEND_CONTAINER" \
        npx ts-node "$SCRIPTS_DIR/production-rollback.ts" $args
    
    echo -e "${GREEN}✅ 数据回滚完成${NC}"
}

# 备份数据库
backup_database() {
    echo -e "${BLUE}💾 开始备份数据库...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backup_${timestamp}.sql"
    
    # 从环境变量或默认值获取数据库配置
    local db_name="${DB_NAME:-zhiweijz}"
    local db_user="${DB_USER:-zhiweijz}"
    local db_password="${DB_PASSWORD:-zhiweijz123}"
    
    echo -e "${YELLOW}备份文件: $backup_file${NC}"
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$db_user" -d "$db_name" > "$backup_file"
    
    echo -e "${GREEN}✅ 数据库备份完成: $backup_file${NC}"
}

# 复制报告文件
copy_reports() {
    echo -e "${BLUE}📄 复制修复报告文件...${NC}"
    
    # 创建本地reports目录
    mkdir -p ./reports
    
    # 复制所有报告文件
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T "$BACKEND_CONTAINER" \
        find /app -name "fix-report-*.json" -exec cp {} /tmp/ \; 2>/dev/null || true
    
    # 从容器复制到本地
    docker cp "${BACKEND_CONTAINER}:/tmp/" ./reports/ 2>/dev/null || true
    
    echo -e "${GREEN}✅ 报告文件已复制到 ./reports/ 目录${NC}"
}

# 主函数
main() {
    # 检查参数
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    local command="$1"
    shift
    
    # 检查后端容器状态
    check_backend_container
    
    case "$command" in
        "analysis")
            run_analysis
            ;;
        "fix")
            run_fix "$@"
            ;;
        "rollback")
            run_rollback "$@"
            ;;
        "backup")
            backup_database
            ;;
        "copy-reports")
            copy_reports
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 