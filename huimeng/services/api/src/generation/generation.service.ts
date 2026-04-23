import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { ComfyUIService } from "../common/comfyui.service";
import { OssService } from "../common/oss.service";
import { WorkflowTemplateService } from "../common/workflow-template.service";
import { GenerationGateway } from "./generation.gateway";
import { ProjectService } from "../project/project.service";

interface PollState {
  userId: string;
  projectId: string;
  taskType: string;
  episodeId?: string;
  storyboardId?: string;
}

/** 提交生成任务的参数 */
export interface QueueTaskParams {
  userId: string;
  projectId: string;
  taskType: string;
  prompt: string;
  inputParams: Record<string, unknown>;
  episodeId?: string;
  storyboardId?: string;
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  // 轮询配置: 60分钟超时 @ 2s 间隔 = 1800 次
  private readonly POLL_INTERVAL_MS = 2000;
  private readonly MAX_POLL_ATTEMPTS = 1800;

  constructor(
    private readonly comfyUIService: ComfyUIService,
    private readonly ossService: OssService,
    private readonly workflowTemplateService: WorkflowTemplateService,
    private readonly generationGateway: GenerationGateway,
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * 根据 aspectRatio 计算 view_width 和 view_height
   * 16:9 → 1280x720
   * 9:16 → 720x1280
   */
  private getViewDimensions(aspectRatio: string): { view_width: string; view_height: string } {
    switch (aspectRatio) {
      case "16:9":
        return { view_width: "1280", view_height: "720" };
      case "9:16":
        return { view_width: "720", view_height: "1280" };
      default:
        // 默认 16:9
        return { view_width: "1280", view_height: "720" };
    }
  }

  /**
   * 根据 taskType 组装 inputParams
   */
  private buildInputParams(taskType: string, prompt: string, inputParams: Record<string, unknown>, view_width: string, view_height: string): object {
    switch (taskType) {
      case "createRolePicture-t2i":
        return {
          prompt,
          ...inputParams,
        };
      default:
        // 默认直接传递 inputParams
        return {
          prompt,
          ...inputParams,
          view_width,
          view_height,
        };
    }
  }

  /**
   * 提交生成任务到队列
   * BFF 模式: 调用远程 /api/render/call 后立即返回 taskId，后台轮询状态
   */
  async queueTask(params: QueueTaskParams): Promise<{ id: string; status: string }> {
    const { userId, projectId, taskType, prompt, inputParams, episodeId, storyboardId } = params;
    // 1. 获取项目信息，用于计算 view_width 和 view_height
    let project: any;
    try {
      project = await this.projectService.findById(projectId);
    } catch (error: any) {
      this.logger.warn(`Failed to get project ${projectId}: ${error.message}, using default dimensions`);
    }

    // 2. 根据 aspectRatio 计算 view dimensions
    const aspectRatio = project?.aspectRatio || "16:9";
    const { view_width, view_height } = this.getViewDimensions(aspectRatio);

    // 3. 根据 taskType 组装 workflow 参数
    const workflow = this.buildInputParams(taskType, prompt, inputParams, view_width, view_height);

    // 4. 提交到 ComfyUI 远程服务
    let comfyTaskId: string;
    try {
      const submitResult = await this.comfyUIService.submitTask(taskType, prompt, workflow);
      comfyTaskId = submitResult.prompt_id;
      this.logger.log(`Task submitted to ComfyUI, taskId: ${comfyTaskId}, projectId: ${projectId}, type: ${taskType}, aspectRatio: ${aspectRatio}`);
    } catch (error: any) {
      this.logger.error(`Failed to submit task: ${error.message}`);
      throw error;
    }

    // 5. 启动后台轮询（不阻塞响应）
    const pollState: PollState = {
      userId,
      projectId,
      taskType,
      episodeId,
      storyboardId,
    };

    this.pollTaskStatus(comfyTaskId, pollState);

    // 6. 立即返回 ComfyUI 的 taskId
    return { id: comfyTaskId, status: "queued" };
  }

  /**
   * 后台轮询任务状态
   * 纯 BFF: 不存储任务状态，只负责轮询和推送 WebSocket
   */
  private async pollTaskStatus(comfyTaskId: string, state: PollState): Promise<void> {
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;

      if (attempts >= this.MAX_POLL_ATTEMPTS) {
        this.generationGateway.notifyTaskUpdate(state.userId, {
          taskId: comfyTaskId,
          status: "failed",
          progress: 100,
          outputs: { error: "Timeout: task execution exceeded 60 minutes" },
        });
        this.generationGateway.notifyProjectProgress(state.projectId, {
          taskId: comfyTaskId,
          episodeId: state.episodeId,
          storyboardId: state.storyboardId,
          status: "failed",
          progress: 100,
          error: "Timeout",
        });
        this.logger.error(`Task ${comfyTaskId} timed out after ${attempts} attempts`);
        return;
      }

      try {
        const result = await this.comfyUIService.getHistory(comfyTaskId);
        this.logger.log(`Task ${comfyTaskId} poll attempt ${attempts}: status=${result.status}`);

        if (result.status === "success") {
          // 获取资产并上传 OSS
          console.log(`[ComfyUI Images] ${JSON.stringify(result.images)}`);
          const assetUrls = await this.fetchAndUploadAssets(result.images || []);
          this.generationGateway.notifyTaskUpdate(state.userId, {
            taskId: comfyTaskId,
            status: "completed",
            progress: 100,
            outputs: { assets: assetUrls },
          });
          this.generationGateway.notifyProjectProgress(state.projectId, {
            taskId: comfyTaskId,
            episodeId: state.episodeId,
            storyboardId: state.storyboardId,
            status: "completed",
            progress: 100,
            outputResult: { assets: assetUrls },
          });
          this.logger.log(`Task ${comfyTaskId} completed with ${assetUrls.length} assets`);

        } else if (result.status === "failed") {
          this.generationGateway.notifyTaskUpdate(state.userId, {
            taskId: comfyTaskId,
            status: "failed",
            progress: 100,
            outputs: { error: result.error },
          });
          this.generationGateway.notifyProjectProgress(state.projectId, {
            taskId: comfyTaskId,
            episodeId: state.episodeId,
            storyboardId: state.storyboardId,
            status: "failed",
            progress: 100,
            error: result.error,
          });
          this.logger.error(`Task ${comfyTaskId} failed: ${result.error}`);

        } else {
          // pending/running - 继续轮询
          const progress = Math.min(90, Math.floor((attempts / this.MAX_POLL_ATTEMPTS) * 90));
          this.generationGateway.notifyTaskUpdate(state.userId, {
            taskId: comfyTaskId,
            status: "running",
            progress,
          });
          this.generationGateway.notifyProjectProgress(state.projectId, {
            taskId: comfyTaskId,
            episodeId: state.episodeId,
            storyboardId: state.storyboardId,
            status: "running",
            progress,
          });
          setTimeout(poll, this.POLL_INTERVAL_MS);
        }
      } catch (error: any) {
        this.logger.error(`Poll error for task ${comfyTaskId}: ${error.message}`);
        // 网络错误继续重试
        setTimeout(poll, this.POLL_INTERVAL_MS);
      }
    };

    // 启动首次轮询
    poll();
  }

