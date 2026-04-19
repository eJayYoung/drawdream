# 绘梦 (Huimeng) 项目进度跟踪

> 更新时间: 2026/04/17
> 基于 docs/plan.md 架构文档

---

## 总体进度

| 分类 | 完成 | 进行中 | 未开始 | 总计 |
|------|------|--------|--------|------|
| 前端应用 | 2 | 0 | 2 | 4 |
| 后端服务 | 4 | 1 | 1 | 6 |
| 共享包 | 1 | 0 | 3 | 4 |
| 基础设施 | 3 | 0 | 1 | 4 |
| API 端点 | 15 | 5 | 10 | 30 |
| ComfyUI Workflows | 10 | 0 | 0 | 10 |

**整体完成度: ~45%**

---

## 一、前端应用 (Apps)

### 1. Web 主站 (apps/web)
| 状态 | 进度 |
|------|------|
| ✅ 已完成 | 90% |

**已完成:**
- [x] Next.js 14 App Router 基础架构
- [x] (auth) 认证页面: login, register, layout
- [x] (dashboard) 页面: home, projects, create, materials, published, layout
- [x] Tailwind CSS + shadcn/ui 配置
- [x] API 客户端封装 (lib/api.ts)
- [x] 工具函数 (lib/utils.ts)
- [x] Docker 部署配置

**未完成/进行中:**
- [ ] 登录页面完整实现 (page.tsx 需完善)
- [ ] 创作流程页面 (create/[id]/page.tsx) 完整实现
- [ ] 项目列表页面 (projects/page.tsx) 完整实现
- [ ] 素材管理页面 (materials/page.tsx) 完整实现

---

### 2. Admin 管理后台 (apps/admin)
| 状态 | 进度 |
|------|------|
| ❌ 未开始 | 0% |

**计划功能:**
- 用户管理
- 项目审核
- 内容管理
- 数据统计

---

### 3. Mobile H5 (apps/mobile)
| 状态 | 进度 |
|------|------|
| ❌ 未开始 | 0% |

**计划技术栈:** React Native (Expo) 或 Tauri

---

### 4. 包结构 (apps 层级)
| 状态 | 内容 |
|------|------|
| ✅ 已完成 | Turborepo 单仓库配置 |
| ✅ 已完成 | pnpm-workspace.yaml 工作区配置 |

---

## 二、共享包 (Packages)

### 1. shared-types (packages/shared-types)
| 状态 | 进度 |
|------|------|
| ✅ 已完成 | 80% |

**已完成:**
- [x] 基础类型定义
- [x] TypeScript 配置

**待完善:**
- [ ] 缺少项目、剧本、分集等业务类型

---

### 2. ui (packages/ui)
| 状态 | 进度 |
|------|------|
| ❌ 未开始 | 0% |

**计划:** shadcn/ui 共享组件包

---

### 3. api-client (packages/api-client)
| 状态 | 进度 |
|------|------|
| ❌ 未开始 | 0% |

**计划:** API 客户端封装

---

### 4. utils (packages/utils)
| 状态 | 进度 |
|------|------|
| ❌ 未开始 | 0% |

**计划:** 共享工具函数

---

## 三、后端服务 (Services)

### 1. API 服务 (services/api) - NestJS
| 状态 | 进度 |
|------|------|
| ✅ 已完成 | 75% |

**已完成模块:**
| 模块 | 状态 | 说明 |
|------|------|------|
| auth | ✅ | 手机号登录、发送验证码、微信登录(stub) |
| user | ✅ | 用户管理 |
| project | ✅ | 项目 CRUD、分集/角色/分镜管理 |
| workflow | ✅ | 剧本生成、智能分集、角色生成、分镜生成 |
| generation | ✅ | 任务队列、ComfyUI 回调 |
| media | ⚠️ | 部分实现 |
| common | ✅ | LLM 服务封装 |

**未完成/进行中:**
- [ ] 微信 OAuth 完整实现 (当前为 stub)
- [ ] 绑定手机号接口完善
- [ ] Media 模块完整功能
- [ ] 发布相关接口

---

### 2. ComfyUI 服务 (services/comfyui)
| 状态 | 进度 |
|------|------|
| ⚠️ 进行中 | 50% |

**已完成:**
- [x] Python FastAPI 基础结构
- [x] requirements.txt
- [x] Docker 配置
- [x] models/ 和 output/ 目录
- [x] Workflow JSON 模板 (10个)

