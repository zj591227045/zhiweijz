# 多阶段构建 - 依赖安装阶段
FROM node:18-alpine AS deps

# 安装系统依赖
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制package.json文件
COPY apps/web/package*.json ./
COPY package*.json ../

# 安装所有依赖（构建时需要dev依赖）
RUN npm install --ignore-scripts

# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# 复制源代码
COPY apps/web/ ./

# 复制共享包（如果存在）
RUN mkdir -p ../packages

# 确保public目录存在
RUN mkdir -p ./public

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN npm run build

# 生产运行阶段
FROM node:18-alpine AS runner

# 安装系统依赖
RUN apk add --no-cache \
    curl \
    dumb-init

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DEBUG=1
ENV DOCKER_ENV=true

# 复制必要文件
COPY --from=builder /app/package*.json ./

# 复制public目录
COPY --from=builder /app/public ./public

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001 || exit 1

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "server.js"]
