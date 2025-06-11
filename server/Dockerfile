# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache \
    bash \
    postgresql-client \
    curl

# 复制package文件
COPY server/package*.json ./

# 安装所有依赖（包括devDependencies用于构建）
RUN npm install

# 复制源代码
COPY server/ .

# 生成Prisma客户端
RUN npx prisma generate

# 构建TypeScript代码
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 安装必要的系统依赖
RUN apk add --no-cache \
    bash \
    postgresql-client \
    curl

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY server/package*.json ./

# 安装生产依赖
RUN npm install --only=production

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 复制必要的运行时文件
COPY server/scripts/ ./scripts/
COPY server/prisma/ ./prisma/

# 设置脚本执行权限
RUN chmod +x scripts/*.sh scripts/*.js scripts/*/*.sh scripts/*/*.js

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# 改变文件所有权
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动命令 - 使用自动升级脚本
CMD ["bash", "scripts/deployment/start.sh"]