**未完成:**
- [ ] ComfyUI Manager 节点逻辑
- [ ] Worker 节点部署
- [ ] WebSocket 实时进度推送

---

### 3. 实时通讯服务 (services/realtime)
| 状态 | 进度 |
|------|------|
| ❌ 未开始 | 0% |

**计划:** Socket.io WebSocket 服务

---

## 四、API 端点实现情况

### 认证 (Auth) - 5/6 端点
| 方法 | 路径 | 状态 |
|------|------|------|
| POST | /api/auth/phone/send-code | ✅ |
| POST | /api/auth/phone/login | ✅ |
| GET | /api/auth/wechat/qrcode | ⚠️ stub |
| POST | /api/auth/wechat/callback | ⚠️ stub |
| POST | /api/auth/bind-phone | ⚠️ stub |
| POST | /api/auth/logout | ❌ |

---

### 项目 (Project) - 14/14 端点
| 方法 | 路径 | 状态 |
|------|------|------|
| GET | /api/projects | ✅ |
| POST | /api/projects | ✅ |
| GET | /api/projects/:id | ✅ |
| PUT | /api/projects/:id | ✅ |
| DELETE | /api/projects/:id | ✅ |
| POST | /api/projects/:id/script | ✅ |
| PUT | /api/projects/:id/script | ✅ |
| POST | /api/projects/:id/episodes | ✅ |
| GET | /api/projects/:id/episodes | ✅ |
| POST | /api/projects/:id/characters | ✅ |
| GET | /api/projects/:id/characters | ✅ |
| POST | /api/projects/:id/storyboards | ✅ |
| POST | /api/projects/:id/images | ✅ |
| POST | /api/projects/:id/video | ✅ |

---

### 创作流程 (Workflow) - 7/7 端点
| 方法 | 路径 | 状态 |
|------|------|------|
| POST | /api/workflow/projects/:id/script | ✅ |
| PUT | /api/workflow/projects/:id/script | ⚠️ TODO |
| POST | /api/workflow/projects/:id/episodes | ✅ |
| POST | /api/workflow/projects/:id/characters | ✅ |
| POST | /api/workflow/episodes/:id/storyboards | ✅ |
| GET | /api/workflow/episodes/:id/storyboards | ✅ |
| PUT | /api/workflow/storyboards/:id | ✅ |

---

### AI 生成 (Generation) - 4/4 端点
| 方法 | 路径 | 状态 |
|------|------|------|
| POST | /api/generation/queue | ✅ |
| GET | /api/generation/tasks/:taskId | ✅ |
| GET | /api/generation/projects/:projectId/tasks | ✅ |
| POST | /api/generation/webhook/comfyui | ✅ |

---

### 素材 (Media) - 0/3 端点
| 方法 | 路径 | 状态 |
|------|------|------|
| GET | /api/materials | ❌ |
| POST | /api/materials/upload | ❌ |
| DELETE | /api/materials/:id | ❌ |

---

### 发布 (Publication) - 0/2 端点
| 方法 | 路径 | 状态 |
|------|------|------|
| POST | /api/projects/:id/publish | ❌ |
| GET | /api/published | ❌ |

---

## 五、ComfyUI Workflow 模板

| Workflow | 状态 | 说明 |
|----------|------|------|
| character_image.json | ✅ | 角色图生成 (z_image_turbo) |
| character_image_v2.json | ✅ | 角色图生成 v2 |
| scene_image_portrait.json | ✅ | 竖屏场景图 |
| scene_image_landscape.json | ✅ | 横屏场景图 |
| scene_image_ref.json | ✅ | 场景参考图生图 |
| multi_ref_image.json | ✅ | 多参考图生图 (Qwen) |
| flux_multi_ref_image.json | ✅ | 多参考图生图 (Flux2) |
| video_generation.json | ✅ | 视频生成 (LTXV 首尾帧) |
| video_long_shot.json | ✅ | 视频长镜头 (LTXV 首中尾帧) |
| multi_angle_camera.json | ✅ | 多角度分镜 |

**位置:** `services/comfyui/workflows/`

---

## 六、基础设施 (Infrastructure)

### 1. Docker Compose
| 状态 | 内容 |
|------|------|
| ✅ 已完成 | postgres, redis, minio, nginx 服务定义 |
| ⚠️ 部分 | ComfyUI 服务需完善 |

