#!/bin/sh
set -e

# 设置默认环境变量
export PROJECT_NAME=${PROJECT_NAME:-zhiweijz}
export BACKEND_PORT=${BACKEND_PORT:-3000}
export FRONTEND_PORT=${FRONTEND_PORT:-3001}
export EXTERNAL_DOMAIN=${EXTERNAL_DOMAIN:-}

echo "Starting nginx with configuration:"
echo "  PROJECT_NAME: $PROJECT_NAME"
echo "  BACKEND_PORT: $BACKEND_PORT"
echo "  FRONTEND_PORT: $FRONTEND_PORT"
echo "  EXTERNAL_DOMAIN: $EXTERNAL_DOMAIN"

# 使用envsubst替换nginx配置文件中的环境变量
envsubst '${PROJECT_NAME} ${BACKEND_PORT} ${FRONTEND_PORT} ${EXTERNAL_DOMAIN}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Generated nginx configuration:"
echo "  Backend upstream: ${PROJECT_NAME}-backend:${BACKEND_PORT}"
echo "  Frontend upstream: ${PROJECT_NAME}-frontend:${FRONTEND_PORT}"

# 测试nginx配置
nginx -t

# 启动nginx
exec nginx -g "daemon off;"
