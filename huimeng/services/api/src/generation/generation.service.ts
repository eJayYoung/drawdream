import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { ComfyUIService } from "../common/comfyui.service";
import { OssService } from "../common/oss.service";
import { GenerationGateway } from "./generation.gateway";
import { ProjectService } from "../project/project.service";

interface PollState {
  userId: string;
  projectId: string;
  taskType: string;
  episodeId?: string;
  storyboardId?: string;
}

interface InParam {
  prompt: string;
  resolution?: string;
  image?: string;
}

interface ExecuteWorkflowParams {
  userId: string;
  projectId: string;
  taskType: string;
  prompt: string;
  inParam?: string; // JSON.stringify({ prompt, resolution?, image? })
  episodeId?: string;
  storyboardId?: string;
  referenceAssetId?: string;
  referenceAssetContent?: string;
  requestContext?: Record<string, any>;
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
    private readonly generationGateway: GenerationGateway,
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * 根据 aspectRatio 计算 resolution
   * 16:9 → 1280x720
   * 9:16 → 720x1280
   */
  getResolution(aspectRatio: string): string {
    switch (aspectRatio) {
      case "16:9":
        return "1280x720 (16:9) (横屏)";
      case "9:16":
        return "720x1280 (9:16) (竖屏)";
      default:
        return "1280x720 (16:9) (横屏)";
    }
  }

  /**
   * 执行工作流
   * 1. 解析 inParam JSON 字符串
   * 2. 若 inParam 无 resolution，根据 project 的 aspectRatio 计算
   * 3. 调用 comfyUIService.submitWorkflow
   * 4. 启动后台轮询
   * 5. 返回 taskId
   */
  async executeWorkflow(params: ExecuteWorkflowParams): Promise<{ taskId: string; status: string }> {
    const { userId, projectId, taskType, prompt, inParam: inParamStr, episodeId, storyboardId, referenceAssetId, referenceAssetContent, requestContext } = params;

    // 1. 解析 inParam
    let inParam: InParam;
    try {
      inParam = JSON.parse(inParamStr || '{}');
    } catch (error: any) {
      throw new Error(`Invalid inParam JSON: ${error.message}`);
    }

    // 2. 获取项目信息，用于计算 resolution
    let project: any;
    try {
      project = await this.projectService.findById(projectId);
    } catch (error: any) {
      this.logger.warn(`Failed to get project ${projectId}: ${error.message}, using default resolution`);
    }

    // 3. 若 inParam 无 resolution，根据 aspectRatio 计算
    const aspectRatio = project?.aspectRatio || "16:9";
    const resolution = inParam.resolution || this.getResolution(aspectRatio);

    // 4. 重新组装 inParam（补充 resolution，image 优先用 referenceAssetContent）
    const finalInParam: InParam = {
      prompt: inParam.prompt || prompt,
      resolution,
    };

    const finalInParamStr = JSON.stringify(finalInParam);

    // 5. 提交到 ComfyUI 远程服务
    let comfyTaskId: string;
    try {
      const submitResult = await this.comfyUIService.submitWorkflow(taskType, prompt, finalInParamStr, requestContext);
      comfyTaskId = submitResult.prompt_id;
      this.logger.log(`Task submitted to ComfyUI, taskId: ${comfyTaskId}, projectId: ${projectId}, type: ${taskType}, resolution: ${resolution}`);
    } catch (error: any) {
      this.logger.error(`Failed to submit task: ${error.message}`);
      throw error;
    }

    // 6. 启动后台轮询（不阻塞响应）
    const pollState: PollState = {
      userId,
      projectId,
      taskType,
      episodeId,
      storyboardId,
    };

    this.pollTaskStatus(comfyTaskId, taskType, pollState);

    // 7. 立即返回 ComfyUI 的 taskId
    return { taskId: comfyTaskId, status: "queued" };
  }

  /**
   * 后台轮询任务状态
   * 不存储任务状态，只负责轮询和推送 WebSocket
   */
  private async pollTaskStatus(comfyTaskId: string, taskType: string, state: PollState): Promise<void> {
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
        const result = await this.comfyUIService.queryWorkflowStatus(taskType, comfyTaskId);
        this.logger.log(`Task ${comfyTaskId} poll attempt ${attempts}: status=${result.status}`);

        if (result.status === "success") {
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
        const assetResult = await this.fetchAssetFile(assetId);

        if (assetResult.buffer) {
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

  // ============ 查询接口 ==========

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<{ taskId: string; status: string; progress: number; outputs?: Record<string, unknown> } | null> {
    try {
      // 注意: 查询接口需要 taskType，这里暂用空字符串，实际调用时需传入
      const result = await this.comfyUIService.queryWorkflowStatus('', taskId);
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
   * ComfyUI 不支持按项目查询，返回空数组
   */
  async getProjectTasks(projectId: string): Promise<{ taskId: string; status: string; createdAt: string }[]> {
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
    this.logger.log(`Received ComfyUI callback for job ${jobId}, status: ${status}`);
  }
}
