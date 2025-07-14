# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建所需的系统依赖
RUN apk update && apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    openssl \
    openssl-dev \
    bash \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# 复制package文件
COPY server/package*.json ./

# 安装所有依赖（包括devDependencies用于构建）
RUN npm install --legacy-peer-deps

# 复制源代码（排除.env文件以避免覆盖Docker环境变量）
COPY server/ .
# 删除可能存在的.env文件，确保使用Docker环境变量
RUN rm -f .env .env.local .env.production .env.development 2>/dev/null || true

# 生成Prisma客户端
RUN npx prisma generate

# 构建TypeScript代码
RUN npm run build

# 清理开发依赖，只保留生产依赖
RUN npm prune --production --legacy-peer-deps

# 清理npm缓存
RUN npm cache clean --force

# 生产阶段
FROM node:18-alpine AS production

# 安装运行时必要的系统依赖
RUN apk update && apk add --no-cache \
    bash \
    postgresql-client \
    curl \
    openssl \
    dumb-init \
    libc6-compat \
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制package文件
COPY --from=builder /app/package*.json ./

# 从构建阶段复制已清理的node_modules（只包含生产依赖）
COPY --from=builder /app/node_modules ./node_modules

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 复制微信相关的静态文件（绑定页面等）
COPY --from=builder /app/public ./public

# 只复制必要的运行时文件
COPY --from=builder /app/scripts/deployment/ ./scripts/deployment/
COPY --from=builder /app/scripts/migration-manager.js ./scripts/
COPY --from=builder /app/prisma/schema.prisma ./prisma/
COPY --from=builder /app/migrations/ ./migrations/

# 创建必要目录并设置权限
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs /app && \
    chmod +x scripts/deployment/*.sh && \
    chmod +x scripts/migration-manager.js

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 使用dumb-init作为PID 1，提供更好的信号处理
ENTRYPOINT ["dumb-init", "--"]

# 启动命令 - 使用安全的启动脚本
CMD ["bash", "scripts/deployment/start.sh"]
