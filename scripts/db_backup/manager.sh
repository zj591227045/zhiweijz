#!/bin/bash

# 数据库备份管理工具
# 用途：统一管理数据库备份和恢复操作

set -e

# 获取脚本目录并加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"
source "$SCRIPT_DIR/db_utils.sh"

# 颜色输出
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'

# 显示主菜单
show_main_menu() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                  数据库备份管理系统                      ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║                                                          ║${NC}"
    echo -e "${CYAN}║  📦 备份管理                                             ║${NC}"
    echo -e "${CYAN}║    1. 完整备份（结构+数据）                              ║${NC}"
    echo -e "${CYAN}║    2. 结构备份（仅表结构）                               ║${NC}"
    echo -e "${CYAN}║    3. 数据备份（仅数据）                                 ║${NC}"
    echo -e "${CYAN}║    4. 表备份（指定表）                                   ║${NC}"
    echo -e "${CYAN}║    5. 执行所有备份                                       ║${NC}"
    echo -e "${CYAN}║                                                          ║${NC}"
    echo -e "${CYAN}║  🔄 恢复管理                                             ║${NC}"
    echo -e "${CYAN}║    6. 交互式恢复                                         ║${NC}"
    echo -e "${CYAN}║    7. 完整恢复                                           ║${NC}"
    echo -e "${CYAN}║    8. 结构恢复                                           ║${NC}"
    echo -e "${CYAN}║    9. 数据恢复                                           ║${NC}"
    echo -e "${CYAN}║   10. 表恢复                                             ║${NC}"
    echo -e "${CYAN}║                                                          ║${NC}"
    echo -e "${CYAN}║  📊 管理功能                                             ║${NC}"
    echo -e "${CYAN}║   11. 查看备份列表                                       ║${NC}"
    echo -e "${CYAN}║   12. 备份统计信息                                       ║${NC}"
    echo -e "${CYAN}║   13. 清理旧备份                                         ║${NC}"
    echo -e "${CYAN}║   14. 数据库信息                                         ║${NC}"
    echo -e "${CYAN}║   15. 测试连接                                           ║${NC}"
    echo -e "${CYAN}║   16. 配置信息                                           ║${NC}"
    echo -e "${CYAN}║                                                          ║${NC}"
    echo -e "${CYAN}║    0. 退出                                               ║${NC}"
    echo -e "${CYAN}║                                                          ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 执行备份操作
execute_backup() {
    local backup_type="$1"
    local table_names="$2"
    
    echo -e "${BLUE}执行 $backup_type 备份${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..30})${NC}"
    
    if [ "$backup_type" = "table" ] && [ -z "$table_names" ]; then
        read -p "请输入要备份的表名（用逗号分隔）: " table_names
        if [ -z "$table_names" ]; then
            log "ERROR" "未指定表名"
            return 1
        fi
    fi
    
    if bash "$SCRIPT_DIR/backup.sh" "$backup_type" "$table_names"; then
        log "INFO" "$backup_type 备份完成"
    else
        log "ERROR" "$backup_type 备份失败"
    fi
    
    echo ""
    read -p "按回车键继续..."
}

# 执行恢复操作
execute_restore() {
    local restore_type="$1"
    
    echo -e "${BLUE}执行 $restore_type 恢复${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..30})${NC}"
    
    if bash "$SCRIPT_DIR/restore.sh" "$restore_type"; then
        log "INFO" "$restore_type 恢复完成"
    else
        log "ERROR" "$restore_type 恢复失败"
    fi
    
    echo ""
    read -p "按回车键继续..."
}

# 显示备份列表
show_backup_list() {
    echo -e "${BLUE}备份文件列表${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..20})${NC}"
    
    bash "$SCRIPT_DIR/restore.sh" list
    
    echo ""
    read -p "按回车键继续..."
}

# 显示备份统计
show_backup_stats() {
    echo -e "${BLUE}备份统计信息${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..20})${NC}"
    
    bash "$SCRIPT_DIR/backup.sh" stats
    
    echo ""
    read -p "按回车键继续..."
}

