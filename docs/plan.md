现在为你设计完整的项目架构：                                                                      
   
  ---                                                                                               
  项目架构总览                                                                                    
                                                                                                    
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                              绘梦 (Huimeng)                              │                      
  ├─────────────────────────────────────────────────────────────────────────┤                     
  │                                                                         │
  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
  │  │   Web Client    │    │   Mobile H5     │    │   Admin Panel   │     │                        
  │  │   (Next.js)     │    │   (React)       │    │   (React)       │     │                        
  │  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │                        
  │           │                      │                      │               │                       
  │           └──────────────────────┼──────────────────────┘               │                     
  │                                  │                                       │                      
  │                           ┌──────┴──────┐                                │                    
  │                           │   Gateway   │                                │                      
  │                           │  (Nginx)    │                                │                      
  │                           └──────┬──────┘                                │
  │                                  │                                       │                      
  │                    ┌─────────────┼─────────────┐                        │                     
  │                    │             │             │                        │                       
  │           ┌────────┴───┐ ┌──────┴─────┐ ┌─────┴─────┐                  │
  │           │ Auth Svc   │ │  API GW    │ │ Media Svc │                  │                        
  │           │ (Node.js)  │ │ (Next.js)  │ │ (Node.js) │                  │                        
  │           └────────┬───┘ └──────┬─────┘ └─────┬─────┘                  │                        
  │                    │            │             │                         │                       
  │           ┌────────┴────────────┴─────────────┴────────┐               │                      
  │           │                                              │               │                      
  │  ┌────────┴────────┐  ┌──────────┴────────┐  ┌─────────┴────────┐      │
  │  │   PostgreSQL    │  │    Redis          │  │    MinIO/S3     │      │                         
  │  │   (主数据库)     │  │   (缓存/会话)       │  │   (文件存储)     │      │                     
  │  └─────────────────┘  └───────────────────┘  └──────────────────┘      │                        
  │                                                                     │    │                      
  │                              ┌────────────────────────────────────┴─┐  │                        
  │                              │         ComfyUI Cluster            │  │
  │                              │  ┌─────────┐  ┌─────────┐           │  │                         
  │                              │  │ Worker1 │  │ Worker2 │  ...      │  │                         
  │                              │  └────┬────┘  └────┬────┘           │  │
  │                              │       └──────┬─────┘                │  │                         
  │                              │        ┌─────┴─────┐                │  │
  │                              │        │  Manager  │                │  │                         
  │                              └────────┴───────────┴────────────────┘  │
  │                                                                         │                       
  └─────────────────────────────────────────────────────────────────────────┘
                                                                                                    
  ---                                                       
  技术栈选型

  ┌───────────┬──────────────────────────────────────┬─────────────────────────────────┐
  │   层级    │               技术选型               │              说明               │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 前端框架  │ Next.js 14 (App Router) + TypeScript │ SSR/SSG支持 SEO，后台管理用 CSR │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ UI 组件库 │ shadcn/ui + Tailwind CSS             │ 现代化组件，定制灵活            │            
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 状态管理  │ Zustand + React Query                │ 轻量状态管理 + 服务端状态       │            
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 移动端    │ React Native (Expo) 或 Tauri         │ 跨平台方案                      │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 后端框架  │ NestJS + Node.js                     │ 模块化企业级架构                │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 数据库    │ PostgreSQL 16                        │ 用户、项目、剧本等核心数据      │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 缓存      │ Redis 7                              │ 会话、Token 缓存、任务队列      │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 文件存储  │ MinIO (兼容S3)                       │ 部署在内网，节省成本            │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ ComfyUI   │ Python + FastAPI                     │ 直接调用 ComfyUI API            │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 任务队列  │ BullMQ (Redis)                       │ 异步任务处理                    │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 即时通讯  │ Socket.io                            │ 创作进度实时推送                │
  ├───────────┼──────────────────────────────────────┼─────────────────────────────────┤            
  │ 容器化    │ Docker + K8s                         │ 微服务容器化编排                │
  └───────────┴──────────────────────────────────────┴─────────────────────────────────┘            
   
  ---                                                                                               
  核心模块设计                                              
              
  1. 账号系统
                                                                                                    
  ┌─────────────────────────────────────────┐
  │              账号模块                     │                                                     
  ├─────────────────────────────────────────┤               
  │                                         │
  │   ┌─────────┐  ┌─────────┐  ┌─────────┐ │
  │   │手机号   │  │微信OAuth│  │  邮箱   │ │                                                       
  │   │+验证码  │  │扫码登录 │  │+密码    │ │                                                       
  │   └────┬────┘  └────┬────┘  └────┬────┘ │                                                       
  │        │            │            │      │                                                       
  │        └────────────┼────────────┘      │               
  │                     ▼                    │                                                      
  │            ┌───────────────┐            │                                                       
  │            │  统一账号绑定   │            │
  │            │  (UnionID)    │            │                                                       
  │            └───────┬───────┘            │                                                       
  │                    │                    │
  │         ┌──────────┼──────────┐         │                                                       
  │         ▼          ▼          ▼         │                                                       
  │    ┌─────────┐ ┌─────────┐ ┌─────────┐  │
  │    │  User   │ │ WeChat  │ │ Phone   │  │                                                       
  │    │ Profile │ │  Info   │ │  Info   │  │                                                       
  │    └─────────┘ └─────────┘ └─────────┘  │
  │                                         │                                                       
  └─────────────────────────────────────────┘               
                                                                                                    
  表设计：                                                  
  -- 用户主表
  users (    
    id UUID PRIMARY KEY,
    union_id VARCHAR(64) UNIQUE,        -- 统一账号ID
    nickname VARCHAR(64),                                                                           
    avatar_url TEXT,     
    created_at TIMESTAMP,                                                                           
    last_login_at TIMESTAMP                                                                         
  )                        
                                                                                                    
  -- 手机号绑定                                             
  user_phones (
    id UUID,   
    user_id UUID REFERENCES users,
    phone VARCHAR(11) UNIQUE,     
    verified BOOLEAN DEFAULT false,                                                                 
    verification_code VARCHAR(6),  
    code_expires_at TIMESTAMP                                                                       
  )                                                         
   
  -- 微信绑定                                                                                       
  user_wechat (
    id UUID,                                                                                        
    user_id UUID REFERENCES users,                          
    openid VARCHAR(64) UNIQUE,    
    unionid VARCHAR(64),      
    session_key TEXT,
    access_token TEXT,                                                                              
    refresh_token TEXT
  )                                                                                                 
                                                            
  ---
  2. 创作流程模块
                 
  创作流程 Pipeline
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                        
   
    ┌──────────────────────────────────────────────────────────┐                                    
    │  1. 剧本创作  │  2. 智能分集  │  3. 角色配音  │           │
    │   [AI自动]    │   [AI自动]    │   [AI自动]    │           │                                   
    └──────┬───────┘──────┬───────┘──────┬───────┘           │                                      
           │              │              │                    │                                     
           ▼              ▼              ▼                    │                                     
    ┌──────────────────────────────────────────────────────────┐                                    
    │  4. 智能分镜  │  5. 分镜图生成  │  6. 成片合成  │           │                                 
    │   [AI自动]    │   [AI自动]      │   [AI自动]    │           │                                 
    └──────────────────────────────────────────────────────────┘                                    
                                                                                                    
  每个步骤的开关：AI自动生成 ON/OFF                                                                 
  用户可手动干预编辑                                        
                                                                                                    
  表设计：                                                  

  -- 项目表
  projects (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users,                                                                  
    name VARCHAR(128),
    aspect_ratio VARCHAR(10),      -- 16:9, 9:16, 1:1                                               
    style VARCHAR(64),              -- 古风、科幻、现代等   
    image_model VARCHAR(64),        -- SDXL, SD 1.5, etc.                                           
    video_model VARCHAR(64),       -- SVD, Animatediff, etc.                                        
    status VARCHAR(20),            -- creating, published, archived                                 
    created_at TIMESTAMP,                                                                           
    updated_at TIMESTAMP                                                                            
  )                                                         

  -- 剧本表                                                                                         
  scripts (
    id UUID PRIMARY KEY,                                                                            
    project_id UUID REFERENCES projects,                    
    content TEXT,                  -- JSON剧本内容
    word_count INT,
    created_at TIMESTAMP
  )                                                                                                 
  -- 分集表
  episodes (                                                                                        
    id UUID PRIMARY KEY,                                    
    project_id UUID REFERENCES projects,
    episode_number INT,                 
    title VARCHAR(128),
    script_content TEXT,          -- 该集的剧本
    duration_seconds INT,          -- 预估时长 
    status VARCHAR(20),           -- pending, in_progress, completed                                
    order_index INT                                                 
  )                                                                                                 
                                                                                                    
  -- 角色表
  characters (                                                                                      
    id UUID PRIMARY KEY,                                    
    project_id UUID REFERENCES projects,
    name VARCHAR(64),                   
    description TEXT,
    appearance TEXT,              -- 外貌描述(用于生图)
    voice_id VARCHAR(64),         -- 音色选择                                                       
    image_urls TEXT[],            -- 生成的角色图
    created_at TIMESTAMP                                                                            
  )                                                                                                 
   
  -- 分镜表                                                                                         
  storyboards (                                             
    id UUID PRIMARY KEY,
    episode_id UUID REFERENCES episodes,
    scene_number INT,                                                                               
    shot_type VARCHAR(32),         -- 特写、中景、全景
    description TEXT,                                                                               
    image_prompt TEXT,            -- 生图提示词             
    image_url TEXT,                            
    video_url TEXT,               -- 生成的视频片段                                                 
    duration_frames INT,          -- 帧数          
    narration TEXT,               -- 旁白/对话                                                      
    audio_url TEXT,               -- 该片段音频             
    order_index INT,                                                                                
    status VARCHAR(20)                                      
  )                                                                                                 
                                                            
  -- 任务表 (记录ComfyUI任务)
  generation_tasks (                                                                                
    id UUID PRIMARY KEY,
    task_type VARCHAR(32),        -- script, image, video, audio                                    
    project_id UUID,                                            
    episode_id UUID,                                                                                
    storyboard_id UUID,
    comfyui_workflow_id VARCHAR(64),                                                                
    comfyui_job_id VARCHAR(64),                             
    status VARCHAR(20),           -- queued, running, completed, failed
    input_params JSONB,
    output_result JSONB,                                                                            
    created_at TIMESTAMP,
    completed_at TIMESTAMP                                                                          
  )                                                         

  ---
  3. ComfyUI 集成架构
                                                                                                    
  ComfyUI 集成层
  ═══════════════════════════════════════════════════════════                                       
                                                            
    Node.js Backend                      ComfyUI Cluster
    ┌────────────────┐                  ┌────────────────┐
    │  ComfyUI SDK   │◄────────────────►│   Manager Node │                                          
    │  (axios封装)   │   REST/WebSocket  │                │                                         
    └───────┬────────┘                  └───────┬────────┘                                          
            │                                     │                                                 
            │       ┌─────────────────────────────┼───────┐                                         
            │       │              │              │       │                                         
            │       ▼              ▼              ▼       │
            │   ┌───────┐     ┌───────┐     ┌───────┐    │                                          
            └────►│Worker1│     │Worker2│     │Worker3│    │                                        
                  └───────┘     └───────┘     └───────┘    │                                        
                                                                                                    
    预定义 Workflow 模板:                                                                           
    ┌─────────────────────────────────────────────────┐     
    │  1. script_generation.json   (GPT/Claude调用)  │                                              
    │  2. image_generation.json     (文生图)          │                                             
    │  3. video_generation.json     (图生视频)        │                                             
    │  4. voice_generation.json     (TTS)            │                                              
    │  5. video_composition.json    (剪辑合成)        │                                             
    └─────────────────────────────────────────────────┘     
                                                                                                    
  Workflow 示例 - 角色图生成：                                                                      
  {
    "nodes": [                                                                                      
      { "id": "1", "type": "CheckpointLoader", "params": { "ckpt_name": "xxx.safetensors" }},
      { "id": "2", "type": "CLIPTextEncode", "params": { "text": "[character_prompt]" }},    
      { "id": "3", "type": "CLIPTextEncode", "params": { "text": "masterpiece, best quality" }},    
      { "id": "4", "type": "KSampler", "params": { "seed": 42, "steps": 30 }},                      
      { "id": "5", "type": "SaveImage", "params": { "filename_prefix": "character" }}               
    ],                                                                                              
    "edges": [[1,4], [2,4], [3,4], [4,5]]                                                           
  }                                                                                                 
                                                                                                    
  ---                                                       
  4. 项目目录结构

  huimeng/
  ├── apps/                                                                                         
  │   ├── web/                      # Next.js 主站
  │   │   ├── app/                                                                                  
  │   │   │   ├── (auth)/          # 认证相关页面           
  │   │   │   │   ├── login/                                                                        
  │   │   │   │   ├── register/
  │   │   │   │   └── bind-phone/                                                                   
  │   │   │   ├── (dashboard)/     # 用户后台                                                       
  │   │   │   │   ├── layout.tsx
  │   │   │   │   ├── home/                                                                         
  │   │   │   │   ├── projects/                                                                     
  │   │   │   │   ├── create/[id]/  # 创作流程页
  │   │   │   │   ├── materials/                                                                    
  │   │   │   │   └── published/                            
  │   │   │   └── api/              # API 路由                                                      
  │   │   ├── components/
  │   │   │   ├── ui/              # shadcn/ui 组件                                                 
  │   │   │   ├── workflow/        # 创作流程组件                                                   
  │   │   │   └── editor/          # 编辑器组件
  │   │   └── lib/                                                                                  
  │   │                                                     
  │   ├── admin/                   # 管理后台                                                       
  │   │   └── app/                                          
  │   │                                                                                             
  │   └── mobile/                 # 移动端 H5 (可选)
  │                                                                                                 
  ├── packages/                                             
  │   ├── ui/                      # 共享 UI 组件
  │   ├── api-client/              # API 客户端                                                     
  │   ├── types/                   # 共享 TypeScript 类型
  │   └── utils/                   # 工具函数                                                       
  │                                                         
  ├── services/                                                                                     
  │   ├── api/                     # NestJS 主 API 服务     
  │   │   ├── src/                                                                                  
  │   │   │   ├── auth/           # 认证模块
  │   │   │   ├── user/           # 用户模块                                                        
  │   │   │   ├── project/       # 项目模块                 
  │   │   │   ├── workflow/       # 创作流程模块                                                    
  │   │   │   ├── generation/     # AI生成模块
  │   │   │   └── media/          # 媒体文件模块                                                    
  │   │   └── Dockerfile                                                                            
  │   │
  │   ├── comfyui/                # ComfyUI Python 服务                                             
  │   │   ├── src/                                                                                  
  │   │   │   ├── api/           # FastAPI
  │   │   │   ├── workflows/    # Workflow 模板                                                     
  │   │   │   ├── executor/     # 执行器                                                            
  │   │   │   └── manager.py
  │   │   ├── requirements.txt                                                                      
  │   │   └── Dockerfile                                    
  │   │
  │   └── realtime/               # WebSocket 服务 (可选)
  │                                                                                                 
  ├── infra/
  │   ├── docker-compose.yml                                                                        
  │   ├── nginx/                                            
  │   │   └── nginx.conf
  │   ├── postgres/                                                                                 
  │   │   └── init.sql
  │   └── redis/                                                                                    
  │       └── redis.conf                                    
  │
  ├── docs/
  │   ├── api/                    # API 文档
  │   └── architecture/           # 架构文档
  │                                                                                                 
  ├── turbo.json                  # Turborepo 配置
  ├── package.json                                                                                  
  └── README.md                                             

  ---
  API 设计 (RESTful)
                                                                                                    
  ┌─────────────┬───────────────────────────────┬───────────────────┐
  │    方法     │             路径              │       说明        │                               
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ Auth        │                               │                   │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ POST        │ /api/auth/phone/send-code     │ 发送验证码        │                               
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ POST        │ /api/auth/phone/login         │ 手机号登录        │                               
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/auth/wechat/qrcode       │ 获取微信扫码链接  │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/auth/wechat/callback     │ 微信回调          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/auth/bind-phone          │ 绑定手机号        │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ Project     │                               │                   │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ GET         │ /api/projects                 │ 项目列表          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/projects                 │ 创建项目          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ GET         │ /api/projects/:id             │ 项目详情          │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ PUT         │ /api/projects/:id             │ 更新项目          │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ DELETE      │ /api/projects/:id             │ 删除项目          │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ Workflow    │                               │                   │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/projects/:id/script      │ 生成剧本          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ PUT         │ /api/projects/:id/script      │ 更新剧本          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/projects/:id/episodes    │ 智能分集          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/projects/:id/characters  │ 创建角色          │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ POST        │ /api/episodes/:id/storyboards │ 生成分镜          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/storyboards/:id/generate │ 生成单分镜图/视频 │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ POST        │ /api/episodes/:id/finalize    │ 合成成片          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ Media       │                               │                   │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ GET         │ /api/materials                │ 素材列表          │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ POST        │ /api/materials/upload         │ 上传素材          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ DELETE      │ /api/materials/:id            │ 删除素材          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ Publication │                               │                   │
  ├─────────────┼───────────────────────────────┼───────────────────┤
  │ POST        │ /api/projects/:id/publish     │ 发布作品          │
  ├─────────────┼───────────────────────────────┼───────────────────┤                               
  │ GET         │ /api/published                │ 已发布作品        │
  └─────────────┴───────────────────────────────┴───────────────────┘                               
                                                            
  ---
  核心流程时序图
                
  创作流程时序
                                                                                                    
  用户                    Web                  API                  ComfyUI
   │                      │                     │                     │                             
   │  1.创建项目           │                     │                     │                            
   │─────────────────────►│                     │                     │
   │                      │  2. POST /projects   │                     │                            
   │                      │────────────────────►│                     │                             
   │                      │                     │  3. 保存到DB         │
   │                      │                     │────────────────────►│                             
   │                      │                     │                     │                             
   │  4.进入创作页面        │                     │                     │
   │─────────────────────►│                     │                     │                             
   │                      │                     │                     │
   │  5.填写剧本(AI生成)    │                     │                     │                           
   │─────────────────────►│  6. 生成剧本请求      │                     │
   │                      │────────────────────►│                     │                             
   │                      │                     │  7. 调用LLM生成剧本   │
   │                      │                     │────────────────────►│                             
   │                      │                     │◄────────────────────│
   │                      │◄────────────────────│  8. 返回剧本         │                            
   │◄─────────────────────│                     │                     │                             
   │                      │                     │                     │
   │  9. 分集操作          │                     │                     │                            
   │─────────────────────►│ 10. 智能分集请求      │                     │
   │                      │────────────────────►│                     │                             
   │                      │                     │ 11. LLM分集          │
   │                      │                     │────────────────────►│                             
   │                      │◄────────────────────│                      │
   │◄─────────────────────│                     │                      │                            
   │                      │                     │                      │
   │  12.生成角色图         │                     │                      │
   │─────────────────────►│ 13. 生图请求         │                      │                           
   │                      │────────────────────►│                      │
   │                      │                     │ 14. 执行Workflow     │                            
   │                      │                     │────────────────────►│
   │                      │                     │◄────────────────────│                             
   │                      │◄────────────────────│ 15. 返回图片URL       │
   │◄─────────────────────│                     │                      │                            
   │                      │                     │                      │
   │  16.生成各集分镜        │                     │                      │                         
   │═════════════════════════════════════════════════════════════►│
   │                      │                     │                      │                            
   │  17.WebSocket实时进度  │                     │                      │
   │◄─────────────────────────────────────────────────────────────────│                             
   │                      │                     │                      │                            
   │  18.合成成片           │                     │                      │
   │─────────────────────►│ 19. 合成请求          │                      │                          
   │                      │────────────────────►│                      │                            
   │                      │                     │ 20. 视频合成Workflow │
   │                      │                     │────────────────────►│                             
   │                      │                     │                      │
   │  21.发布项目           │                     │                      │                          
   │─────────────────────►│ 22. 发布请求          │                      │
   │                      │────────────────────►│                      │                            
   │                      │                     │ 23. 更新状态          │                           
   │◄─────────────────────│◄────────────────────│                      │
                                                                                                    
  ---                                                       
  ComfyUI Workflow 模板
                                                                                                    
  1. 剧本生成 (LLM)
                                                                                                    
  # comfyui/workflows/script_generation.py                  
  {                                                                                                 
      "name": "剧本生成",
      "nodes": [                                                                                    
          {"id": 1, "type": "OpenAIChat"},                  
          {"id": 2, "type": "JsonOutput"},
      ]                                                                                             
  }
                                                                                                    
  2. 角色图生成                                             

  # comfyui/workflows/character_image.py
  {                                                                                                 
      "name": "角色图生成",
      "nodes": [                                                                                    
          {"id": 1, "type": "CheckpointLoaderSimple"},      
          {"id": 2, "type": "CLIPTextEncode", "inputs": {"text": "{{character_prompt}}"}},
          {"id": 3, "type": "CLIPTextEncode", "inputs": {"text": "masterpiece, best quality,        
  highres"}},                                                                                       
          {"id": 4, "type": "KSampler", "inputs": {"seed": "{{seed}}", "steps": 30}},               
          {"id": 5, "type": "SaveImage", "inputs": {"filename_prefix": "character"}},               
      ]                                                                                             
  }
                                                                                                    
  3. 分镜图生成                                             

  # comfyui/workflows/storyboard_image.py
  {                                                                                                 
      "name": "分镜图生成",
      "nodes": [                                                                                    
          {"id": 1, "type": "CheckpointLoaderSimple"},      
          {"id": 2, "type": "CLIPTextEncode", "inputs": {"text": "{{scene_description}}"}},
          {"id": 3, "type": "ControlNetLoader", "inputs": {"control_net": "{{shot_type}}"}},        
          {"id": 4, "type": "KSampler"},
          {"id": 5, "type": "SaveImage"},                                                           
      ]                                                     
  }                                                                                                 
                                                            
  4. 图生视频

  # comfyui/workflows/text_to_video.py
  {
      "name": "图生视频",
      "nodes": [                                                                                    
          {"id": 1, "type": "LoadImage", "inputs": {"image": "{{storyboard_image}}"}},
          {"id": 2, "type": "SVDLoader"},                                                           
          {"id": 3, "type": "KSampler"},                                                            
          {"id": 4, "type": "SaveVideo", "inputs": {"fps": 24}},
      ]                                                                                             
  }                                                                                                 
   
  ---                                                                                               
  部署架构                                                  

                      ┌─────────────────┐
                      │   Cloudflare    │
                      │   (CDN + WAF)   │                                                           
                      └────────┬────────┘
                               │                                                                    
                      ┌────────▼────────┐                   
                      │   Nginx (LB)    │
                      │  80/443         │                                                           
                      └────────┬────────┘
                               │                                                                    
          ┌────────────────────┼────────────────────┐       
          │                    │                    │                                               
  ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
  │  Next.js SSR  │   │  NestJS API   │   │  WebSocket    │                                         
  │   (3 nodes)   │   │   (5 nodes)   │   │   (2 nodes)   │ 
  └───────────────┘   └───────┬───────┘   └───────────────┘                                         
                               │                                                                    
          ┌────────────────────┼────────────────────┐                                               
          │                    │                    │                                               
  ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐ 
  │  PostgreSQL   │   │     Redis     │   │    MinIO      │                                         
  │   (主从)      │   │   (集群)      │   │   (存储)      │
  └───────────────┘   └───────────────┘   └────────────────┘                                        
                               │                            
                      ┌────────▼────────┐                                                           
                      │  ComfyUI Cluster │                  
                      │  (GPU服务器)     │                                                          
                      │  Worker x N     │                   
                      └─────────────────┘   