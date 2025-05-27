#!/bin/bash

# 只为记账 - 数据库结构对比工具
# 对比生产数据库和生成的初始化文件

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

# 生产数据库连接信息
PROD_DB_URL="postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz"

# 获取生产数据库结构
get_production_schema() {
    log_info "获取生产数据库结构..."
    
    local output_file="temp_prod_schema.sql"
    
    # 使用Docker容器连接数据库
    if docker run --rm postgres:15-alpine pg_dump "$PROD_DB_URL" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --no-security-labels \
        --no-comments > "$output_file" 2>/dev/null; then
        
        log_success "生产数据库结构获取成功"
        echo "$output_file"
        return 0
    else
        log_error "无法连接到生产数据库"
        return 1
    fi
}

# 获取生产数据库表列表
get_production_tables() {
    log_info "获取生产数据库表列表..."
    
    if docker run --rm postgres:15-alpine psql "$PROD_DB_URL" \
        -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | \
        grep -v '^$' | sed 's/^ *//' | sed 's/ *$//' > temp_prod_tables.txt; then
        
        log_success "生产数据库表列表获取成功"
        return 0
    else
        log_warning "无法获取生产数据库表列表，使用备用方法"
        # 备用：从Prisma schema推断表列表
        get_tables_from_prisma
        return 0
    fi
}

# 从Prisma schema获取表列表
get_tables_from_prisma() {
    log_info "从Prisma schema获取表列表..."
    
    if [ -f "../server/prisma/schema.prisma" ]; then
        grep -E "^model " "../server/prisma/schema.prisma" | \
        awk '{print $2}' | \
        sed 's/^//' | \
        while read model; do
            # 转换模型名为表名（驼峰转下划线）
            echo "$model" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//' | tr '[:upper:]' '[:lower:]'
        done > temp_prisma_tables.txt
        
        # 手动添加已知的表名映射
        cat >> temp_prisma_tables.txt << EOF
users
families
family_members
invitations
categories
transactions
budgets
account_books
category_budgets
user_category_configs
sessions
verification_codes
security_logs
password_reset_tokens
user_settings
user_llm_settings
account_llm_settings
user_feedback
ai_models
budget_histories
user_account_books
EOF
        
        sort temp_prisma_tables.txt | uniq > temp_prod_tables.txt
        rm temp_prisma_tables.txt
        
        log_success "从Prisma schema获取表列表完成"
    else
        log_error "未找到Prisma schema文件"
        return 1
    fi
}

# 分析生成的初始化文件
analyze_init_sql() {
    local init_file="config/init.sql"
    
    log_info "分析生成的初始化文件..."
    
    if [ ! -f "$init_file" ]; then
        log_error "初始化文件不存在: $init_file"
        return 1
    fi
    
    # 提取表名
    grep -E "^CREATE TABLE" "$init_file" | \
    awk '{print $3}' | \
    sed 's/public\.//' | \
    sort > temp_init_tables.txt
    
    # 提取枚举类型
    grep -E "^CREATE TYPE.*AS ENUM" "$init_file" | \
    awk '{print $3}' | \
    sed 's/public\.//' | \
    sed 's/"//g' | \
    sort > temp_init_enums.txt
    
    log_success "初始化文件分析完成"
}

# 对比表结构
compare_tables() {
    log_info "对比数据库表结构..."
    
    if [ ! -f "temp_prod_tables.txt" ] || [ ! -f "temp_init_tables.txt" ]; then
        log_error "缺少对比文件"
        return 1
    fi
    
    echo ""
    echo "=== 表结构对比 ==="
    
    # 生产环境有但初始化文件没有的表
    local missing_in_init=$(comm -23 temp_prod_tables.txt temp_init_tables.txt)
    if [ -n "$missing_in_init" ]; then
        log_warning "初始化文件中缺少的表:"
        echo "$missing_in_init" | while read table; do
            echo "  - $table"
        done
    fi
    
    # 初始化文件有但生产环境没有的表
    local extra_in_init=$(comm -13 temp_prod_tables.txt temp_init_tables.txt)
    if [ -n "$extra_in_init" ]; then
        log_warning "初始化文件中多余的表:"
        echo "$extra_in_init" | while read table; do
            echo "  - $table"
        done
    fi
    
    # 共同的表
    local common_tables=$(comm -12 temp_prod_tables.txt temp_init_tables.txt)
    local common_count=$(echo "$common_tables" | wc -l)
    log_success "共同的表数量: $common_count"
    
    echo ""
}