  /**
   * 获取资产文件并上传到 OSS
   */
  private async fetchAndUploadAssets(assetIds: string[]): Promise<string[]> {
    const urls: string[] = [];

    for (const assetId of assetIds) {
      try {
        // 从 ComfyUI 服务器获取图片二进制
        const assetResult = await this.fetchAssetFile(assetId);

        if (assetResult.buffer) {
          // 上传到 OSS
          const filename = assetId.split("/").pop() || assetId;
          const ossUrl = await this.ossService.uploadBuffer(
            assetResult.buffer,
            filename,
            assetResult.contentType || "image/png",
          );
          urls.push(ossUrl);
          
          this.logger.log(`Asset ${assetId} uploaded to OSS: ${ossUrl}`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to fetch/upload asset ${assetId}: ${error.message}`);
      }
    }

    return urls;
  }

  /**
   * 获取 ComfyUI 资产文件
   */
  private async fetchAssetFile(assetId: string): Promise<{ buffer?: Buffer; contentType?: string; error?: string }> {
    try {
      const host = this.configService.get<string>("COMFYUI_HOST", "36.138.102.196");
      const port = this.configService.get<string>("COMFYUI_PORT", "8081");
      const baseUrl = `http://${host}:${port}`;
      // 打印资产Id和资产图片地址
      console.log(`[Asset ID] ${assetId}`);
      console.log(`[Asset URL] ${baseUrl}/api/asset/${assetId}/file`);
      const response = await axios.get(`${baseUrl}/api/asset/${assetId}/file`, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const contentType = (response.headers["content-type"] as string) || "image/png";
      return {
        buffer: Buffer.from(response.data),
        contentType,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get asset file: ${error.message}`);
      return { error: error.message };
    }
  }

  // ============ 查询接口 - 代理到 ComfyUI ==========

  /**
   * 获取任务状态
   * 代理到 ComfyUI 的 /api/render/query 接口
   */
  async getTaskStatus(taskId: string): Promise<{ taskId: string; status: string; progress: number; outputs?: Record<string, unknown> } | null> {
    try {
      const result = await this.comfyUIService.getHistory(taskId);
      return {
        taskId,
        status: result.status,
        progress: result.status === "success" ? 100 : result.status === "failed" ? 100 : 0,
        outputs: result.outputs,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get task status: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取项目下的任务列表
   * 注意: ComfyUI 不支持按项目查询，这里返回空数组
   * 前端应依赖 WebSocket 推送来获取任务更新
   */
  async getProjectTasks(projectId: string): Promise<{ taskId: string; status: string; createdAt: string }[]> {
    // ComfyUI 没有项目维度的查询接口，返回空
    // 任务状态通过 WebSocket 实时推送
    return [];
  }

  /**
   * 处理 ComfyUI 回调 (Webhook)
   */
  async handleComfyUICallback(
    jobId: string,
    status: "success" | "failed",
    outputs?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    // 回调处理逻辑 - 如果 ComfyUI 支持 webhook 回调可以在这里处理
    this.logger.log(`Received ComfyUI callback for job ${jobId}, status: ${status}`);
  }
}
