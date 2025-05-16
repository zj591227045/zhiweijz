#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}启动所有服务...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查scripts目录中的启动脚本是否存在
if [ ! -f "./scripts/start-backend.sh" ] || [ ! -f "./scripts/start-frontend.sh" ]; then
  echo -e "${RED}错误: 启动脚本不存在${NC}"
  exit 1
fi

# 确保脚本有执行权限
chmod +x ./scripts/start-backend.sh
chmod +x ./scripts/start-frontend.sh

# 使用tmux启动多个窗口（如果安装了tmux）
if command -v tmux &> /dev/null; then
  echo -e "${BLUE}使用tmux启动服务...${NC}"
  
  # 创建新的tmux会话
  tmux new-session -d -s zhiweijz
  
  # 在第一个窗口启动后端
  tmux send-keys -t zhiweijz:0 "./scripts/start-backend.sh" C-m
  
  # 创建新窗口并启动前端
  tmux new-window -t zhiweijz:1
  tmux send-keys -t zhiweijz:1 "./scripts/start-frontend.sh" C-m
  
  # 附加到tmux会话
  echo -e "${YELLOW}按 Ctrl+B 然后按数字键切换窗口${NC}"
  echo -e "${YELLOW}按 Ctrl+B 然后按 D 分离会话${NC}"
  tmux attach-session -t zhiweijz
else
  # 如果没有安装tmux，则使用后台进程
  echo -e "${YELLOW}未检测到tmux，使用后台进程启动服务...${NC}"
  echo -e "${YELLOW}后端日志将写入 backend.log${NC}"
  echo -e "${YELLOW}前端日志将写入 frontend.log${NC}"
  
  # 启动后端并将输出重定向到日志文件
  ./scripts/start-backend.sh > backend.log 2>&1 &
  BACKEND_PID=$!
  
  # 启动前端并将输出重定向到日志文件
  ./scripts/start-frontend.sh > frontend.log 2>&1 &
  FRONTEND_PID=$!
  
  echo -e "${GREEN}服务已启动${NC}"
  echo -e "${BLUE}后端进程ID: ${BACKEND_PID}${NC}"
  echo -e "${BLUE}前端进程ID: ${FRONTEND_PID}${NC}"
  echo -e "${YELLOW}使用 'tail -f backend.log' 或 'tail -f frontend.log' 查看日志${NC}"
  echo -e "${YELLOW}使用 'kill ${BACKEND_PID} ${FRONTEND_PID}' 停止服务${NC}"
fi