---

### 2. PostgreSQL 数据库
| 状态 | 进度 |
|------|------|
| ✅ 已完成 | init.sql 脚本 |

**已包含表:**
- [x] users
- [x] user_phones
- [x] user_wechat
- [x] projects
- [x] scripts
- [x] episodes
- [x] characters
- [x] storyboards
- [x] generation_tasks

---

### 3. Redis
| 状态 | 内容 |
|------|------|
| ⚠️ 配置存在 | redis.conf 需完善 |

---

### 4. Nginx
| 状态 | 内容 |
|------|------|
| ⚠️ 部分 | nginx.conf 基础配置 |
| ❌ | SSL 证书配置缺失 |

---

### 5. MinIO
| 状态 | 内容 |
|------|------|
| ✅ 在 docker-compose.yml 中定义 | S3 兼容对象存储 |

---

## 七、数据库表设计

| 表名 | 状态 |
|------|------|
| users | ✅ |
| user_phones | ✅ |
| user_wechat | ✅ |
| projects | ✅ |
| scripts | ✅ |
| episodes | ✅ |
| characters | ✅ |
| storyboards | ✅ |
| generation_tasks | ✅ |

---

## 八、核心功能模块进度

### 1. 账号系统
| 功能 | 状态 |
|------|------|
| 手机号+验证码登录 | ✅ |
| 微信 OAuth 扫码登录 | ⚠️ stub |
| 邮箱+密码登录 | ❌ |
| 统一账号绑定 (UnionID) | ⚠️ 部分 |

### 2. 创作流程
| 步骤 | 状态 |
|------|------|
| 1. 剧本创作 (AI) | ⚠️ 接口存在，LLM 集成待完善 |
| 2. 智能分集 | ⚠️ 接口存在，LLM 集成待完善 |
| 3. 角色配音 | ❌ |
| 4. 智能分镜 | ⚠️ 接口存在 |
| 5. 分镜图生成 | ⚠️ API 已集成，需 ComfyUI 部署 |
| 6. 成片合成 | ⚠️ API 已集成，需 ComfyUI 部署 |

### 3. ComfyUI 集成
| 组件 | 状态 |
|------|------|
| REST API 封装 | ✅ |
| Workflow 模板 | ✅ (10个) |
| Worker 节点 | ⚠️ 框架存在，部署待完成 |
| Manager Node | ⚠️ 部分实现 |
| WebSocket 进度推送 | ⚠️ API 层已实现，待 ComfyUI 回调 |

---

## 九、待办事项优先级

### P0 - 核心功能
1. [ ] ComfyUI API 集成 - 实现图片/视频生成
2. [ ] 微信 OAuth 完整实现
3. [ ] LLM 服务集成 (GPT/Claude) - 剧本生成、智能分集
4. [ ] 发布模块 - 项目发布、已发布列表

### P1 - 重要功能
5. [ ] 素材管理模块 - 上传、列表、删除
6. [ ] 角色配音/TTS 集成
7. [ ] WebSocket 实时进度推送
8. [ ] Admin 管理后台基础框架

### P2 - 增强功能
9. [ ] Mobile H5 应用框架
10. [ ] 共享 UI 组件包
11. [ ] API 客户端包
12. [ ] Nginx SSL 配置

---

## 十、技术栈完成度

| 层级 | 技术 | 状态 |
|------|------|------|
| 前端框架 | Next.js 14 | ✅ 90% |
| UI 组件 | shadcn/ui + Tailwind | ✅ 60% |
| 状态管理 | Zustand + React Query | ❌ 未集成 |
| 后端框架 | NestJS | ✅ 75% |
| 数据库 | PostgreSQL 16 | ✅ |
| 缓存 | Redis 7 | ⚠️ 配置中 |
| 文件存储 | MinIO | ✅ |
| ComfyUI | Python + FastAPI | ⚠️ 50% |
| 任务队列 | BullMQ | ❌ 未集成 |
| 即时通讯 | Socket.io | ⚠️ Gateway 存在 |
| 容器化 | Docker + K8s | ⚠️ Docker 完成 |

---

## 文件更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026/04/17 | 更新 ComfyUI 进度：Workflow 模板 10 个已完成，API 层已完成 |
| 2026/04/16 | 初始进度文档创建 |
