#!/bin/bash

# 容器环境服务调试脚本
# 用于测试MinIO存储和图片代理服务的可用性

echo "=== 容器环境服务调试脚本 ==="
echo "时间: $(date)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取容器信息
echo -e "${BLUE}=== 容器环境信息 ===${NC}"
echo "主机名: $(hostname)"
echo "容器IP: $(hostname -i 2>/dev/null || echo "无法获取")"
echo ""

# 测试MinIO连接
echo -e "${BLUE}=== MinIO存储测试 ===${NC}"
MINIO_ENDPOINT="http://10.255.0.75:9000"
echo "MinIO端点: $MINIO_ENDPOINT"

# 测试MinIO健康检查
echo -n "MinIO健康检查: "
if curl -s -f "$MINIO_ENDPOINT/minio/health/live" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

# 测试存储桶列表（需要认证，预期401是正常的）
echo -n "存储桶访问测试: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$MINIO_ENDPOINT/")
if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ 服务可达 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 异常 (HTTP $HTTP_CODE)${NC}"
fi

echo ""

# 测试应用API服务
echo -e "${BLUE}=== 应用API服务测试 ===${NC}"
API_BASE="http://localhost:3000/api"

# 健康检查
echo -n "API健康检查: "
if curl -s -f "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

# 图片代理服务测试
echo -n "图片代理服务: "
if curl -s -f "$API_BASE/image-proxy/info/transaction-attachments/test" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 可访问${NC}"
else
    # 检查是否返回404（正常，因为文件不存在）
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/image-proxy/info/transaction-attachments/test")
    if [ "$HTTP_CODE" = "404" ]; then
        echo -e "${GREEN}✓ 服务正常 (文件不存在返回404)${NC}"
    else
        echo -e "${RED}✗ 异常 (HTTP $HTTP_CODE)${NC}"
    fi
fi

echo ""

# 存储桶内容检查（需要通过API）
echo -e "${BLUE}=== 存储桶内容检查 ===${NC}"
echo "检查transaction-attachments存储桶结构..."

# 创建临时测试文件上传
TEST_FILE="/tmp/test_image.jpg"
echo "创建测试图片文件..."
# 创建一个1x1像素的JPEG文件
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9' > "$TEST_FILE"

echo "测试文件上传..."
UPLOAD_RESULT=$(curl -s -X POST \
  -F "file=@$TEST_FILE" \
  -F "category=attachments" \
  "$API_BASE/file-storage/attachment" 2>/dev/null)

if echo "$UPLOAD_RESULT" | grep -q "fileId"; then
    echo -e "${GREEN}✓ 文件上传成功${NC}"
    FILE_ID=$(echo "$UPLOAD_RESULT" | grep -o '"fileId":"[^"]*"' | cut -d'"' -f4)
    echo "文件ID: $FILE_ID"
    
    # 测试图片代理访问
    echo "测试图片代理访问..."
    PROXY_URL="$API_BASE/image-proxy/thumbnail/s3/transaction-attachments/attachments/$(date +%Y/%m/%d)/$FILE_ID.jpg?width=96&height=96"
    echo "代理URL: $PROXY_URL"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROXY_URL")
    echo "图片代理响应: HTTP $HTTP_CODE"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ 图片代理工作正常${NC}"
    else
        echo -e "${RED}✗ 图片代理返回错误${NC}"
    fi
    
    # 清理测试文件
    echo "清理测试文件..."
    curl -s -X DELETE "$API_BASE/file-storage/$FILE_ID" > /dev/null 2>&1
else
    echo -e "${RED}✗ 文件上传失败${NC}"
    echo "上传结果: $UPLOAD_RESULT"
fi

# 清理临时文件
rm -f "$TEST_FILE"

echo ""

# 环境变量检查
echo -e "${BLUE}=== 环境变量检查 ===${NC}"
echo "S3相关环境变量:"
env | grep -E "^(S3_|MINIO_)" | while read -r line; do
    key=$(echo "$line" | cut -d'=' -f1)
    value=$(echo "$line" | cut -d'=' -f2-)
    # 隐藏敏感信息
    if echo "$key" | grep -qE "(SECRET|PASSWORD|KEY)"; then
        echo "$key=***已隐藏***"
    else
        echo "$line"
    fi
done

echo ""

# 网络连接检查
echo -e "${BLUE}=== 网络连接检查 ===${NC}"
echo "检查容器间网络连接..."

# 检查到MinIO的连接
echo -n "连接到MinIO (10.255.0.75:9000): "
if nc -z 10.255.0.75 9000 2>/dev/null; then
    echo -e "${GREEN}✓ 可达${NC}"
else
    echo -e "${RED}✗ 不可达${NC}"
fi

# 检查DNS解析
echo -n "DNS解析测试: "
if nslookup google.com > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

echo ""
echo -e "${BLUE}=== 调试完成 ===${NC}"
echo "如果发现问题，请查看上述输出中的错误信息"
echo "" 