# 清理旧备份
cleanup_backups() {
    echo -e "${BLUE}清理旧备份${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..15})${NC}"
    
    echo -e "${YELLOW}当前配置的保留天数: $BACKUP_RETENTION_DAYS 天${NC}"
    echo ""
    read -p "确认清理旧备份? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        bash "$SCRIPT_DIR/backup.sh" cleanup
    else
        log "INFO" "清理操作已取消"
    fi
    
    echo ""
    read -p "按回车键继续..."
}

# 显示数据库信息
show_database_info() {
    echo -e "${BLUE}数据库信息${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..15})${NC}"
    
    if test_connection; then
        echo ""
        echo "基本信息:"
        get_db_info
        
        echo ""
        echo "表列表:"
        get_table_list | head -20
        
        local table_count=$(get_table_list | wc -l)
        if [ $table_count -gt 20 ]; then
            echo "... 还有 $((table_count - 20)) 个表"
        fi
        
        echo ""
        echo "表大小信息（前10个）:"
        get_table_sizes | head -10
    else
        log "ERROR" "无法连接到数据库"
    fi
    
    echo ""
    read -p "按回车键继续..."
}

# 测试数据库连接
test_database_connection() {
    echo -e "${BLUE}测试数据库连接${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..20})${NC}"
    
    echo "连接参数:"
    echo "  主机: $DB_HOST:$DB_PORT"
    echo "  数据库: $DB_NAME"
    echo "  用户: $DB_USER"
    echo "  使用Docker: $USE_DOCKER"
    if [ "$USE_DOCKER" = "true" ]; then
        echo "  容器镜像: $PG_CONTAINER_IMAGE"
        echo "  网络模式: $DOCKER_NETWORK_MODE"
    fi
    echo ""
    
    if test_connection; then
        echo -e "${GREEN}✅ 数据库连接正常${NC}"
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
        echo ""
        echo "请检查:"
        echo "  1. 数据库服务是否运行"
        echo "  2. 连接参数是否正确"
        echo "  3. 网络是否可达"
        if [ "$USE_DOCKER" = "true" ]; then
            echo "  4. Docker是否正常运行"
            echo "  5. 容器镜像是否可用"
        fi
    fi
    
    echo ""
    read -p "按回车键继续..."
}

# 显示配置信息
show_configuration() {
    echo -e "${BLUE}当前配置信息${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..20})${NC}"
    
    show_config
    
    echo ""
    echo -e "${YELLOW}配置文件位置: $SCRIPT_DIR/config.conf${NC}"
    echo ""
    read -p "按回车键继续..."
}

# 主循环
main_loop() {
    while true; do
        show_main_menu
        read -p "请选择操作 (0-16): " choice
        
        case $choice in
            1)
                execute_backup "full"
                ;;
            2)
                execute_backup "schema"
                ;;
            3)
                execute_backup "data"
                ;;
            4)
                execute_backup "table"
                ;;
            5)
                execute_backup "all"
                ;;
            6)
                execute_restore "interactive"
                ;;
            7)
                execute_restore "full"
                ;;
            8)
                execute_restore "schema"
                ;;
            9)
                execute_restore "data"
                ;;
            10)
                execute_restore "table"
                ;;
            11)
                show_backup_list
                ;;
            12)
                show_backup_stats
                ;;
            13)
                cleanup_backups
                ;;
            14)
                show_database_info
                ;;
            15)
                test_database_connection
                ;;
            16)
                show_configuration
                ;;
            0)
                echo -e "${GREEN}👋 再见！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效的选择，请重试${NC}"
                sleep 1
                ;;
        esac
    done
}

# 主函数
main() {
    # 初始化配置
    if ! init_config; then
        log "ERROR" "配置初始化失败"
        exit 1
    fi
    
    # 显示欢迎信息
    echo -e "${MAGENTA}欢迎使用数据库备份管理系统${NC}"
    echo -e "${MAGENTA}配置文件: $SCRIPT_DIR/config.conf${NC}"
    echo -e "${MAGENTA}数据库: $DB_HOST:$DB_PORT/$DB_NAME${NC}"
    echo ""
    
    # 进入主循环
    main_loop
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
