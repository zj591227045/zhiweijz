#!/bin/bash

# Docker环境状态检查脚本
# 用于快速诊断Docker环境是否正常

echo "=== Docker环境状态检查 ==="
echo "当前时间: $(date)"
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在包含 docker-compose.yml 的目录下运行此脚本"
    echo "正确的运行方式:"
    echo "  cd docker"
    echo "  bash scripts/check-docker-status.sh"
    exit 1
fi

# 检查Docker是否安装
echo "🔍 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装或不在PATH中"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装或不在PATH中"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"

# 检查Docker服务状态
echo ""
echo "🔍 检查Docker服务状态..."
if ! docker info &> /dev/null; then
    echo "❌ Docker 服务未运行"
    echo "请启动Docker服务:"
    echo "  sudo systemctl start docker"
    exit 1
fi

echo "✅ Docker 服务正常运行"

# 显示Docker版本信息
echo ""
echo "📋 Docker版本信息:"
docker --version
docker-compose --version

# 检查容器状态
echo ""
echo "🔍 检查容器状态..."
echo "当前容器状态:"
docker-compose ps

echo ""
echo "📊 详细容器信息:"

# 检查各个容器
containers=("zhiweijz-postgres" "zhiweijz-backend" "zhiweijz-frontend" "zhiweijz-nginx")

for container in "${containers[@]}"; do
    echo ""
    echo "🔍 检查容器: $container"
    
    if docker inspect "$container" &> /dev/null; then
        status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
        running=$(docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null)
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null)
        
        echo "  状态: $status"
        echo "  运行中: $running"
        
        if [ "$health" != "<no value>" ] && [ -n "$health" ]; then
            echo "  健康状态: $health"
        fi
        
        if [ "$running" = "true" ]; then
            echo "  ✅ 容器正常运行"
        else
            echo "  ❌ 容器未运行"
            echo "  最后退出时间: $(docker inspect --format='{{.State.FinishedAt}}' "$container" 2>/dev/null)"
            echo "  退出代码: $(docker inspect --format='{{.State.ExitCode}}' "$container" 2>/dev/null)"
        fi
    else
        echo "  ❌ 容器不存在"
    fi
done

# 检查网络连接
echo ""
echo "🔍 检查网络连接..."

# 检查后端容器是否可以连接数据库
if docker inspect zhiweijz-backend &> /dev/null && docker inspect zhiweijz-postgres &> /dev/null; then
    backend_running=$(docker inspect --format='{{.State.Running}}' zhiweijz-backend 2>/dev/null)
    postgres_running=$(docker inspect --format='{{.State.Running}}' zhiweijz-postgres 2>/dev/null)
    
    if [ "$backend_running" = "true" ] && [ "$postgres_running" = "true" ]; then
        echo "🔍 测试数据库连接..."
        if docker exec zhiweijz-postgres pg_isready -U zhiweijz &> /dev/null; then
            echo "  ✅ 数据库连接正常"
        else
            echo "  ❌ 数据库连接失败"
        fi
        
        echo "🔍 测试后端健康检查..."
        if docker exec zhiweijz-backend curl -f http://localhost:3000/api/health &> /dev/null; then
            echo "  ✅ 后端健康检查通过"
        else
            echo "  ❌ 后端健康检查失败"
        fi
    else
        echo "  ⚠️  容器未运行，跳过网络测试"
    fi
fi

# 检查端口占用
echo ""
echo "🔍 检查端口占用..."
ports=("80" "443" "3000" "3001" "5432")

for port in "${ports[@]}"; do
    if netstat -tuln 2>/dev/null | grep ":$port " &> /dev/null; then
        echo "  端口 $port: ✅ 已占用"
    else
        echo "  端口 $port: ❌ 未占用"
    fi
done

# 检查磁盘空间
echo ""
echo "🔍 检查磁盘空间..."
df_output=$(df -h . | tail -1)
echo "  当前目录磁盘使用情况: $df_output"

available_space=$(echo "$df_output" | awk '{print $4}' | sed 's/[^0-9.]//g')
if [ -n "$available_space" ] && [ "$(echo "$available_space < 1" | bc 2>/dev/null)" = "1" ]; then
    echo "  ⚠️  磁盘空间不足，可能影响容器运行"
else
    echo "  ✅ 磁盘空间充足"
fi

# 总结
echo ""
echo "📋 状态总结:"

all_running=true
for container in "${containers[@]}"; do
    if docker inspect "$container" &> /dev/null; then
        running=$(docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null)
        if [ "$running" != "true" ]; then
            all_running=false
            break
        fi
    else
        all_running=false
        break
    fi
done

if [ "$all_running" = "true" ]; then
    echo "✅ 所有容器正常运行，可以执行预算诊断脚本"
    echo ""
    echo "💡 下一步操作:"
    echo "  bash scripts/budget-diagnosis-docker.sh"
else
    echo "❌ 部分容器未正常运行"
    echo ""
    echo "💡 建议操作:"
    echo "  1. 启动所有服务: docker-compose up -d"
    echo "  2. 查看日志: docker-compose logs"
    echo "  3. 重新检查状态: bash scripts/check-docker-status.sh"
fi

echo ""
echo "🔧 常用命令:"
echo "  启动服务: docker-compose up -d"
echo "  停止服务: docker-compose down"
echo "  查看日志: docker-compose logs [service_name]"
echo "  重启服务: docker-compose restart [service_name]"
