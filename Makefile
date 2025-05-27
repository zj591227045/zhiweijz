# 只为记账 - Docker管理Makefile

.PHONY: help build up down logs restart clean health backup check-env dev-frontend

# 默认目标
help:
	@echo "只为记账 Docker 管理命令"
	@echo "========================"
	@echo "Docker命令:"
	@echo "  make build       - 构建所有Docker镜像"
	@echo "  make up          - 启动所有服务"
	@echo "  make down        - 停止所有服务"
	@echo "  make restart     - 重启所有服务"
	@echo "  make logs        - 查看所有服务日志"
	@echo "  make health      - 检查服务健康状态"
	@echo "  make clean       - 清理所有容器和镜像"
	@echo "  make backup      - 备份数据库"
	@echo "  make deploy      - 一键部署（构建+启动+迁移）"
	@echo "  make dev         - Docker开发环境启动"
	@echo ""
	@echo "开发命令:"
	@echo "  make check-env   - 检查环境配置和服务状态"
	@echo "  make dev-frontend - 启动本地前端开发服务"
	@echo "  make dev-backend  - 启动Docker后端+本地前端"

# 构建镜像
build:
	@echo "构建Docker镜像..."
	docker-compose build --no-cache

# 启动服务
up:
	@echo "启动服务..."
	docker-compose up -d

# 停止服务
down:
	@echo "停止服务..."
	docker-compose down

# 重启服务
restart:
	@echo "重启服务..."
	docker-compose restart

# 查看日志
logs:
	@echo "查看服务日志..."
	docker-compose logs -f

# 检查健康状态
health:
	@echo "检查服务健康状态..."
	@docker-compose ps
	@echo ""
	@echo "检查API健康状态..."
	@curl -f http://localhost/health || echo "健康检查失败"

# 清理
clean:
	@echo "清理Docker资源..."
	docker-compose down -v --remove-orphans
	docker system prune -f

# 备份数据库
backup:
	@echo "备份数据库..."
	@mkdir -p backups
	docker-compose exec -T postgres pg_dump -U postgres zhiweijz > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "备份完成: backups/backup_$(shell date +%Y%m%d_%H%M%S).sql"

# 一键部署
deploy:
	@echo "开始一键部署..."
	@if [ ! -f .env ]; then \
		echo "复制环境变量模板..."; \
		cp .env.docker .env; \
		echo "请编辑 .env 文件设置正确的配置"; \
	fi
	$(MAKE) build
	$(MAKE) up
	@echo "等待服务启动..."
	@sleep 15
	@echo "运行数据库迁移..."
	docker-compose exec -T backend npx prisma migrate deploy || echo "迁移可能已经运行过了"
	$(MAKE) health
	@echo "部署完成！访问 http://localhost"

# 开发环境
dev:
	@echo "启动开发环境..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 检查环境
check-env:
	@echo "检查环境配置..."
	./scripts/check-env.sh

# 启动本地前端开发服务
dev-frontend:
	@echo "启动本地前端开发服务..."
	./scripts/start-dev-frontend.sh

# 启动Docker后端+本地前端
dev-backend:
	@echo "启动Docker后端服务..."
	docker-compose up -d postgres backend
	@echo "等待后端服务启动..."
	@sleep 10
	@echo "启动本地前端服务..."
	./scripts/start-dev-frontend.sh
