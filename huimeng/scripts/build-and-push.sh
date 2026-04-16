#!/bin/bash
set -e

# ============================================
# 配置
# ============================================
REGISTRY="crpi-rfyj03uo49s0515l.cn-hangzhou.personal.cr.aliyuncs.com"
NAMESPACE="draw_dream"
IMAGE_NAME="huimeng"

API_TAG="api-latest"
WEB_TAG="web-latest"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 帮助信息
# ============================================
usage() {
    echo "用法: $0 [命令] [服务]"
    echo ""
    echo "命令:"
    echo "  build       构建镜像 (需要服务名或 all)"
    echo "  push        推送镜像 (需要服务名或 all)"
    echo "  build-push  构建并推送 (需要服务名或 all)"
    echo ""
    echo "服务:"
    echo "  api         API 服务 (NestJS)"
    echo "  web         Web 服务 (Next.js)"
    echo "  all         所有服务"
    echo ""
    echo "示例:"
    echo "  $0 build-push all      # 构建并推送所有镜像"
    echo "  $0 build api           # 仅构建 API"
    echo "  $0 push web            # 仅推送 Web"
    exit 1
}

# ============================================
# 构建函数
# ============================================
build_api() {
    log_info "构建 API 镜像..."
    docker build \
        -t "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${API_TAG}" \
        -f "${PROJECT_DIR}/services/api/Dockerfile" \
        "${PROJECT_DIR}"
    log_info "API 镜像构建完成: ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${API_TAG}"
}

build_web() {
    log_info "构建 Web 镜像..."
    docker build \
        -t "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${WEB_TAG}" \
        -f "${PROJECT_DIR}/apps/web/Dockerfile" \
        "${PROJECT_DIR}"
    log_info "Web 镜像构建完成: ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${WEB_TAG}"
}

# ============================================
# 推送函数
# ============================================
push_api() {
    log_info "推送 API 镜像..."
    docker push "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${API_TAG}"
    log_info "API 镜像推送完成"
}

push_web() {
    log_info "推送 Web 镜像..."
    docker push "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${WEB_TAG}"
    log_info "Web 镜像推送完成"
}

# ============================================
# 登录检查
# ============================================
check_login() {
    if ! docker info | grep -q "${REGISTRY}"; then
        log_warn "未登录镜像仓库，请先登录:"
        echo "  docker login ${REGISTRY} -u ${NAMESPACE}"
        exit 1
    fi
}

# ============================================
# 主逻辑
# ============================================
COMMAND="${1:-}"
SERVICE="${2:-}"

if [ -z "$COMMAND" ] || [ -z "$SERVICE" ]; then
    usage
fi

case "$COMMAND" in
    build)
        check_login
        case "$SERVICE" in
            api)      build_api ;;
            web)      build_web ;;
            all)
                build_api
                build_web
                ;;
            *)        usage ;;
        esac
        ;;
    push)
        check_login
        case "$SERVICE" in
            api)      push_api ;;
            web)      push_web ;;
            all)
                push_api
                push_web
                ;;
            *)        usage ;;
        esac
        ;;
    build-push)
        check_login
        case "$SERVICE" in
            api)
                build_api
                push_api
                ;;
            web)
                build_web
                push_web
                ;;
            all)
                build_api
                push_api
                build_web
                push_web
                ;;
            *)        usage ;;
        esac
        log_info "全部完成!"
        ;;
    *)
        usage
        ;;
esac
