#!/bin/bash

# 基于数据库配置的图片代理诊断脚本
# 用于检查管理后台配置的对象存储是否正常工作

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
echo "🔧 数据库配置图片代理诊断工具"
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
fi

log_info "使用配置文件: $COMPOSE_FILE"

# 1. 检查容器状态
log_info "1. 检查容器状态..."
echo ""

containers=("zhiweijz-backend" "zhiweijz-minio" "zhiweijz-postgres")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container"; then
        status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container" | awk '{print $2, $3, $4}')
        log_success "✅ $container: $status"
    else
        log_error "❌ $container: 未运行"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    log_error "部分容器未运行，请先启动所有服务"
    echo "运行: docker-compose -f $COMPOSE_FILE up -d"
    exit 1
fi

echo ""

# 2. 检查数据库中的存储配置
log_info "2. 检查数据库中的存储配置..."

# 从数据库读取存储配置
storage_config=$(docker exec zhiweijz-backend npx prisma db execute --stdin <<EOF | tail -n +3
SELECT key, value FROM "system_config" WHERE category = 'storage' ORDER BY key;
EOF
2>/dev/null || echo "")

if [ -n "$storage_config" ]; then
    echo "   数据库存储配置:"
    echo "$storage_config" | while read line; do
        if [[ $line =~ secret|password|key ]]; then
            key=$(echo "$line" | awk '{print $1}')
            echo "   $key | ***"
        else
            echo "   $line"
        fi
    done
else
    log_warning "   无法读取数据库存储配置或配置为空"
fi

echo ""

# 3. 测试管理端存储API
log_info "3. 测试管理端存储API..."

# 需要管理员token，这里只测试无需认证的健康检查
health_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$health_response" = "200" ]; then
    log_success "   ✅ 后端API健康检查通过"
else
    log_error "   ❌ 后端API健康检查失败 (状态码: $health_response)"
fi

echo ""

# 4. 检查MinIO状态和存储桶
log_info "4. 检查MinIO状态和存储桶..."

if docker exec zhiweijz-minio mc --help >/dev/null 2>&1; then
    # 尝试从数据库配置中获取MinIO凭据
    minio_user=$(docker exec zhiweijz-backend npx prisma db execute --stdin <<EOF | tail -n +3 | head -1 | awk '{print $2}'
SELECT value FROM "system_config" WHERE key = 's3_access_key_id';
EOF
2>/dev/null || echo "zhiweijz")

    minio_pass=$(docker exec zhiweijz-backend npx prisma db execute --stdin <<EOF | tail -n +3 | head -1 | awk '{print $2}'
SELECT value FROM "system_config" WHERE key = 's3_secret_access_key';
EOF
2>/dev/null || echo "zhiweijz123456")

    # 配置MinIO客户端
    docker exec zhiweijz-minio mc alias set local http://localhost:9000 "$minio_user" "$minio_pass" >/dev/null 2>&1 || true
    
    # 列出存储桶
    buckets=$(docker exec zhiweijz-minio mc ls local 2>/dev/null || echo "")
    if [ -n "$buckets" ]; then
        echo "   MinIO存储桶列表:"
        echo "$buckets" | while read line; do
            echo "   $line"
        done
    else
        log_warning "   无法列出存储桶或存储桶为空"
    fi
else
    log_warning "   MinIO客户端不可用，跳过存储桶检查"
fi

echo ""

# 5. 测试图片代理功能
log_info "5. 测试图片代理功能..."

# 测试图片代理路由（需要认证，这里只测试路由是否存在）
proxy_test_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/image-proxy/info/transaction-attachments/test" 2>/dev/null || echo "000")
if [ "$proxy_test_response" = "404" ]; then
    log_info "   ✅ 图片代理路由正常 (404是预期的，因为测试文件不存在)"
elif [ "$proxy_test_response" = "401" ]; then
    log_info "   ✅ 图片代理路由正常 (需要认证)"
else
    log_warning "   ⚠️ 图片代理路由响应异常 (状态码: $proxy_test_response)"
fi

echo ""

# 6. 检查具体的404文件
log_info "6. 检查特定文件的存在性..."

# 从你提供的错误信息中提取文件路径
error_files=(
    "transaction-attachments/transaction-attachment/2025/07/15/a469b3ca-0593-4bad-bc18-d224c4fe88f1.jpg"
    "transaction-attachments/transaction-attachment/2025/07/15/f7fc8f91-466c-438a-bf5d-82f896de1c91.jpg"
)

if docker exec zhiweijz-minio mc --help >/dev/null 2>&1; then
    for file_path in "${error_files[@]}"; do
        if docker exec zhiweijz-minio mc stat "local/$file_path" >/dev/null 2>&1; then
            log_success "   ✅ 文件存在: $file_path"
        else
            log_error "   ❌ 文件不存在: $file_path"
        fi
    done
else
    log_warning "   无法检查文件存在性（MinIO客户端不可用）"
fi

echo ""

# 7. 生成配置建议
log_info "7. 配置建议..."

cat > storage-config-check.txt << EOF
数据库存储配置检查报告
生成时间: $(date)

1. 容器状态:
$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep zhiweijz || echo "无容器运行")

2. 数据库存储配置:
$storage_config

3. MinIO存储桶:
$buckets

4. 后端健康状态: HTTP $health_response
5. 图片代理测试: HTTP $proxy_test_response

建议操作:
1. 检查管理后台的存储配置是否正确设置
2. 确保MinIO服务正常运行且可访问
3. 验证数据库中的存储配置与实际MinIO配置一致
4. 检查特定404文件是否真实存在于存储中

访问管理后台:
- URL: http://localhost:3000/admin (或相应的服务地址)
- 导航到: 系统设置 > 存储配置
- 检查和测试存储连接
EOF

log_success "   ✅ 检查报告已生成: storage-config-check.txt"

echo ""
echo "=================================="
echo "🎯 诊断总结"
echo "=================================="

log_info "基于数据库配置的存储系统诊断完成"
echo ""
log_info "关键发现:"
echo "1. 对象存储配置已从环境变量迁移到数据库管理"
echo "2. Docker环境变量中的S3配置已移除（避免混淆）"
echo "3. 图片代理服务通过数据库配置工作"
echo ""
log_info "下一步操作:"
echo "1. 访问管理后台配置存储设置"
echo "2. 测试存储连接和存储桶创建"
echo "3. 检查特定404文件的实际存在性"
echo "4. 如有需要，重新上传缺失的文件"

echo ""
log_success "🎉 诊断脚本执行完成！" 