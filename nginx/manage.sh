#!/bin/bash

# nginx代理管理脚本

case "$1" in
  start)
    echo "🚀 启动nginx代理..."
    docker-compose -f docker-compose.nginx.yml up -d
    echo "✅ nginx代理已启动，访问地址: http://localhost:8085"
    ;;
  stop)
    echo "🛑 停止nginx代理..."
    docker-compose -f docker-compose.nginx.yml down
    echo "✅ nginx代理已停止"
    ;;
  restart)
    echo "🔄 重启nginx代理..."
    docker-compose -f docker-compose.nginx.yml down
    docker-compose -f docker-compose.nginx.yml up -d
    echo "✅ nginx代理已重启"
    ;;
  status)
    echo "📊 nginx代理状态:"
    docker ps | grep nginx-proxy
    echo ""
    echo "🔍 健康检查:"
    curl -s http://localhost:8085/health
    ;;
  logs)
    echo "📋 nginx代理日志:"
    docker-compose -f docker-compose.nginx.yml logs -f nginx-proxy
    ;;
  reload)
    echo "🔄 重新加载nginx配置..."
    docker exec zhiweijz-nginx-proxy nginx -s reload
    echo "✅ nginx配置已重新加载"
    ;;
  test)
    echo "🧪 测试代理服务:"
    echo "前端服务 (http://localhost:8085):"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8085
    echo ""
    echo "后端API (http://localhost:8085/api/health):"
    curl -s http://localhost:8085/api/health
    echo ""
    echo "健康检查 (http://localhost:8085/health):"
    curl -s http://localhost:8085/health
    ;;
  *)
    echo "使用方法: $0 {start|stop|restart|status|logs|reload|test}"
    echo ""
    echo "命令说明:"
    echo "  start   - 启动nginx代理"
    echo "  stop    - 停止nginx代理"
    echo "  restart - 重启nginx代理"
    echo "  status  - 查看代理状态"
    echo "  logs    - 查看代理日志"
    echo "  reload  - 重新加载配置"
    echo "  test    - 测试代理服务"
    exit 1
    ;;
esac
