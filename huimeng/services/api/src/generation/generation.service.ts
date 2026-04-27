import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { ComfyUIService } from "../common/comfyui.service";
import { OssService } from "../common/oss.service";
import { GenerationGateway } from "./generation.gateway";
import { ProjectService } from "../project/project.service";
import { MaterialsService } from "../materials/materials.service";
import { StoryboardsService } from "../storyboards/storyboards.service";
import { CharactersService } from "../characters/characters.service";
import { ScenesService } from "../scenes/scenes.service";

interface PollState {
  userId: string;
  projectId: string;
  taskType: string;
  step?: string;
  characterId?: string;
  sceneId?: string;
  episodeId?: string;
  storyboardId?: string;
  requestContext?: Record<string, any>;
}

interface InParam {
  prompt?: string;
  resolution?: string;
  image?: string;
  customJson?: string;
}

interface ExecuteWorkflowParams {
  userId: string;
  projectId: string;
  taskType: string;
  step?: string;
  characterId?: string;
  sceneId?: string;
  prompt: string;
  inParam?: string; // JSON.stringify({ prompt, resolution?, image? })
  episodeId?: string;
  storyboardId?: string;
  referenceAssetIds?: string[]; // 参考图assetId数组
  referenceAssetContent?: string;
  requestContext?: Record<string, any>;
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  // 轮询配置: 60分钟超时 @ 2s 间隔 = 1800 次
  private readonly POLL_INTERVAL_MS = 2000;
  private readonly MAX_POLL_ATTEMPTS = 1800;

  // Cache for uploaded assets to avoid duplicate uploads
  private readonly uploadedAssetsCache = new Map<string, { assetUrls: string[]; comfyAssetIds: string[] }>();

