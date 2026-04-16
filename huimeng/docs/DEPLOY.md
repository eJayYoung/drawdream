# 绘梦平台部署文档

## 服务地址

| 服务 | 端口 | 地址 |
|------|------|------|
| 前端 Web | 8777 | http://36.139.149.26:8777 |
| 后端 API | 8778 | http://36.139.149.26:8778 |

---

## 部署方式

### 方式一：代码推送自动部署（推荐）

代码 push 到服务器后自动触发构建和重启。

#### 1. 添加远程仓库

```bash
git remote add server root@36.139.149.26:/opt/huimeng/git
```

#### 2. 推送代码

```bash
# 推送到服务器仓库，自动部署
git push server feat/20260416:main
```

> **注意**: 只支持推送到 `main` 分支才触发自动部署。

#### 3. 验证部署

```bash
# 检查前端
curl http://36.139.149.26:8777

# 检查后端 API
curl http://36.139.149.26:8778/api/auth/phone/send-code -X POST -H "Content-Type: application/json" -d '{"phone":"13800138000"}'
```

---

### 方式二：SSH 远程手动部署

#### 部署全部服务

```bash
ssh root@36.139.149.26 "bash /opt/huimeng/scripts/deploy.sh all"
```

#### 部署单个服务

```bash
# 只部署前端
ssh root@36.139.149.26 "bash /opt/huimeng/scripts/deploy.sh web"

# 只部署后端
ssh root@36.139.149.26 "bash /opt/huimeng/scripts/deploy.sh api"
```

---

## 服务器目录结构

```
/opt/huimeng/
├── apps/
│   └── web/                 # Next.js 前端
├── services/
│   └── api/                 # NestJS 后端 API
├── packages/
│   └── shared-types/        # 共享类型定义
├── scripts/
│   └── deploy.sh            # 部署脚本
├── node_modules/            # 依赖 (workspace)
└── web-8777.log             # 前端日志
└── api-8778.log             # 后端日志
```

---

## 部署脚本说明

`/opt/huimeng/scripts/deploy.sh` 会执行以下操作：

### 部署前端 (web)
1. 杀掉旧进程
2. 从 workspace 根目录安装依赖
3. 重新构建 Next.js（嵌入 `NEXT_PUBLIC_API_URL`）
4. 启动服务

### 部署后端 (api)
1. 杀掉旧进程
2. 从 workspace 根目录安装依赖
3. 重新构建 NestJS
4. 启动服务

---

## 日志查看

```bash
# 部署日志
ssh root@36.139.149.26 "tail -f /var/log/huimeng-deploy.log"

# 前端日志
ssh root@36.139.149.26 "tail -f /opt/huimeng/web-8777.log"

# 后端日志
ssh root@36.139.149.26 "tail -f /opt/huimeng/api-8778.log"
```

---

## 故障排除

### 服务无法启动

```bash
# 1. 检查端口占用
ssh root@36.139.149.26 "netstat -tlnp | grep -E '8777|8778'"

# 2. 检查进程
ssh root@36.139.149.26 "ps aux | grep -E 'next|node.*main' | grep -v grep"

# 3. 查看错误日志
ssh root@36.139.149.26 "cat /opt/huimeng/web-8777.log | tail -50"
ssh root@36.139.149.26 "cat /opt/huimeng/api-8778.log | tail -50"
```

### 前端无法访问后端 API

1. 确认环境变量正确：
   ```bash
   ssh root@36.139.149.26 "grep NEXT_PUBLIC /opt/huimeng/web-8777.log"
   ```

2. 检查 CORS 配置：
   ```bash
   ssh root@36.139.149.26 "curl -I http://localhost:8778/api/auth/phone/send-code -X OPTIONS -H 'Origin: http://36.139.149.26:8777'"
   ```
   应返回 `Access-Control-Allow-Origin: http://36.139.149.26:8777`

### 跨域错误

确认 API 启动时传入了正确的 `CORS_ORIGIN`：
```bash
ssh root@36.139.149.26 "ps aux | grep 'node.*main' | grep CORS"
```

---

## 重新初始化服务器

如果需要重新初始化服务器：

```bash
# 1. SSH 登录服务器
ssh root@36.139.149.26

# 2. 重新初始化 git 仓库
cd /opt/huimeng
rm -rf git
mkdir git
cd git
git init --bare

# 3. 创建 post-receive hook
cat > hooks/post-receive << 'EOF'
#!/bin/bash
DEPLOY_DIR="/opt/huimeng"
while read oldrev newrev refname; do
    branch=$(echo "$refname" | sed 's|refs/heads/||')
    if [ "$branch" = "main" ]; then
        cd "$DEPLOY_DIR"
        GIT_WORK_TREE="$DEPLOY_DIR" git checkout -f main
        bash "$DEPLOY_DIR/scripts/deploy.sh" all
    fi
done
EOF
chmod +x hooks/post-receive

# 4. 手动执行首次部署
cd /opt/huimeng
bash scripts/deploy.sh all
```

---

## 环境变量说明

### 前端 (Next.js)
| 变量 | 值 | 说明 |
|------|-----|------|
| `NEXT_PUBLIC_API_URL` | `http://36.139.149.26:8778` | API 地址 |
| `NEXT_PUBLIC_WS_URL` | `ws://36.139.149.26:8778` | WebSocket 地址 |

### 后端 (NestJS)
| 变量 | 值 | 说明 |
|------|-----|------|
| `PORT` | `8778` | 服务端口 |
| `CORS_ORIGIN` | `http://36.139.149.26:8777` | 允许的跨域源 |
| `NODE_ENV` | `production` | 运行环境 |

---

## 数据库和缓存

基础设施通过 Docker 部署：

```bash
# 查看 Docker 容器状态
ssh root@36.139.149.26 "docker ps"
```

| 容器 | 端口 | 说明 |
|------|------|------|
| huimeng-postgres | 5432 | PostgreSQL 数据库 |
| huimeng-redis | 6379 | Redis 缓存 |
| huimeng-minio | 9000/9001 | 文件存储 |

---

## ComfyUI 服务

ComfyUI 部署在 GPU 服务器上，独立运行：

| GPU | 端口 | 地址 |
|-----|------|------|
| GPU 0 | 3000 | http://36.139.149.26:3000 |
| GPU 1 | 3001 | http://36.139.149.26:3001 |
| ... | ... | ... |
| GPU 7 | 3007 | http://36.139.149.26:3007 |

重启 ComfyUI：
```bash
ssh root@36.139.149.26 "bash /data/ComfyUI/restart.sh"
```
