.PHONY: up down build clean logs ps dev frontend backend build-frontend build-backend

# Docker 相关命令
up:
	docker compose up -d

down:
	docker compose down

reup:
	docker compose down
	docker compose up -d

reup-frontend:
	docker compose down frontend
	docker compose up -d frontend

reup-backend:
	docker compose down backend
	docker compose up -d backend

build:
	docker compose build

build-frontend:
	docker compose build frontend

build-backend:
	docker compose build backend

frontend-bash:
	docker compose exec frontend bash

backend-bash:
	docker compose exec backend bash

clean:
	docker compose down -v
	docker system prune -f

logs:
	docker compose logs -f

ps:
	docker compose ps

# 开发相关命令
dev: up
	@echo "开发环境已启动，访问 http://localhost:3000"

frontend:
	cd frontend && pnpm dev

backend:
	cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 安装依赖
install:
	cd frontend && pnpm install
	cd backend && pip install -r requirements.txt

# 代码格式化
format:
	cd frontend && pnpm format
	cd backend && black .

# 代码检查
lint:
	cd frontend && pnpm lint
	cd backend && flake8

# 测试
test:
	cd frontend && pnpm test
	cd backend && pytest

# 帮助信息
help:
	@echo "可用的命令："
	@echo "  make up           - 启动 Docker 服务"
	@echo "  make down         - 停止 Docker 服务"
	@echo "  make build        - 构建所有 Docker 镜像"
	@echo "  make build-frontend - 构建前端 Docker 镜像"
	@echo "  make build-backend  - 构建后端 Docker 镜像"
	@echo "  make clean        - 清理 Docker 资源"
	@echo "  make logs         - 查看 Docker 日志"
	@echo "  make ps           - 查看 Docker 容器状态"
	@echo "  make dev          - 启动开发环境"
	@echo "  make frontend     - 启动前端开发服务器"
	@echo "  make backend      - 启动后端开发服务器"
	@echo "  make install      - 安装项目依赖"
	@echo "  make format       - 格式化代码"
	@echo "  make lint         - 运行代码检查"
	@echo "  make test         - 运行测试" 
	@echo "  make frontend-bash - 进入前端容器"
	@echo "  make backend-bash - 进入后端容器"