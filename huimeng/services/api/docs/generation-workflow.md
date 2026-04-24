# Generation Workflow API

## 接口概述

- **路径**: `POST /api/generation/workflow`
- **认证**: JWT Bearer Token
- **功能**: 创建 AI 生成工作流任务（文生图 / 图生图）

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `projectId` | string | ✅ | 项目ID，用于获取 aspectRatio 计算 resolution |
| `taskType` | string | ✅ | 任务类型，见下方列表 |
| `prompt` | string | ✅ | 提示词 |
| `inParam` | string | ✅ | JSON字符串，内含 `{ prompt, resolution?, image? }` |
| `episodeId` | string | ❌ | 集ID |
| `storyboardId` | string | ❌ | 分镜ID |

### taskType 可选值

| 值 | 说明 |
|----|------|
| `createRolePicture-t2i` | 创建角色图片 - 文生图 |
| `createRolePicture-i2i` | 创建角色图片 - 图文生图 |

### inParam 结构

```json
{
  "prompt": "a beautiful girl",
  "resolution": "1280x720",
  "image": "base64..."  // 仅 i2i 时传递
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | ✅ | 提示词 |
| `resolution` | string | ❌ | 分辨率，如不传则根据 project 的 aspectRatio 自动计算 |
| `image` | string | ❌ | base64 格式图片，仅 i2i 时传递 |

### resolution 自动计算规则

| aspectRatio | resolution |
|-------------|------------|
| `16:9` | `1280x720` |
| `9:16` | `720x1280` |
| 默认 | `1280x720` |

## 请求示例

```json
POST /api/generation/workflow
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "proj_xxx",
  "taskType": "createRolePicture-t2i",
  "prompt": "a beautiful girl in traditional Chinese clothing",
  "inParam": "{\"prompt\":\"a beautiful girl in traditional Chinese clothing\",\"resolution\":\"1280x720\"}"
}
```

## 响应

### 成功响应

```json
{
  "taskId": "task_abc123",
  "status": "queued"
}
```

### 响应状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功返回 taskId |
| 401 | 未授权（JWT 无效） |
| 400 | 参数错误（如 inParam JSON 解析失败） |
| 500 | 服务器内部错误 |

## 调用链路

```
HTTP POST /api/generation/workflow
  │
  ├─ JwtAuthGuard (JWT鉴权)
  │
  └─ GenerationController.createWorkflow()     [generation.controller.ts:23-45]
       │
       └─ GenerationService.executeWorkflow()   [generation.service.ts:73-128]
            │
            ├─ 1. JSON.parse(inParam) 解析入参
            │
            ├─ 2. ProjectService.findById(projectId) 获取 aspectRatio
            │        └─ → PostgreSQL (MikroORM)
            │
            ├─ 3. getResolution(aspectRatio) 计算 resolution
            │        ├─ "16:9" → "1280x720"
            │        └─ "9:16" → "720x1280"
            │
            ├─ 4. 重新组装 finalInParam（补充 resolution）
            │
            ├─ 5. ComfyUIService.submitWorkflow(taskType, prompt, finalInParamStr)
            │        └─ → POST ComfyUI /api/render/call
            │
            ├─ 6. pollTaskStatus(comfyTaskId, taskType, pollState)  [后台异步]
            │
            └─ 7. 立即返回 { taskId, status: "queued" }
```

### 后台轮询流程 (pollTaskStatus)

```
轮询任务状态（每 2 秒一次，最多 1800 次 / 60 分钟）

├─ 状态 success:
│    ├─ fetchAssetFile(assetId) → ComfyUI /api/asset/{id}/file
│    ├─ OssService.uploadBuffer() → 阿里云 OSS
│    └─ WebSocket 推送 task_update / generation_progress
│
├─ 状态 failed:
│    └─ WebSocket 推送 error
│
└─ 状态 pending/running:
     └─ 推送 progress (0-90%)，继续轮询
```

## WebSocket 推送

连接 namespace: `/generation`

### task_update 事件

推送到 `user:{userId}` 房间

```json
{
  "taskId": "task_abc123",
  "status": "completed",
  "progress": 100,
  "outputs": {
    "assets": ["https://oss.xxx.com/xxx.png"]
  }
}
```

### generation_progress 事件

推送到 `project:{projectId}` 房间

```json
{
  "taskId": "task_abc123",
  "episodeId": "ep_xxx",
  "storyboardId": "sb_xxx",
  "status": "completed",
  "progress": 100,
  "outputResult": {
    "assets": ["https://oss.xxx.com/xxx.png"]
  }
}
```

## ComfyUI 代理接口

### 1. 提交任务 /api/render/call

generation service 调用 comfyui service 转发请求：

```json
{
  "header": {
    "key": "hm-yijie",
    "callMode": "async",
    "operationType": "call",
    "requestContext": {}
  },
  "body": {
    "api": "createRolePicture-t2i",
    "prompt": "a beautiful girl",
    "context": "",
    "inParam": "{\"prompt\":\"a beautiful girl\",\"resolution\":\"1280x720\"}"
  }
}
```

### 2. 查询任务 /api/render/query

```json
{
  "header": {
    "key": "hm-yijie",
    "callMode": "sync",
    "operationType": "query"
  },
  "body": {
    "api": "createRolePicture-t2i",
    "taskId": "task_abc123"
  }
}
```

## 其他接口

### GET /api/generation/tasks/:taskId

查询任务状态（代理到 ComfyUI 查询接口）

**响应示例:**
```json
{
  "taskId": "task_abc123",
  "status": "success",
  "progress": 100,
  "outputResult": { "assets": ["oss://..."] }
}
```

### GET /api/generation/projects/:projectId/tasks

获取项目所有任务（ComfyUI 不支持按项目查询，返回空数组）

### POST /api/generation/webhook/comfyui

ComfyUI 回调接口（预留）

## 文件索引

| 文件 | 说明 |
|------|------|
| `src/generation/generation.controller.ts` | Controller 层，接口入口 |
| `src/generation/generation.service.ts` | Service 层，业务逻辑 |
| `src/generation/generation.gateway.ts` | WebSocket 网关 |
| `src/common/comfyui.service.ts` | ComfyUI 代理服务 |
| `src/common/oss.service.ts` | OSS 上传服务 |
| `src/project/project.service.ts` | 项目服务（查 aspectRatio） |
