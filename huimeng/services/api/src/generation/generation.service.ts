import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ComfyUIService } from "../common/comfyui.service";
import {
  WorkflowTemplateService,
  CharacterImageParams,
  SceneImageParams,
  SceneImageRefParams,
  MultiRefImageParams,
  FluxMultiRefImageParams,
  VideoGenerationParams,
  VideoLongShotParams,
  MultiAngleCameraParams,
} from "../common/workflow-template.service";
import { GenerationGateway } from "./generation.gateway";

export interface GenerationTask {
  id: string;
  projectId: string;
  taskType: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  inputParams: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// 输入图片到 ComfyUI 服务器的映射
interface UploadedImages {
  [key: string]: string; // localPath -> remoteFilename
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private tasks: Map<string, GenerationTask> = new Map();
  private uploadedImagesCache: Map<string, UploadedImages> = new Map();

  constructor(
    private readonly comfyUIService: ComfyUIService,
    private readonly workflowTemplateService: WorkflowTemplateService,
    private readonly generationGateway: GenerationGateway,
  ) {}

  /**
   * 创建生成任务
   */
  async queueTask(
    userId: string,
    projectId: string,
    taskType: string,
    inputParams: Record<string, unknown>,
    episodeId?: string,
    storyboardId?: string,
  ): Promise<GenerationTask> {
    const task: GenerationTask = {
      id: uuidv4(),
      projectId,
      taskType,
      status: "queued",
      progress: 0,
      inputParams,
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.logger.log(`Task ${task.id} queued: ${taskType}`);

    // 异步处理任务
    this.processTask(task.id).catch((err) => {
      this.logger.error(`Task ${task.id} failed: ${err.message}`);
    });

    return task;
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = "running";
    task.progress = 0;

    try {
      switch (task.taskType) {
        case "character_image":
          await this.generateCharacterImage(task);
          break;
        case "character_image_v2":
          await this.generateCharacterImageV2(task);
          break;
        case "scene_image_portrait":
          await this.generateSceneImagePortrait(task);
          break;
        case "scene_image_landscape":
          await this.generateSceneImageLandscape(task);
          break;
        case "scene_image_ref":
          await this.generateSceneImageRef(task);
          break;
        case "multi_ref_image":
          await this.generateMultiRefImage(task);
          break;
        case "flux_multi_ref_image":
          await this.generateFluxMultiRefImage(task);
          break;
        case "video_generation":
          await this.generateVideo(task);
          break;
        case "video_long_shot":
          await this.generateVideoLongShot(task);
          break;
        case "multi_angle_camera":
          await this.generateMultiAngleCamera(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      task.status = "completed";
      task.progress = 100;
      task.completedAt = new Date();
      this.logger.log(`Task ${taskId} completed`);
    } catch (error: any) {
      task.status = "failed";
      task.error = error.message;
      task.completedAt = new Date();
      this.logger.error(`Task ${taskId} failed: ${error.message}`);
    }

    // 通过 WebSocket 通知客户端
    this.generationGateway.notifyProjectProgress(task.projectId, {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      outputResult: task.outputResult,
      error: task.error,
    });
  }

  /**
   * 上传图片到 ComfyUI 服务器
   */
  private async uploadImagesToComfyUI(
    imagePaths: string[],
    projectId: string,
  ): Promise<UploadedImages> {
    const cacheKey = `${projectId}-${imagePaths.sort().join(",")}`;
    if (this.uploadedImagesCache.has(cacheKey)) {
      return this.uploadedImagesCache.get(cacheKey)!;
    }

    const uploaded: UploadedImages = {};

    for (const imagePath of imagePaths) {
      if (imagePath.startsWith("http") || uploaded[imagePath]) {
        continue;
      }

      try {
        if (imagePath.startsWith("data:image/")) {
          const matched = imagePath.match(
            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
          );
          if (!matched) {
            this.logger.warn(`Invalid data URL image, skipping upload`);
            continue;
          }

          const mimeType = matched[1];
          const base64Data = matched[2];
          const extension =
            mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
          const filename = `upload-${projectId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}.${extension}`;
          const buffer = Buffer.from(base64Data, "base64");

          await this.comfyUIService.uploadImage(buffer, filename);
          uploaded[imagePath] = filename;
          this.logger.log(`Uploaded data URL image: ${filename}`);
          continue;
        }

        // 如果是本地文件路径，读取并上传
        const fs = await import("fs");
        const path = await import("path");

        let buffer: Buffer;
        if (fs.existsSync(imagePath)) {
          buffer = fs.readFileSync(imagePath);
        } else if (fs.existsSync(path.join(process.cwd(), imagePath))) {
          buffer = fs.readFileSync(path.join(process.cwd(), imagePath));
        } else {
          this.logger.warn(
            `Image file not found: ${imagePath}, skipping upload`,
          );
          continue;
        }

        const filename = path.basename(imagePath);
        await this.comfyUIService.uploadImage(buffer, filename);
        uploaded[imagePath] = filename;
        this.logger.log(`Uploaded image: ${filename}`);
      } catch (error: any) {
        this.logger.warn(
          `Failed to upload image ${imagePath}: ${error.message}`,
        );
      }
    }

    this.uploadedImagesCache.set(cacheKey, uploaded);
    return uploaded;
  }

  // ============ 角色图生成 ============

  private async generateCharacterImage(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as CharacterImageParams;

    const workflow = this.workflowTemplateService.getCharacterImageWorkflow({
      positive_prompt: params.positive_prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.sampler_name,
      width: params.width,
      height: params.height,
      resolution: params.resolution,
      filename_prefix: params.filename_prefix || `huimeng/character/${task.id}`,
    });

    this.logger.log(`Submitting character image task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  private async generateCharacterImageV2(task: GenerationTask): Promise<void> {
    const params = task.inputParams as any;

    const workflow = this.workflowTemplateService.getCharacterImageV2Workflow({
      positive_prompt: params.positive_prompt,
      custom_prompt: params.custom_prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.sampler_name,
      filename_prefix:
        params.filename_prefix || `huimeng/character_v2/${task.id}`,
    });

    this.logger.log(`Submitting character image v2 task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  // ============ 场景图生成 ============

  private async generateSceneImagePortrait(
    task: GenerationTask,
  ): Promise<void> {
    const params = task.inputParams as unknown as SceneImageParams;

    const workflow = this.workflowTemplateService.getSceneImagePortraitWorkflow(
      {
        prompt: params.prompt,
        negative_prompt: params.negative_prompt,
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfg,
        sampler_name: params.sampler_name,
        filename_prefix:
          params.filename_prefix || `huimeng/scene_portrait/${task.id}`,
      },
    );

    this.logger.log(`Submitting scene portrait task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  private async generateSceneImageLandscape(
    task: GenerationTask,
  ): Promise<void> {
    const params = task.inputParams as unknown as SceneImageParams;

    const workflow =
      this.workflowTemplateService.getSceneImageLandscapeWorkflow({
        prompt: params.prompt,
        negative_prompt: params.negative_prompt,
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfg,
        sampler_name: params.sampler_name,
        filename_prefix:
          params.filename_prefix || `huimeng/scene_landscape/${task.id}`,
      });

    this.logger.log(`Submitting scene landscape task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  private async generateSceneImageRef(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as SceneImageRefParams;

    // 上传参考图
    const uploaded = await this.uploadImagesToComfyUI(
      [params.reference_image],
      task.projectId,
    );
    const remoteImage =
      uploaded[params.reference_image] || params.reference_image;

    const workflow = this.workflowTemplateService.getSceneImageRefWorkflow({
      reference_image: remoteImage,
      reference_image_2: params.reference_image_2,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.sampler_name,
      filename_prefix: params.filename_prefix || `huimeng/scene_ref/${task.id}`,
    });

    this.logger.log(`Submitting scene ref image task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  // ============ 多参考图生图 ============

  private async generateMultiRefImage(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as MultiRefImageParams;

    // 上传参考图
    const uploaded = await this.uploadImagesToComfyUI(
      params.reference_images,
      task.projectId,
    );
    const remoteImages = params.reference_images.map(
      (img) => uploaded[img] || img,
    );

    const workflow = this.workflowTemplateService.getMultiRefImageWorkflow({
      reference_images: remoteImages,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.sampler_name,
      filename_prefix: params.filename_prefix || `huimeng/multi_ref/${task.id}`,
    });

    this.logger.log(`Submitting multi-ref image task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  private async generateFluxMultiRefImage(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as FluxMultiRefImageParams;

    // 上传参考图
    const allImages = [...params.reference_images];
    if (params.scene_reference) {
      allImages.push(params.scene_reference);
    }

    const uploaded = await this.uploadImagesToComfyUI(
      allImages,
      task.projectId,
    );
    const remoteImages = params.reference_images.map(
      (img) => uploaded[img] || img,
    );

    const workflow = this.workflowTemplateService.getFluxMultiRefImageWorkflow({
      reference_images: remoteImages,
      scene_reference: params.scene_reference
        ? uploaded[params.scene_reference]
        : undefined,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.sampler_name,
      filename_prefix:
        params.filename_prefix || `huimeng/flux_multi_ref/${task.id}`,
    });

    this.logger.log(
      `Submitting Flux multi-ref image task ${task.id} to ComfyUI`,
    );
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  // ============ 视频生成 ============

  private async generateVideo(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as VideoGenerationParams;

    // 上传首尾帧
    const uploaded = await this.uploadImagesToComfyUI(
      [params.start_image, params.end_image],
      task.projectId,
    );

    const workflow = this.workflowTemplateService.getVideoGenerationWorkflow({
      start_image: uploaded[params.start_image] || params.start_image,
      end_image: uploaded[params.end_image] || params.end_image,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      fps: params.fps,
      duration: params.duration,
      width: params.width,
      height: params.height,
      resolution: params.resolution,
      filename_prefix: params.filename_prefix || `huimeng/video/${task.id}`,
    });

    this.logger.log(`Submitting video generation task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const video = this.comfyUIService.extractVideoFromOutput(result.outputs);
    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { video, images, prompt_id: task.id };
  }

  private async generateVideoLongShot(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as VideoLongShotParams;

    // 上传所有帧
    const allImages = [params.start_image, params.end_image];
    if (params.middle_image) {
      allImages.push(params.middle_image);
    }

    const uploaded = await this.uploadImagesToComfyUI(
      allImages,
      task.projectId,
    );

    const workflow = this.workflowTemplateService.getVideoLongShotWorkflow({
      start_image: uploaded[params.start_image] || params.start_image,
      middle_image: params.middle_image
        ? uploaded[params.middle_image] || params.middle_image
        : undefined,
      end_image: uploaded[params.end_image] || params.end_image,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      fps: params.fps,
      duration: params.duration,
      width: params.width,
      height: params.height,
      resolution: params.resolution,
      filename_prefix:
        params.filename_prefix || `huimeng/video_long/${task.id}`,
    });

    this.logger.log(`Submitting video long shot task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const video = this.comfyUIService.extractVideoFromOutput(result.outputs);
    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { video, images, prompt_id: task.id };
  }

  private async generateMultiAngleCamera(task: GenerationTask): Promise<void> {
    const params = task.inputParams as unknown as MultiAngleCameraParams;

    // 上传源图片
    const uploaded = await this.uploadImagesToComfyUI(
      [params.source_image],
      task.projectId,
    );

    const workflow = this.workflowTemplateService.getMultiAngleCameraWorkflow({
      source_image: uploaded[params.source_image] || params.source_image,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      steps: params.steps,
      cfg: params.cfg,
      sampler_name: params.sampler_name,
      lora_name: params.lora_name,
      lora_strength: params.lora_strength,
      filename_prefix:
        params.filename_prefix || `huimeng/multi_angle/${task.id}`,
    });

    this.logger.log(`Submitting multi-angle camera task ${task.id} to ComfyUI`);
    const result = await this.comfyUIService.executeWorkflow(workflow);

    const images = this.comfyUIService.extractImagesFromOutput(result.outputs);
    task.outputResult = { images, prompt_id: task.id };
  }

  // ============ 任务状态查询 ============

  async getTaskStatus(taskId: string): Promise<GenerationTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async getProjectTasks(projectId: string): Promise<GenerationTask[]> {
    return Array.from(this.tasks.values())
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async handleComfyUICallback(
    jobId: string,
    status: "success" | "failed",
    outputs?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const task = Array.from(this.tasks.values()).find(
      (t) => t.id === jobId || (t.outputResult as any)?.prompt_id === jobId,
    );
    if (!task) return;

    task.status = status === "success" ? "completed" : "failed";
    task.outputResult = outputs;
    task.error = error;
    task.completedAt = new Date();
  }
}
