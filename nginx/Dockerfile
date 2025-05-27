FROM nginx:1.25-alpine

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 复制自定义配置
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 设置权限
RUN chown -R nginx:nginx /var/log/nginx

# 暴露端口
EXPOSE 80 443

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
