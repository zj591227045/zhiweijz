# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# 复制根目录的package.json和package-lock.json
COPY package*.json ./
COPY server/package*.json ./server/

# 安装根目录依赖（包含开发依赖，用于构建）
RUN npm install

# 切换到server目录并安装依赖（包含开发依赖，用于构建）
WORKDIR /app/server
RUN npm install

# 复制server源代码
COPY server/ ./

# 复制Prisma schema
COPY server/prisma ./prisma

# 复制启动脚本
COPY server/scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

# 生成Prisma客户端
RUN npx prisma generate

# 构建TypeScript代码
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 安装系统依赖和curl用于健康检查
RUN apk add --no-cache \
    curl \
    dumb-init \
    openssl \
    libc6-compat

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制package.json文件
COPY --from=builder /app/server/package*.json ./

# 安装生产依赖
RUN npm install --only=production && npm cache clean --force

# 复制构建产物和必要文件
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/server/scripts ./scripts

# 创建uploads目录并设置脚本权限
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads && chmod +x scripts/start.sh

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]

# 启动命令 - 使用启动脚本
CMD ["./scripts/start.sh"]