# 验证关键表和字段
verify_critical_components() {
    local init_file="config/init.sql"
    
    log_info "验证关键组件..."
    
    # 关键表列表
    local critical_tables=(
        "users"
        "account_books" 
        "transactions"
        "budgets"
        "categories"
        "families"
        "family_members"
        "user_llm_settings"
        "account_llm_settings"
        "budget_histories"
        "category_budgets"
        "user_category_configs"
    )
    
    # 关键枚举类型
    local critical_enums=(
        "TransactionType"
        "BudgetPeriod"
        "Role"
        "AccountBookType"
        "BudgetType"
        "RolloverType"
    )
    
    echo ""
    echo "=== 关键组件验证 ==="
    
    # 检查关键表
    for table in "${critical_tables[@]}"; do
        if grep -q "CREATE TABLE.*$table" "$init_file"; then
            log_success "✅ 表 $table 存在"
        else
            log_error "❌ 表 $table 缺失"
        fi
    done
    
    # 检查关键枚举
    for enum in "${critical_enums[@]}"; do
        if grep -q "CREATE TYPE.*$enum.*AS ENUM" "$init_file"; then
            log_success "✅ 枚举 $enum 存在"
        else
            log_error "❌ 枚举 $enum 缺失"
        fi
    done
    
    echo ""
}

# 检查关键字段
check_critical_fields() {
    local init_file="config/init.sql"
    
    log_info "检查关键字段..."
    
    echo ""
    echo "=== 关键字段检查 ==="
    
    # 用户表关键字段
    local user_fields=("email" "password" "name" "birth_date" "avatar")
    for field in "${user_fields[@]}"; do
        if grep -A 20 "CREATE TABLE.*users" "$init_file" | grep -q "$field"; then
            log_success "✅ users.$field 存在"
        else
            log_warning "⚠️  users.$field 可能缺失"
        fi
    done
    
    # 账本表关键字段
    local account_book_fields=("name" "type" "family_id" "created_by" "user_llm_setting_id")
    for field in "${account_book_fields[@]}"; do
        if grep -A 15 "CREATE TABLE.*account_books" "$init_file" | grep -q "$field"; then
            log_success "✅ account_books.$field 存在"
        else
            log_warning "⚠️  account_books.$field 可能缺失"
        fi
    done
    
    # 预算表关键字段
    local budget_fields=("budget_type" "family_member_id" "amount_modified" "rollover_amount")
    for field in "${budget_fields[@]}"; do
        if grep -A 25 "CREATE TABLE.*budgets" "$init_file" | grep -q "$field"; then
            log_success "✅ budgets.$field 存在"
        else
            log_warning "⚠️  budgets.$field 可能缺失"
        fi
    done
    
    echo ""
}

# 生成对比报告
generate_report() {
    local report_file="database_comparison_report.md"
    
    log_info "生成对比报告..."
    
    cat > "$report_file" << EOF
# 数据库结构对比报告

生成时间: $(date)
生产数据库: $PROD_DB_URL
初始化文件: config/init.sql

## 表结构对比

### 生产环境表列表
\`\`\`
$(cat temp_prod_tables.txt 2>/dev/null || echo "无法获取")
\`\`\`

### 初始化文件表列表
\`\`\`
$(cat temp_init_tables.txt 2>/dev/null || echo "无法获取")
\`\`\`

### 枚举类型
\`\`\`
$(cat temp_init_enums.txt 2>/dev/null || echo "无法获取")
\`\`\`

## 建议

1. 如果发现缺失的表或字段，请更新Prisma schema
2. 重新运行 \`./scripts/generate-schema.sh\` 生成最新的初始化文件
3. 使用 \`./scripts/reset-database.sh --both\` 重置数据库状态

## 下一步

- [ ] 修复发现的问题
- [ ] 重新生成初始化文件
- [ ] 测试部署
EOF
    
    log_success "对比报告已生成: $report_file"
}

# 清理临时文件
cleanup() {
    rm -f temp_*.txt temp_*.sql
}

# 主函数
main() {
    echo ""
    echo "=================================="
    echo "🔍 数据库结构对比工具"
    echo "=================================="
    echo ""
    
    # 分析初始化文件
    analyze_init_sql
    
    # 尝试获取生产数据库信息
    if get_production_tables; then
        compare_tables
    else
        log_warning "无法连接生产数据库，仅分析本地文件"
    fi
    
    # 验证关键组件
    verify_critical_components
    
    # 检查关键字段
    check_critical_fields
    
    # 生成报告
    generate_report
    
    echo ""
    log_success "🎉 数据库结构对比完成！"
    echo ""
    echo -e "${BLUE}查看详细报告:${NC} database_comparison_report.md"
    echo ""
}

# 错误处理
trap 'cleanup; log_error "脚本执行失败"' ERR

# 执行主函数
main "$@"

# 清理
cleanup
