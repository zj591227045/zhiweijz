#!/bin/bash

# 只为记账 - 数据库Schema生成脚本
# 从当前Prisma schema生成完整的数据库初始化SQL

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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker未安装"
        exit 1
    fi
    
    if [ ! -f "../server/prisma/schema.prisma" ]; then
        log_error "未找到Prisma schema文件"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 生成数据库Schema
generate_schema() {
    log_info "从Prisma schema生成数据库SQL..."
    
    # 创建临时目录
    local temp_dir=$(mktemp -d)
    local temp_compose="$temp_dir/docker-compose.yml"
    local output_file="config/init.sql"
    
    # 创建临时的docker-compose文件
    cat > "$temp_compose" << EOF
version: '3.8'
services:
  temp-postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: zhiweijz_temp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: temp123
    ports:
      - "5433:5432"
    volumes:
      - temp_data:/var/lib/postgresql/data

volumes:
  temp_data:
EOF
    
    log_info "启动临时PostgreSQL容器..."
    cd "$temp_dir"
    docker-compose up -d
    
    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 10
    
    # 回到原目录
    cd - >/dev/null
    
    # 设置临时数据库URL
    export DATABASE_URL="postgresql://postgres:temp123@localhost:5433/zhiweijz_temp"
    
    # 执行Prisma推送
    log_info "执行Prisma db push..."
    cd ../server
    npx prisma db push --force-reset --skip-generate
    
    # 导出数据库结构
    log_info "导出数据库结构..."
    docker exec $(docker ps -q -f "name=temp-postgres") pg_dump \
        -U postgres \
        -d zhiweijz_temp \
        --schema-only \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --no-security-labels \
        --no-comments > "../docker/$output_file.tmp"
    
    # 回到docker目录
    cd ../docker
    
    # 处理SQL文件
    log_info "处理SQL文件..."
    
    # 添加文件头注释
    cat > "$output_file" << EOF
-- 只为记账数据库初始化脚本
-- 此文件由 scripts/generate-schema.sh 自动生成
-- 生成时间: $(date)
-- 基于: server/prisma/schema.prisma

-- 设置数据库编码和时区
ALTER DATABASE zhiweijz SET timezone TO 'Asia/Shanghai';

EOF
    
    # 添加生成的SQL（去除不需要的部分）
    grep -v "^--" "$output_file.tmp" | \
    grep -v "^$" | \
    grep -v "SET " | \
    grep -v "SELECT pg_catalog" >> "$output_file"
    
    # 添加文件尾注释
    cat >> "$output_file" << EOF

-- 输出初始化完成信息
\\echo 'Database schema initialized successfully from Prisma'
EOF
    
    # 清理临时文件
    rm -f "$output_file.tmp"
    
    # 停止并清理临时容器
    log_info "清理临时容器..."
    cd "$temp_dir"
    docker-compose down -v
    cd - >/dev/null
    rm -rf "$temp_dir"
    
    log_success "数据库Schema生成完成: $output_file"
}

# 验证生成的SQL
validate_sql() {
    local sql_file="config/init.sql"
    
    log_info "验证生成的SQL文件..."
    
    if [ ! -f "$sql_file" ]; then
        log_error "SQL文件不存在: $sql_file"
        return 1
    fi
    
    # 检查文件大小
    local file_size=$(wc -l < "$sql_file")
    if [ "$file_size" -lt 50 ]; then
        log_warning "SQL文件可能不完整，行数: $file_size"
        return 1
    fi
    
    # 检查关键表是否存在
    local required_tables=("users" "account_books" "transactions" "budgets" "categories")
    for table in "${required_tables[@]}"; do
        if ! grep -q "CREATE TABLE.*$table" "$sql_file"; then
            log_error "缺少必要的表: $table"
            return 1
        fi
    done
    
    log_success "SQL文件验证通过"
    return 0
}

# 主函数
main() {
    echo ""
    echo "=================================="
    echo "🗄️ 数据库Schema生成工具"
    echo "=================================="
    echo ""
    
    check_dependencies
    generate_schema
    
    if validate_sql; then
        echo ""
        log_success "🎉 数据库Schema生成完成！"
        echo ""
        echo -e "${BLUE}生成的文件:${NC} config/init.sql"
        echo -e "${BLUE}下一步:${NC} 运行 ./scripts/start.sh 测试部署"
        echo ""
    else
        log_error "SQL文件验证失败，请检查生成过程"
        exit 1
    fi
}

# 错误处理
trap 'log_error "脚本执行失败，正在清理..."; docker-compose down -v 2>/dev/null || true' ERR

# 执行主函数
main "$@"
