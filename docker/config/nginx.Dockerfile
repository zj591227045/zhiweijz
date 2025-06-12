# 只为记账 - Nginx 反向代理 Dockerfile
FROM nginx:1.25-alpine

# 安装必要工具
RUN apk add --no-cache curl openssl bash

# 复制配置文件
COPY config/nginx.conf /etc/nginx/nginx.conf

# 复制SSL证书生成脚本
COPY config/generate-ssl-cert.sh /usr/local/bin/generate-ssl-cert.sh

# 复制启动脚本
COPY config/start-nginx.sh /usr/local/bin/start-nginx.sh

# 设置脚本权限
RUN chmod +x /usr/local/bin/generate-ssl-cert.sh
RUN chmod +x /usr/local/bin/start-nginx.sh

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 创建SSL目录
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

# 设置权限
RUN chown -R nginx:nginx /var/log/nginx

# 健康检查 - 同时检查HTTP和HTTPS
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost/health && \
        curl -k -f https://localhost/health || exit 1

# 暴露端口
EXPOSE 80 443

# 使用自定义启动脚本
CMD ["/usr/local/bin/start-nginx.sh"]
