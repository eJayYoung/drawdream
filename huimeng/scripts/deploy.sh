#!/bin/bash
set -e

# ============================================
# 远程部署脚本
# 使用方式: ./deploy.sh [服务器SSH地址]
# 示例: ./deploy.sh root@192.168.1.100
# ============================================

SERVER="${1:-}"
DEPLOY_DIR="/opt/huimeng"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

usage() {
    echo "用法: $0 <服务器SSH地址>"
    echo ""
    echo "示例:"
    echo "  $0 root@192.168.1.100"
    echo "  $0 root@your-server.com"
    exit 1
}

# 检查参数
if [ -z "$SERVER" ]; then
    usage
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

log_info "开始部署到 ${SERVER}..."

# 1. 推送配置文件到远程
log_info "推送配置文件..."
scp "$SCRIPT_DIR/../infra/docker-compose.prod.yml" "${SERVER}:${DEPLOY_DIR}/docker-compose.yml"
scp "$SCRIPT_DIR/../infra/.env.production" "${SERVER}:${DEPLOY_DIR}/.env" 2>/dev/null || log_warn ".env 文件未找到，跳过"

# 2. 远程执行部署
log_info "远程服务器拉取镜像并启动服务..."
ssh "$SERVER" << 'ENDSSH'
set -e

DEPLOY_DIR="/opt/huimeng"
cd "$DEPLOY_DIR"

# 检查 docker-compose 文件
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found at $DEPLOY_DIR"
    exit 1
fi

# 登录镜像仓库 (如果需要)
# docker login --username=1186482015@qq.com crpi-rfyj03uo49s0515l.cn-hangzhou.personal.cr.aliyuncs.com   

# 拉取最新镜像
echo "[INFO] 拉取最新镜像..."
docker-compose pull

# 停止旧容器并启动新容器
echo "[INFO] 重启服务..."
docker-compose up -d --remove-orphans

# 显示状态
echo ""
echo "[INFO] 服务状态:"
docker-compose ps
ENDSSH

log_info "部署完成!"
