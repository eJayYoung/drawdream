# 绘梦 (Huimeng) - AI短剧生成平台

一个基于 AI 技术的短剧创作平台，支持从剧本到成片的全流程 AI 自动化生成。

## 功能特性

- **账号系统**: 支持手机号/验证码登录、微信扫码登录
- **项目创作**:
  - 剧本生成 (AI)
  - 智能分集
  - 角色与配音
  - 智能分镜
  - 分镜图生成
  - 成片合成
- **素材管理**: 统一管理创作过程中生成的图片、视频、音频素材
- **发布系统**: 完整剧集创作完成后进行发布

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui |
| 后端 | NestJS, Node.js, TypeScript |
| 数据库 | PostgreSQL 16, Redis |
| AI 引擎 | ComfyUI (图像/视频生成) |
| 文件存储 | MinIO (S3 兼容) |
| 部署 | Docker, Docker Compose, Nginx |

## 项目结构

```
huimeng/
├── apps/
│   ├── web/                    # Next.js 主站
│   └── admin/                  # 管理后台 (待开发)
├── packages/
│   └── shared-types/          # 共享类型定义
├── services/
│   ├── api/                   # NestJS API 服务
│   └── comfyui/               # ComfyUI Python 服务
├── infra/
│   ├── docker-compose.yml     # Docker 编排配置
│   ├── nginx/                  # Nginx 配置
│   ├── postgres/              # PostgreSQL 配置
│   └── redis/                 # Redis 配置
└── docs/                      # 文档
```

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- GPU 服务器 (用于 ComfyUI, 可选)

### 安装

```bash
# 克隆项目
cd huimeng

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env

# 启动基础设施 (PostgreSQL, Redis, MinIO)
docker compose -f infra/docker-compose.yml up -d postgres redis minio

# 运行数据库迁移
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

### 开发服务器

```bash
# 启动所有服务
pnpm dev

# 单独启动
pnpm --filter @huimeng/web dev      # Next.js Web
pnpm --filter @huimeng/api dev       # NestJS API
pnpm --filter @huimeng/comfyui dev  # ComfyUI
```

### 生产部署

```bash
# 构建并启动所有服务
docker compose -f infra/docker-compose.yml up -d
```

## 开发指南

### API 文档

启动服务后访问: http://localhost:3001/api/docs

### 数据库迁移

```bash
# 生成迁移
pnpm db:generate

# 运行迁移
pnpm db:migrate
```

### 添加新的 Workflow

1. 在 `services/comfyui/src/main.py` 中添加新的 workflow 定义
2. 在 `services/api/src/generation/` 中添加对应的生成服务
3. 更新前端 UI

## 环境变量

详见 `.env.example`

## 许可证

私有项目