  constructor(
    private readonly comfyUIService: ComfyUIService,
    private readonly ossService: OssService,
    private readonly generationGateway: GenerationGateway,
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
    private readonly materialsService: MaterialsService,
    private readonly storyboardsService: StoryboardsService,
    private readonly charactersService: CharactersService,
    private readonly scenesService: ScenesService,
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
   * 根据 taskType 和参考图数量决定 ComfyUI api
   * taskType 是内部资产绑定标识，api 是 ComfyUI 工作流名
   */
  private getComfyApi(taskType: string, refCount: number): string {
    if (refCount === 0) {
      return "createScenePicture-t2i";
    }
    return "createRolePicture-i2i";
  }

  /**
   * 执行工作流
   * 1. 解析 inParam JSON 字符串
   * 2. 若 inParam 无 resolution，根据 project 的 aspectRatio 计算
   * 3. 根据参考图数量选择调用方式:
   *    - 0张参考图: 调用 ComfyUI 文生图工作流
   *    - 1张参考图: 调用 render-ai-engine 图生图 API
   *    - 2+张参考图: 调用 ComfyUI 多参考图工作流
   * 4. 启动后台轮询
   * 5. 返回 taskId
   */
  async executeWorkflow(params: ExecuteWorkflowParams): Promise<{ taskId: string; status: string }> {
    const { userId, projectId, taskType, step, characterId, sceneId, prompt, inParam: inParamStr, episodeId, storyboardId, referenceAssetIds, referenceAssetContent, requestContext } = params;

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

    // 4. 重新组装 inParam（只放 resolution，不放 prompt）
    const finalInParam: InParam = {
      resolution,
    };

    const finalInParamStr = JSON.stringify(finalInParam);

    // 5. 根据参考图数量选择调用方式
    const refCount = referenceAssetIds?.length || 0;

    // 1张参考图 → 调用 render-ai-engine
    if (refCount === 1) {
      return this.callRenderAIEngine({
        userId,
        projectId,
        taskType,
        prompt,
        resolution,
        referenceAssetId: referenceAssetIds![0],
        step,
        characterId,
        sceneId,
        episodeId,
        storyboardId,
        requestContext,
      });
    }

    // 0张或2+张参考图 → 调用 ComfyUI
    const comfyApi = this.getComfyApi(taskType, refCount);
    let comfyTaskId: string;
    try {
      const submitResult = await this.comfyUIService.submitWorkflow(comfyApi, prompt, finalInParamStr, requestContext);
      comfyTaskId = submitResult.prompt_id;
      this.logger.log(`Task submitted to ComfyUI, taskId: ${comfyTaskId}, projectId: ${projectId}, api: ${comfyApi}, type: ${taskType}, resolution: ${resolution}, refCount: ${refCount}`);
    } catch (error: any) {
      this.logger.error(`Failed to submit task: ${error.message}`);
      throw error;
    }

    // 6. 启动后台轮询（不阻塞响应）
    const pollState: PollState = {
      userId,
      projectId,
      taskType,
      step,
      characterId,
      sceneId,
      episodeId,
      storyboardId,
      requestContext,
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

        // Update storyboard status to failed if this is a storyboard task
        if (state.storyboardId) {
          await this.storyboardsService.update(state.storyboardId, {
            status: 'failed',
          });
        }
        return;
      }

      try {
        const result = await this.comfyUIService.queryWorkflowStatus(taskType, comfyTaskId);
        this.logger.log(`Task ${comfyTaskId} poll attempt ${attempts}: status=${result.status}`);

        if (result.status === "success") {
          console.log(`[ComfyUI Images] ${JSON.stringify(result.images)}`);
          const images = result.images || [];
          const assetUrls = await this.fetchAndUploadAssets(images);

          // Cache uploaded assets
          this.uploadedAssetsCache.set(comfyTaskId, { assetUrls, comfyAssetIds: images });

          // 保存到素材库
          if (assetUrls.length > 0) {
            // 根据 step 确定 workflowType 和 workflowId
            let workflowType: string = state.step || 'unknown';
            let workflowId: string = '';
            if (state.step === 'characters' && state.characterId) {
              workflowId = state.characterId;
            } else if (state.step === 'scenes' && state.sceneId) {
              workflowId = state.sceneId;
            } else if (state.step === 'storyboard' && state.storyboardId) {
              workflowId = state.storyboardId;
            }

            const materials = images.map((assetId: string, index: number) => ({
              assetId,
              originFileName: assetId.split("/").pop() || assetId,
              url: assetUrls[index] || '',
              fileType: 'image' as const,
              source: 'workflow' as const,
              size: 0,
              projectId: state.projectId,
              workflowType: workflowType as any,
              workflowId,
              metadata: {
                comfyTaskId,
                taskType,
                step: state.step,
                characterId: state.characterId,
                sceneId: state.sceneId,
                episodeId: state.episodeId,
                storyboardId: state.storyboardId,
              },
            }));
            await this.materialsService.batchCreate(state.userId, materials);
            this.logger.log(`Saved ${materials.length} materials to library`);
          }

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
            outputResult: { assets: assetUrls, comfyAssetIds: images },
          });
          this.logger.log(`Task ${comfyTaskId} completed with ${assetUrls.length} assets`);

          // Directly update storyboard in database if this is a storyboard task
          if (state.storyboardId) {
            await this.storyboardsService.update(state.storyboardId, {
              imageUrl: assetUrls[0] || '',
              comfyAssetId: images[0] || '',
              allImageUrls: assetUrls,
              allComfyAssetIds: images,
              status: 'completed',
              generatedAt: new Date().toISOString(),
            } as any);
          }

          // Directly update character assets in database if this is a character task
          if (state.characterId && images.length > 0) {
            const character = await this.charactersService.findOne(state.characterId);
            if (character) {
              const existingAssets = character.assets || [];
              const newAsset = {
                id: `asset-${Date.now()}`,
                type: 'image',
                url: assetUrls[0] || '',
                prompt: state.requestContext?.prompt || '',
                tags: [],
                angle: '',
                shotSize: '',
                createdAt: new Date().toISOString(),
                comfyAssetId: images[0] || '',
              };
              await this.charactersService.update(state.characterId, {
                assets: [...existingAssets, newAsset],
              } as any);
              this.logger.log(`Added new asset to character ${state.characterId}`);
            }
          }

          // Directly update scene assets in database if this is a scene task
          if (state.sceneId && images.length > 0) {
            const scene = await this.scenesService.findOne(state.sceneId);
            if (scene) {
              const existingAssets = scene.assets || [];
              const newAsset = {
                id: `asset-${Date.now()}`,
                type: 'image',
                url: assetUrls[0] || '',
                prompt: state.requestContext?.prompt || '',
                tags: [],
                createdAt: new Date().toISOString(),
                comfyAssetId: images[0] || '',
              };
              await this.scenesService.update(state.sceneId, {
                assets: [...existingAssets, newAsset],
                status: 'completed',
              } as any);
              this.logger.log(`Added new asset to scene ${state.sceneId}`);
            }
          }

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

          // Update storyboard status to failed if this is a storyboard task
          if (state.storyboardId) {
            await this.storyboardsService.update(state.storyboardId, {
              status: 'failed',
            });
          }

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
  async fetchAssetFile(assetId: string): Promise<{ buffer?: Buffer; contentType?: string; error?: string }> {
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

  /**
   * 批量获取 ComfyUI 资产文件 (并行)
   */
  async fetchBatchAssetFiles(assetIds: string[]): Promise<Record<string, { dataUrl?: string; error?: string }>> {
    const results: Record<string, { dataUrl?: string; error?: string }> = {};

    // 并行获取所有资产
    const promises = assetIds.map(async (assetId) => {
      const result = await this.fetchAssetFile(assetId);
      if (result.buffer && result.contentType) {
        const base64 = result.buffer.toString('base64');
        results[assetId] = { dataUrl: `data:${result.contentType};base64,${base64}` };
      } else {
        results[assetId] = { error: result.error || 'Asset not found' };
      }
    });

    await Promise.all(promises);
    return results;
  }

  // ============ 查询接口 ==========

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string, taskType?: string): Promise<{ taskId: string; status: string; progress: number; outputs?: Record<string, unknown> } | null> {
    try {
      const result = await this.comfyUIService.queryWorkflowStatus(taskType || '', taskId);
      // Map internal status to frontend-expected status
      const status = result.status === 'success' ? 'completed' : result.status;

      // If successful, get assets from cache or upload to OSS
      let outputs = result.outputs;
      if (result.status === 'success' && result.images && result.images.length > 0) {
        const cached = this.uploadedAssetsCache.get(taskId);
        if (cached) {
          // Use cached upload results
          outputs = { ...result.outputs, assets: cached.assetUrls, comfyAssetIds: cached.comfyAssetIds };
        } else {
          // Upload assets to OSS
          const assetUrls = await this.fetchAndUploadAssets(result.images);
          this.uploadedAssetsCache.set(taskId, { assetUrls, comfyAssetIds: result.images });
          outputs = { ...result.outputs, assets: assetUrls, comfyAssetIds: result.images };
        }
      }

      return {
        taskId,
        status,
        progress: result.status === 'success' ? 100 : result.status === 'failed' ? 100 : 0,
        outputs,
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
   * 智能分镜 - 使用资产引用生成图片
   * 根据参考图数量选择不同的workflow:
   * - 0张图: createScenePicture-t2i
   * - 1张图: createRolePicture-t2i
   * - 2+张图: createStoryBoard，动态生成工作流json
   */
  async submitSmartStoryboard(params: {
    userId: string;
    projectId: string;
    taskType: string;
    prompt: string;
    inParam: string;
    requestContext?: Record<string, any>;
    episodeId?: string;
    storyboardId?: string;
  }): Promise<{ taskId: string; status: string }> {
    const { userId, projectId, taskType, prompt, inParam: inParamStr, requestContext, episodeId, storyboardId } = params;

    // 获取项目信息
    let project: any;
    try {
      project = await this.projectService.findById(projectId);
    } catch (error: any) {
      this.logger.warn(`Failed to get project ${projectId}: ${error.message}`);
    }

    // 解析 inParam
    let inParam: InParam;
    try {
      inParam = JSON.parse(inParamStr || '{}');
    } catch {
      inParam = {};
    }

    // 计算 resolution
    const aspectRatio = project?.aspectRatio || "16:9";
    const resolution = inParam.resolution || this.getResolution(aspectRatio);

    // 从 requestContext 获取图片数量
    const assetIdKeys = Object.keys(requestContext || {}).filter(k => k.startsWith('imageId-'));
    const imageCount = assetIdKeys.length;

    // 根据参考图数量选择 ComfyUI API
    let comfyApi: string;
    let finalInParamStr: string;

    if (imageCount === 0) {
      // 0张图: 文生图
      comfyApi = "createScenePicture-t2i";
      finalInParamStr = JSON.stringify({ resolution });
    } else if (imageCount === 1) {
      // 1张图: 单参考图生图
      // header.requestContext 携带实际 asset ID，inParam 中 imageId 为空字符串
      comfyApi = "createRolePicture-i2i";
      finalInParamStr = JSON.stringify({ "imageId-1": "", resolution });
    } else {
      // 2+张图: 多参考图，动态生成workflow JSON
      comfyApi = "createStoryBoard";
      const workflowJson = this.generateMultiRefWorkflow(imageCount, resolution, prompt);
      finalInParamStr = JSON.stringify({ customJson: JSON.stringify(workflowJson) });
    }

    // 提交到 ComfyUI
    let comfyTaskId: string;
    try {
      const submitResult = await this.comfyUIService.submitWorkflow(comfyApi, prompt, finalInParamStr, requestContext);
      comfyTaskId = submitResult.prompt_id;
      this.logger.log(`Smart storyboard submitted, taskId: ${comfyTaskId}, imageCount: ${imageCount}, comfyApi: ${comfyApi}`);
    } catch (error: any) {
      this.logger.error(`Failed to submit smart storyboard: ${error.message}`);
      throw error;
    }

    // 启动后台轮询
    const pollState: PollState = {
      userId,
      projectId,
      taskType,
      episodeId,
      storyboardId,
      requestContext,
    };

    this.pollTaskStatus(comfyTaskId, taskType, pollState);

    return { taskId: comfyTaskId, status: "queued" };
  }

  /**
   * 固定工作流 JSON（2-10张参考图）
   * 基于用户验证过的工作流结构
   */
  private generateMultiRefWorkflow(imageCount: number, resolution: string, prompt: string): Record<string, any> {
    // 2张图的工作流
    const workflow2Images = {
      "6": { inputs: { text: "${prompt}", clip: ["88", 0] }, class_type: "CLIPTextEncode", _meta: { title: "提示词" } },
      "8": { inputs: { samples: ["13", 0], vae: ["10", 0] }, class_type: "VAEDecode", _meta: { title: "VAE解码" } },
      "9": { inputs: { filename_prefix: "Flux2", images: ["8", 0] }, class_type: "SaveImage", _meta: { title: "保存图像" } },
      "10": { inputs: { vae_name: "flux2-vae.safetensors" }, class_type: "VAELoader", _meta: { title: "加载VAE" } },
      "13": { inputs: { noise: ["25", 0], guider: ["22", 0], sampler: ["16", 0], sigmas: ["48", 0], latent_image: ["47", 0] }, class_type: "SamplerCustomAdvanced", _meta: { title: "自定义采样器（高级）" } },
      "16": { inputs: { sampler_name: "euler" }, class_type: "KSamplerSelect", _meta: { title: "K采样器选择" } },
      "22": { inputs: { model: ["83", 0], conditioning: ["39", 0] }, class_type: "BasicGuider", _meta: { title: "基本引导器" } },
      "25": { inputs: { noise_seed: 30496495720250 }, class_type: "RandomNoise", _meta: { title: "随机噪波" } },
      "26": { inputs: { guidance: 4, conditioning: ["6", 0] }, class_type: "FluxGuidance", _meta: { title: "Flux引导" } },
      "39": { inputs: { conditioning: ["43", 0], latent: ["40", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "40": { inputs: { pixels: ["90", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "42": { inputs: { image: "${imageId-1}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "43": { inputs: { conditioning: ["26", 0], latent: ["44", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "44": { inputs: { pixels: ["93", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "46": { inputs: { image: "${imageId-2}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "47": { inputs: { width: ["94", 0], height: ["94", 1], batch_size: 1 }, class_type: "EmptyFlux2LatentImage", _meta: { title: "空Latent图像（Flux2）" } },
      "48": { inputs: { steps: 8, width: ["94", 0], height: ["94", 1] }, class_type: "Flux2Scheduler", _meta: { title: "Flux2调度器" } },
      "83": { inputs: { unet_name: "flux-2-klein-9b.safetensors", weight_dtype: "default" }, class_type: "UNETLoader", _meta: { title: "UNet加载器" } },
      "88": { inputs: { clip_name: "qwen_3_8b_fp8mixed.safetensors", type: "flux2", device: "default" }, class_type: "CLIPLoader", _meta: { title: "加载CLIP" } },
      "90": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["42", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "93": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["46", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "94": { inputs: { use_custom_resolution: false, resolution, custom_width: 1024, custom_height: 1024 }, class_type: "TTResolutionSelector", _meta: { title: "TT分辨率选择器" } },
    };

    // 3张图的工作流
    const workflow3Images = {
      "6": { inputs: { text: "${prompt}", clip: ["88", 0] }, class_type: "CLIPTextEncode", _meta: { title: "提示词" } },
      "8": { inputs: { samples: ["13", 0], vae: ["10", 0] }, class_type: "VAEDecode", _meta: { title: "VAE解码" } },
      "9": { inputs: { filename_prefix: "Flux2", images: ["8", 0] }, class_type: "SaveImage", _meta: { title: "保存图像" } },
      "10": { inputs: { vae_name: "flux2-vae.safetensors" }, class_type: "VAELoader", _meta: { title: "加载VAE" } },
      "13": { inputs: { noise: ["25", 0], guider: ["22", 0], sampler: ["16", 0], sigmas: ["48", 0], latent_image: ["47", 0] }, class_type: "SamplerCustomAdvanced", _meta: { title: "自定义采样器（高级）" } },
      "16": { inputs: { sampler_name: "euler" }, class_type: "KSamplerSelect", _meta: { title: "K采样器选择" } },
      "22": { inputs: { model: ["83", 0], conditioning: ["73", 0] }, class_type: "BasicGuider", _meta: { title: "基本引导器" } },
      "25": { inputs: { noise_seed: 500952218864318 }, class_type: "RandomNoise", _meta: { title: "随机噪波" } },
      "26": { inputs: { guidance: 4, conditioning: ["6", 0] }, class_type: "FluxGuidance", _meta: { title: "Flux引导" } },
      "39": { inputs: { conditioning: ["43", 0], latent: ["40", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "40": { inputs: { pixels: ["90", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "42": { inputs: { image: "${imageId-1}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "43": { inputs: { conditioning: ["26", 0], latent: ["44", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "44": { inputs: { pixels: ["93", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "46": { inputs: { image: "${imageId-2}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "47": { inputs: { width: ["94", 0], height: ["94", 1], batch_size: 1 }, class_type: "EmptyFlux2LatentImage", _meta: { title: "空Latent图像（Flux2）" } },
      "48": { inputs: { steps: 8, width: ["94", 0], height: ["94", 1] }, class_type: "Flux2Scheduler", _meta: { title: "Flux2调度器" } },
      "70": { inputs: { pixels: ["91", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "71": { inputs: { image: "${imageId-3}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "73": { inputs: { conditioning: ["39", 0], latent: ["70", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "83": { inputs: { unet_name: "flux-2-klein-9b.safetensors", weight_dtype: "default" }, class_type: "UNETLoader", _meta: { title: "UNet加载器" } },
      "88": { inputs: { clip_name: "qwen_3_8b_fp8mixed.safetensors", type: "flux2", device: "default" }, class_type: "CLIPLoader", _meta: { title: "加载CLIP" } },
      "90": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["42", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "91": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["71", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "93": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["46", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "94": { inputs: { use_custom_resolution: false, resolution, custom_width: 1024, custom_height: 1024 }, class_type: "TTResolutionSelector", _meta: { title: "TT分辨率选择器" } },
    };

    // 4张图的工作流
    const workflow4Images = {
      "6": { inputs: { text: "${prompt}", clip: ["88", 0] }, class_type: "CLIPTextEncode", _meta: { title: "提示词" } },
      "8": { inputs: { samples: ["13", 0], vae: ["10", 0] }, class_type: "VAEDecode", _meta: { title: "VAE解码" } },
      "9": { inputs: { filename_prefix: "Flux2", images: ["8", 0] }, class_type: "SaveImage", _meta: { title: "保存图像" } },
      "10": { inputs: { vae_name: "flux2-vae.safetensors" }, class_type: "VAELoader", _meta: { title: "加载VAE" } },
      "13": { inputs: { noise: ["25", 0], guider: ["22", 0], sampler: ["16", 0], sigmas: ["48", 0], latent_image: ["47", 0] }, class_type: "SamplerCustomAdvanced", _meta: { title: "自定义采样器（高级）" } },
      "16": { inputs: { sampler_name: "euler" }, class_type: "KSamplerSelect", _meta: { title: "K采样器选择" } },
      "22": { inputs: { model: ["83", 0], conditioning: ["112", 0] }, class_type: "BasicGuider", _meta: { title: "基本引导器" } },
      "25": { inputs: { noise_seed: 465790480681848 }, class_type: "RandomNoise", _meta: { title: "随机噪波" } },
      "26": { inputs: { guidance: 4, conditioning: ["6", 0] }, class_type: "FluxGuidance", _meta: { title: "Flux引导" } },
      "39": { inputs: { conditioning: ["43", 0], latent: ["40", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "40": { inputs: { pixels: ["90", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "42": { inputs: { image: "${imageId-1}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "43": { inputs: { conditioning: ["26", 0], latent: ["44", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "44": { inputs: { pixels: ["93", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "46": { inputs: { image: "${imageId-2}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "47": { inputs: { width: ["94", 0], height: ["94", 1], batch_size: 1 }, class_type: "EmptyFlux2LatentImage", _meta: { title: "空Latent图像（Flux2）" } },
      "48": { inputs: { steps: 8, width: ["94", 0], height: ["94", 1] }, class_type: "Flux2Scheduler", _meta: { title: "Flux2调度器" } },
      "70": { inputs: { pixels: ["91", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "71": { inputs: { image: "${imageId-3}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "73": { inputs: { conditioning: ["39", 0], latent: ["70", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "83": { inputs: { unet_name: "flux-2-klein-9b.safetensors", weight_dtype: "default" }, class_type: "UNETLoader", _meta: { title: "UNet加载器" } },
      "88": { inputs: { clip_name: "qwen_3_8b_fp8mixed.safetensors", type: "flux2", device: "default" }, class_type: "CLIPLoader", _meta: { title: "加载CLIP" } },
      "90": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["42", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "91": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["71", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "93": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["46", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "94": { inputs: { use_custom_resolution: false, resolution, custom_width: 1024, custom_height: 1024 }, class_type: "TTResolutionSelector", _meta: { title: "TT分辨率选择器" } },
      "109": { inputs: { image: "${imageId-4}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "110": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["109", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "111": { inputs: { pixels: ["110", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "112": { inputs: { conditioning: ["73", 0], latent: ["111", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
    };

    // 5张图的工作流
    const workflow5Images = {
      "6": { inputs: { text: "${prompt}", clip: ["88", 0] }, class_type: "CLIPTextEncode", _meta: { title: "提示词" } },
      "8": { inputs: { samples: ["13", 0], vae: ["10", 0] }, class_type: "VAEDecode", _meta: { title: "VAE解码" } },
      "9": { inputs: { filename_prefix: "Flux2", images: ["8", 0] }, class_type: "SaveImage", _meta: { title: "保存图像" } },
      "10": { inputs: { vae_name: "flux2-vae.safetensors" }, class_type: "VAELoader", _meta: { title: "加载VAE" } },
      "13": { inputs: { noise: ["25", 0], guider: ["22", 0], sampler: ["16", 0], sigmas: ["48", 0], latent_image: ["47", 0] }, class_type: "SamplerCustomAdvanced", _meta: { title: "自定义采样器（高级）" } },
      "16": { inputs: { sampler_name: "euler" }, class_type: "KSamplerSelect", _meta: { title: "K采样器选择" } },
      "22": { inputs: { model: ["83", 0], conditioning: ["116", 0] }, class_type: "BasicGuider", _meta: { title: "基本引导器" } },
      "25": { inputs: { noise_seed: 868309906129852 }, class_type: "RandomNoise", _meta: { title: "随机噪波" } },
      "26": { inputs: { guidance: 4, conditioning: ["6", 0] }, class_type: "FluxGuidance", _meta: { title: "Flux引导" } },
      "39": { inputs: { conditioning: ["43", 0], latent: ["40", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "40": { inputs: { pixels: ["90", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "42": { inputs: { image: "${imageId-1}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "43": { inputs: { conditioning: ["26", 0], latent: ["44", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "44": { inputs: { pixels: ["93", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "46": { inputs: { image: "${imageId-2}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "47": { inputs: { width: ["94", 0], height: ["94", 1], batch_size: 1 }, class_type: "EmptyFlux2LatentImage", _meta: { title: "空Latent图像（Flux2）" } },
      "48": { inputs: { steps: 8, width: ["94", 0], height: ["94", 1] }, class_type: "Flux2Scheduler", _meta: { title: "Flux2调度器" } },
      "70": { inputs: { pixels: ["91", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "71": { inputs: { image: "${imageId-3}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "73": { inputs: { conditioning: ["39", 0], latent: ["70", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "83": { inputs: { unet_name: "flux-2-klein-9b.safetensors", weight_dtype: "default" }, class_type: "UNETLoader", _meta: { title: "UNet加载器" } },
      "88": { inputs: { clip_name: "qwen_3_8b_fp8mixed.safetensors", type: "flux2", device: "default" }, class_type: "CLIPLoader", _meta: { title: "加载CLIP" } },
      "90": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["42", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "91": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["71", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "93": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["46", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "94": { inputs: { use_custom_resolution: false, resolution, custom_width: 1024, custom_height: 1024 }, class_type: "TTResolutionSelector", _meta: { title: "TT分辨率选择器" } },
      "109": { inputs: { image: "${imageId-4}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "110": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["109", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "111": { inputs: { pixels: ["110", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "112": { inputs: { conditioning: ["73", 0], latent: ["111", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
      "113": { inputs: { image: "${imageId-5}" }, class_type: "LoadImage", _meta: { title: "加载图像" } },
      "114": { inputs: { aspect_ratio: "original", proportional_width: 1, proportional_height: 1, fit: "letterbox", method: "lanczos", round_to_multiple: "16", scale_to_side: "longest", scale_to_length: 1680, background_color: "#000000", image: ["113", 0] }, class_type: "LayerUtility: ImageScaleByAspectRatio V2", _meta: { title: "LayerUtility: ImageScaleByAspectRatio V2" } },
      "115": { inputs: { pixels: ["114", 0], vae: ["10", 0] }, class_type: "VAEEncode", _meta: { title: "VAE编码" } },
      "116": { inputs: { conditioning: ["112", 0], latent: ["115", 0] }, class_type: "ReferenceLatent", _meta: { title: "参考Latent" } },
    };

    if (imageCount === 2) return workflow2Images;
    if (imageCount === 3) return workflow3Images;
    if (imageCount === 4) return workflow4Images;
    if (imageCount === 5) return workflow5Images;

    // 超过5张图暂不支持
    throw new Error(`暂不支持 ${imageCount} 张参考图，最多支持5张`);
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

  /**
   * 调用 render-ai-engine 图生图 API（1张参考图）
   */
  async callRenderAIEngine(params: {
    userId: string;
    projectId: string;
    taskType: string;
    prompt: string;
    resolution: string;
    referenceAssetId: string;
    step?: string;
    characterId?: string;
    sceneId?: string;
    episodeId?: string;
    storyboardId?: string;
    requestContext?: Record<string, any>;
  }): Promise<{ taskId: string; status: string }> {
    const {
      userId, projectId, taskType, prompt, resolution, referenceAssetId,
      step, characterId, sceneId, episodeId, storyboardId, requestContext,
    } = params;

    const renderAIUrl = 'http://render-ai-engine:8081/api/render/call';
    const requestContextWithImage = {
      ...requestContext,
      'imageId-1': referenceAssetId,
    };

    try {
      const response = await axios.post(renderAIUrl, {
        header: {
          key: 'hm-yijie',
          callMode: 'async',
          operationType: 'call',
          requestContext: requestContextWithImage,
        },
        body: {
          api: 'createRolePicture-i2i',
          prompt,
          inParam: JSON.stringify({ resolution }),
        },
      }, { timeout: 1800000 });

      const body = response.data?.body || {};
      const taskId = body.taskId || '';

      this.logger.log(`RenderAIEngine task submitted, taskId: ${taskId}, referenceAssetId: ${referenceAssetId}`);

      if (!taskId) {
        throw new Error('No taskId returned from render-ai-engine');
      }

      // 启动后台轮询
      const pollState: PollState = {
        userId,
        projectId,
        taskType,
        step,
        characterId,
        sceneId,
        episodeId,
        storyboardId,
        requestContext,
      };

      this.pollRenderAIEngineStatus(taskId, taskType, pollState);

      return { taskId, status: 'queued' };
    } catch (error: any) {
      this.logger.error(`Failed to call render-ai-engine: ${error.message}`);
      throw error;
    }
  }

  /**
   * 轮询 render-ai-engine 任务状态
   */
  private async pollRenderAIEngineStatus(taskId: string, taskType: string, state: PollState): Promise<void> {
    let attempts = 0;
    const renderAIQueryUrl = 'http://render-ai-engine:8081/api/render/query';

    const poll = async (): Promise<void> => {
      attempts++;

      if (attempts >= this.MAX_POLL_ATTEMPTS) {
        this.generationGateway.notifyTaskUpdate(state.userId, {
          taskId,
          status: 'failed',
          progress: 100,
          outputs: { error: 'Timeout: task execution exceeded 60 minutes' },
        });
        this.generationGateway.notifyProjectProgress(state.projectId, {
          taskId,
          episodeId: state.episodeId,
          storyboardId: state.storyboardId,
          status: 'failed',
          progress: 100,
          error: 'Timeout',
        });
        this.logger.error(`RenderAIEngine task ${taskId} timed out`);
        return;
      }

      try {
        const response = await axios.post(renderAIQueryUrl, {
          header: {
            key: 'hm-yijie',
            callMode: 'sync',
            operationType: 'query',
            requestContext: {},
          },
          body: {
            api: taskType,
            taskId,
          },
        }, { timeout: 30000 });

        const body = response.data?.body || {};
        const taskStatus = body.taskStatus || 'unknown';
        this.logger.log(`RenderAIEngine task ${taskId} poll ${attempts}: status=${taskStatus}`);

        // 解析 outParam（两个分支都可能用到）
        let outParam: any = {};
        if (body.outParam) {
          try {
            outParam = typeof body.outParam === 'string' ? JSON.parse(body.outParam) : body.outParam;
          } catch {}
        }

        if (taskStatus === 'completed') {

          const images: string[] = [];
          if (outParam?.images && Array.isArray(outParam.images)) {
            for (const img of outParam.images) {
              if (typeof img === 'string') {
                images.push(img);
              } else if (img?.filename) {
                images.push(img.filename);
              }
            }
          }

          const assetUrls = await this.fetchAndUploadAssets(images);

          // 保存到素材库
          if (assetUrls.length > 0) {
            let workflowType: string = state.step || 'unknown';
            let workflowId: string = '';
            if (state.step === 'characters' && state.characterId) {
              workflowId = state.characterId;
            } else if (state.step === 'scenes' && state.sceneId) {
              workflowId = state.sceneId;
            } else if (state.step === 'storyboard' && state.storyboardId) {
              workflowId = state.storyboardId;
            }

            const materials = images.map((assetId: string, index: number) => ({
              assetId,
              originFileName: assetId.split('/').pop() || assetId,
              url: assetUrls[index] || '',
              fileType: 'image' as const,
              source: 'workflow' as const,
              size: 0,
              projectId: state.projectId,
              workflowType: workflowType as any,
              workflowId,
              metadata: {
                comfyTaskId: taskId,
                taskType,
                step: state.step,
                characterId: state.characterId,
                sceneId: state.sceneId,
                episodeId: state.episodeId,
                storyboardId: state.storyboardId,
              },
            }));
            await this.materialsService.batchCreate(state.userId, materials);
          }

          this.generationGateway.notifyTaskUpdate(state.userId, {
            taskId,
            status: 'completed',
            progress: 100,
            outputs: { assets: assetUrls },
          });
          this.generationGateway.notifyProjectProgress(state.projectId, {
            taskId,
            episodeId: state.episodeId,
            storyboardId: state.storyboardId,
            status: 'completed',
            progress: 100,
            outputResult: { assets: assetUrls, comfyAssetIds: images },
          });

          // 更新 storyboard
          if (state.storyboardId) {
            await this.storyboardsService.update(state.storyboardId, {
              imageUrl: assetUrls[0] || '',
              allImageUrls: assetUrls,
              status: 'completed',
              generatedAt: new Date().toISOString(),
            } as any);
          }

          // 更新 character assets
          if (state.characterId && images.length > 0) {
            const character = await this.charactersService.findOne(state.characterId);
            if (character) {
              const existingAssets = character.assets || [];
              const newAsset = {
                id: `asset-${Date.now()}`,
                type: 'image',
                url: assetUrls[0] || '',
                prompt: state.requestContext?.prompt || '',
                tags: [],
                angle: '',
                shotSize: '',
                createdAt: new Date().toISOString(),
                comfyAssetId: images[0] || '',
              };
              await this.charactersService.update(state.characterId, {
                assets: [...existingAssets, newAsset],
              } as any);
            }
          }

          // 更新 scene assets
          if (state.sceneId && images.length > 0) {
            const scene = await this.scenesService.findOne(state.sceneId);
            if (scene) {
              const existingAssets = scene.assets || [];
              const newAsset = {
                id: `asset-${Date.now()}`,
                type: 'image',
                url: assetUrls[0] || '',
                prompt: state.requestContext?.prompt || '',
                tags: [],
                createdAt: new Date().toISOString(),
                comfyAssetId: images[0] || '',
              };
              await this.scenesService.update(state.sceneId, {
                assets: [...existingAssets, newAsset],
                status: 'completed',
              } as any);
            }
          }

        } else if (taskStatus === 'failed') {
          this.generationGateway.notifyTaskUpdate(state.userId, {
            taskId,
            status: 'failed',
            progress: 100,
            outputs: { error: outParam?.error || 'Task failed' },
          });
          this.generationGateway.notifyProjectProgress(state.projectId, {
            taskId,
            episodeId: state.episodeId,
            storyboardId: state.storyboardId,
            status: 'failed',
            progress: 100,
            error: outParam?.error || 'Task failed',
          });

          if (state.storyboardId) {
            await this.storyboardsService.update(state.storyboardId, { status: 'failed' });
          }
        } else {
          // pending/running - 继续轮询
          const progress = Math.min(90, Math.floor((attempts / this.MAX_POLL_ATTEMPTS) * 90));
          this.generationGateway.notifyTaskUpdate(state.userId, { taskId, status: 'running', progress });
          this.generationGateway.notifyProjectProgress(state.projectId, {
            taskId, episodeId: state.episodeId, storyboardId: state.storyboardId, status: 'running', progress,
          });
          setTimeout(poll, this.POLL_INTERVAL_MS);
        }
      } catch (error: any) {
        this.logger.error(`RenderAIEngine poll error for task ${taskId}: ${error.message}`);
        setTimeout(poll, this.POLL_INTERVAL_MS);
      }
    };

    poll();
  }
}
