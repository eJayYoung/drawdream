import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface CharacterImageParams {
  positive_prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  width?: number;
  height?: number;
  resolution?: string;
  unet_name?: string;
  clip_name?: string;
  clip_type?: string;
  vae_name?: string;
  filename_prefix?: string;
}

export interface SceneImageParams {
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  width?: number;
  height?: number;
  resolution?: string;
  unet_name?: string;
  clip_name?: string;
  clip_type?: string;
  vae_name?: string;
  filename_prefix?: string;
  is_portrait?: boolean;
}

export interface SceneImageRefParams {
  reference_image: string;
  reference_image_2?: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  denoise?: number;
  unet_name?: string;
  clip_name?: string;
  clip_type?: string;
  vae_name?: string;
  filename_prefix?: string;
}

export interface MultiRefImageParams {
  reference_images: string[];
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  denoise?: number;
  unet_name?: string;
  clip_name?: string;
  clip_type?: string;
  vae_name?: string;
  filename_prefix?: string;
}

export interface FluxMultiRefImageParams {
  reference_images: string[];
  scene_reference?: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  unet_name?: string;
  clip_name?: string;
  clip_type?: string;
  vae_name?: string;
  filename_prefix?: string;
}

export interface VideoGenerationParams {
  start_image: string;
  end_image: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  fps?: number;
  duration?: number;
  width?: number;
  height?: number;
  resolution?: string;
  unet_name?: string;
  clip_name1?: string;
  clip_name2?: string;
  clip_type?: string;
  vae_name?: string;
  audio_vae_name?: string;
  filename_prefix?: string;
}

export interface VideoLongShotParams {
  start_image: string;
  middle_image?: string;
  end_image: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  fps?: number;
  duration?: number;
  width?: number;
  height?: number;
  resolution?: string;
  unet_name?: string;
  clip_name1?: string;
  clip_name2?: string;
  clip_type?: string;
  vae_name?: string;
  audio_vae_name?: string;
  filename_prefix?: string;
}

export interface MultiAngleCameraParams {
  source_image: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  denoise?: number;
  unet_name?: string;
  clip_name?: string;
  clip_type?: string;
  vae_name?: string;
  lora_name?: string;
  lora_strength?: number;
  filename_prefix?: string;
}

@Injectable()
export class WorkflowTemplateService {
  private readonly logger = new Logger(WorkflowTemplateService.name);
  private workflowsPath: string;
  private workflowCache: Map<string, any> = new Map();

  constructor() {
    // __dirname = huimeng/services/api/dist when built
    // Go up 2 levels to reach huimeng/, then into services/comfyui/workflows
    this.workflowsPath = path.join(
      __dirname,
      '..',
      '..',
      'services',
      'comfyui',
      'workflows',
    );
  }

  /**
   * 加载 workflow JSON 文件（带缓存）
   * 注意：先做占位符替换，再解析 JSON
   */
  private loadTemplate(workflowName: string): any {
    if (this.workflowCache.has(workflowName)) {
      return JSON.parse(JSON.stringify(this.workflowCache.get(workflowName)));
    }

    const filePath = path.join(this.workflowsPath, `${workflowName}.json`);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 直接解析（占位符会被 JSON.parse 忽略，我们稍后在 workflow 方法中用 setNodeValue 替换）
    const template = JSON.parse(content);
    this.workflowCache.set(workflowName, template);
    return JSON.parse(JSON.stringify(template));
  }

  /**
   * 递归替换 workflow 中的 {{placeholder}} 为实际值
   */
  private replacePlaceholders(obj: any, params: Record<string, any>): any {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (params[key] !== undefined) {
          return String(params[key]);
        }
        return match;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replacePlaceholders(item, params));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replacePlaceholders(value, params);
      }
      return result;
    }

    return obj;
  }

  /**
   * 根据节点ID和属性路径设置值
   */
  setNodeValue(workflow: any, nodeId: string, propertyPath: string, value: any): void {
    if (!workflow[nodeId]) return;

    const parts = propertyPath.split('.');
    let current = workflow[nodeId].inputs;

    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * 生成角色图 workflow (z_image_turbo)
   */
  getCharacterImageWorkflow(params: CharacterImageParams): any {
    const template = this.loadTemplate('character_image');

    const defaults: Partial<CharacterImageParams> = {
      negative_prompt: '低质量, 模糊, 噪点, JPEG伪影, 卡通风格, 动漫滤镜',
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 20,
      cfg: 7,
      sampler_name: 'euler',
      width: 1024,
      height: 1024,
      resolution: '1024x1024 (1:1) (方形)',
      unet_name: 'z_image_turbo_bf16.safetensors',
      clip_name: 'qwen_3_4b.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'ae.safetensors',
      filename_prefix: 'huimeng/character',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    // Debug: check if node 91 exists and has the expected structure
    this.logger.log(`Node 91 exists: ${!!workflow['91']}`);
    this.logger.log(`Node 91 inputs: ${JSON.stringify(workflow['91']?.inputs || {})}`);

    // Node 91 = KSampler, Node 92 = CLIPTextEncode (positive), Node 93 = CLIPTextEncode (negative)
    this.setNodeValue(workflow, '91', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '91', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '91', 'cfg', finalParams.cfg);
    this.setNodeValue(workflow, '91', 'sampler_name', finalParams.sampler_name);

    this.setNodeValue(workflow, '92', 'text', finalParams.positive_prompt);
    this.setNodeValue(workflow, '93', 'text', finalParams.negative_prompt);

    // Debug: check after setNodeValue
    this.logger.log(`After setNodeValue, seed = ${workflow['91']?.inputs?.seed}`);

    return workflow;
  }

  /**
   * 生成角色图 workflow v2 (Qwen + z_image_turbo)
   */
  getCharacterImageV2Workflow(params: Partial<CharacterImageParams> & { custom_prompt?: string }): any {
    const template = this.loadTemplate('character_image_v2');

    const defaults = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 8,
      cfg: 1,
      sampler_name: 'euler',
      denoise: 1,
      negative_prompt: '低质量, 模糊, 噪点, JPEG伪影, 卡通风格, 动漫滤镜, 文字, 水印, 签名, 用户名,出现人类',
      filename_prefix: 'comfyui-airport-editorial',
      unet_name: 'z_image_turbo_bf16.safetensors',
      clip_name: 'qwen_3_4b.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'ae.safetensors',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '91', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '91', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '91', 'cfg', finalParams.cfg);
    this.setNodeValue(workflow, '91', 'sampler_name', finalParams.sampler_name);
    this.setNodeValue(workflow, '91', 'denoise', finalParams.denoise);

    this.setNodeValue(workflow, '92', 'text', finalParams.positive_prompt);
    this.setNodeValue(workflow, '93', 'text', finalParams.negative_prompt);

    return workflow;
  }

  /**
   * 生成竖屏场景图 workflow
   */
  getSceneImagePortraitWorkflow(params: SceneImageParams): any {
    const template = this.loadTemplate('scene_image_portrait');

    const defaults: Partial<SceneImageParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 10,
      cfg: 1,
      sampler_name: 'euler',
      negative_prompt: '低质量, 模糊, 噪点, JPEG伪影, 卡通风格, 动漫滤镜, 文字, 水印, 签名, 用户名,出现人类',
      resolution: '832x1216 (13:19) (竖屏)',
      width: 1024,
      height: 1024,
      unet_name: 'z_image_turbo_bf16.safetensors',
      clip_name: 'qwen_3_4b.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'ae.safetensors',
      filename_prefix: 'comfyui-airport-editorial',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '119', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '119', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '119', 'cfg', finalParams.cfg);
    this.setNodeValue(workflow, '119', 'sampler_name', finalParams.sampler_name);

    this.setNodeValue(workflow, '120', 'text', finalParams.prompt);
    this.setNodeValue(workflow, '121', 'text', finalParams.negative_prompt);

    return workflow;
  }

  /**
   * 生成横屏场景图 workflow
   */
  getSceneImageLandscapeWorkflow(params: SceneImageParams): any {
    const template = this.loadTemplate('scene_image_landscape');

    const defaults: Partial<SceneImageParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 10,
      cfg: 1,
      sampler_name: 'euler',
      negative_prompt: '低质量, 模糊, 噪点, JPEG伪影, 卡通风格, 动漫滤镜, 文字, 水印, 签名, 用户名,出现人类',
      resolution: '1920x1080 (16:9) (横屏)',
      width: 1024,
      height: 1024,
      unet_name: 'z_image_turbo_bf16.safetensors',
      clip_name: 'qwen_3_4b.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'ae.safetensors',
      filename_prefix: 'comfyui-airport-editorial',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '119', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '119', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '119', 'cfg', finalParams.cfg);
    this.setNodeValue(workflow, '119', 'sampler_name', finalParams.sampler_name);

    this.setNodeValue(workflow, '120', 'text', finalParams.prompt);
    this.setNodeValue(workflow, '121', 'text', finalParams.negative_prompt);

    return workflow;
  }

  /**
   * 生成场景参考图生图 workflow
   */
  getSceneImageRefWorkflow(params: SceneImageRefParams): any {
    const template = this.loadTemplate('scene_image_ref');

    const defaults: Partial<SceneImageRefParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 8,
      cfg: 1,
      sampler_name: 'euler',
      denoise: 0.9,
      negative_prompt: '低质量, 模糊, 噪点, JPEG伪影, 卡通风格, 动漫滤镜, 文字, 水印, 签名, 用户名,出现人类',
      unet_name: 'qwen_image_edit_2511_bf16.safetensors',
      clip_name: 'qwen_2.5_vl_7b_fp8_scaled.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'qwen_image_vae.safetensors',
      filename_prefix: 'comfyui-airport-editorial',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '118', 'image', finalParams.reference_image);

    this.setNodeValue(workflow, '91', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '91', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '91', 'cfg', finalParams.cfg);
    this.setNodeValue(workflow, '91', 'denoise', finalParams.denoise);

    this.setNodeValue(workflow, '100', 'custom_prompt', finalParams.prompt);
    this.setNodeValue(workflow, '100', 'seed', finalParams.seed);

    return workflow;
  }

  /**
   * 生成 Flux 多参考图生图 workflow
   */
  getFluxMultiRefImageWorkflow(params: FluxMultiRefImageParams): any {
    const template = this.loadTemplate('flux_multi_ref_image');

    const defaults: Partial<FluxMultiRefImageParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 8,
      cfg: 1,
      sampler_name: 'euler',
      negative_prompt: '低质量, 模糊, 噪点, JPEG伪影, 卡通风格',
      unet_name: 'flux-2-klein-9b.safetensors',
      clip_name: 'qwen_3_8b_fp8mixed.safetensors',
      clip_type: 'flux2',
      vae_name: 'flux2-vae.safetensors',
      filename_prefix: 'Flux2',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    const images = finalParams.reference_images || [];
    if (images[0]) this.setNodeValue(workflow, '46', 'image', images[0]);
    if (images[1]) this.setNodeValue(workflow, '42', 'image', images[1]);
    if (images[2]) this.setNodeValue(workflow, '71', 'image', images[2]);

    this.setNodeValue(workflow, '25', 'noise_seed', finalParams.seed);
    this.setNodeValue(workflow, '13', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '13', 'cfg', finalParams.cfg);

    this.setNodeValue(workflow, '6', 'text', finalParams.prompt);
    this.setNodeValue(workflow, '7', 'text', finalParams.negative_prompt);

    return workflow;
  }

  /**
   * 生成 Qwen 多参考图生图 workflow
   */
  getMultiRefImageWorkflow(params: MultiRefImageParams): any {
    const template = this.loadTemplate('multi_ref_image');

    const defaults: Partial<MultiRefImageParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 8,
      cfg: 2,
      sampler_name: 'euler',
      denoise: 0.8,
      unet_name: 'qwen_image_edit_2511_bf16.safetensors',
      clip_name: 'qwen_2.5_vl_7b_fp8_scaled.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'qwen_image_vae.safetensors',
      filename_prefix: 'qwen-2511',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    const images = finalParams.reference_images || [];
    if (images[0]) this.setNodeValue(workflow, '351', 'image', images[0]);
    if (images[1]) this.setNodeValue(workflow, '352', 'image', images[1]);
    if (images[2]) this.setNodeValue(workflow, '353', 'image', images[2]);

    this.setNodeValue(workflow, '302', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '302', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '302', 'cfg', finalParams.cfg);
    this.setNodeValue(workflow, '302', 'denoise', finalParams.denoise);

    this.setNodeValue(workflow, '386', 'string_a', finalParams.prompt);
    this.setNodeValue(workflow, '384', 'seed', finalParams.seed);

    return workflow;
  }

  /**
   * 生成视频生成 workflow (LTXV - 首尾帧)
   */
  getVideoGenerationWorkflow(params: VideoGenerationParams): any {
    const template = this.loadTemplate('video_generation');

    const defaults: Partial<VideoGenerationParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      fps: 24,
      duration: 11,
      width: 1024,
      height: 600,
      resolution: '1920x1080 (16:9) (横屏)',
      unet_name: 'ltx-2.3-22b-distilled_transformer_only_fp8_input_scaled.safetensors',
      clip_name1: 'gemma_3_12B_it_fp8_e4m3fn.safetensors',
      clip_name2: 'ltx-2.3_text_projection_bf16.safetensors',
      clip_type: 'ltxv',
      vae_name: 'LTX23_video_vae_bf16.safetensors',
      audio_vae_name: 'LTX23_audio_vae_bf16.safetensors',
      filename_prefix: 'LTX2-pre',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '232', 'image', finalParams.start_image);
    this.setNodeValue(workflow, '233', 'image', finalParams.end_image);

    this.setNodeValue(workflow, '37', 'noise_seed', finalParams.seed);
    this.setNodeValue(workflow, '136', 'value', finalParams.duration);
    this.setNodeValue(workflow, '132', 'value', finalParams.fps);

    this.setNodeValue(workflow, '71', 'text', finalParams.prompt);
    this.setNodeValue(workflow, '78', 'text', finalParams.negative_prompt);

    return workflow;
  }

  /**
   * 生成视频长镜头 workflow (LTXV - 首中尾帧)
   */
  getVideoLongShotWorkflow(params: VideoLongShotParams): any {
    const template = this.loadTemplate('video_long_shot');

    const defaults: Partial<VideoLongShotParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      fps: 24,
      duration: 10,
      width: 1024,
      height: 600,
      resolution: '1920x1080 (16:9) (横屏)',
      unet_name: 'ltx-2.3-22b-distilled_transformer_only_fp8_input_scaled.safetensors',
      clip_name1: 'gemma_3_12B_it_fp8_e4m3fn.safetensors',
      clip_name2: 'ltx-2.3_text_projection_bf16.safetensors',
      clip_type: 'ltxv',
      vae_name: 'LTX23_video_vae_bf16.safetensors',
      audio_vae_name: 'LTX23_audio_vae_bf16.safetensors',
      filename_prefix: 'LTX2-pre',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '210', 'image', finalParams.start_image);
    this.setNodeValue(workflow, '211', 'image', finalParams.end_image);
    if (finalParams.middle_image) {
      this.setNodeValue(workflow, '213', 'image', finalParams.middle_image);
    }

    this.setNodeValue(workflow, '37', 'noise_seed', finalParams.seed);
    this.setNodeValue(workflow, '136', 'value', finalParams.duration);
    this.setNodeValue(workflow, '132', 'value', finalParams.fps);

    this.setNodeValue(workflow, '71', 'text', finalParams.prompt);
    this.setNodeValue(workflow, '78', 'text', finalParams.negative_prompt);

    return workflow;
  }

  /**
   * 生成多角度分镜 workflow (Qwen multi-angle camera + LTXV)
   */
  getMultiAngleCameraWorkflow(params: MultiAngleCameraParams): any {
    const template = this.loadTemplate('multi_angle_camera');

    const defaults: Partial<MultiAngleCameraParams> = {
      seed: Math.floor(Math.random() * 999999999999999),
      steps: 8,
      cfg: 1,
      sampler_name: 'euler',
      denoise: 1,
      negative_prompt: '泛黄，AI感，不真实，丑陋，油腻的皮肤，异常的肢体，不协调的肢体',
      unet_name: 'qwen_image_edit_2511_bf16.safetensors',
      clip_name: 'qwen_2.5_vl_7b_fp8_scaled.safetensors',
      clip_type: 'qwen_image',
      vae_name: 'qwen_image_vae.safetensors',
      lora_name: 'qwen-image-edit-2511-multiple-angles-lora.safetensors',
      lora_strength: 0.9,
      filename_prefix: 'ComfyUI',
    };

    const finalParams = { ...defaults, ...params };

    let workflow = this.replacePlaceholders(template, finalParams);

    this.setNodeValue(workflow, '7', 'image', finalParams.source_image);

    this.setNodeValue(workflow, '10', 'seed', finalParams.seed);
    this.setNodeValue(workflow, '10', 'steps', finalParams.steps);
    this.setNodeValue(workflow, '10', 'cfg', finalParams.cfg);

    this.setNodeValue(workflow, '4', 'lora_name', finalParams.lora_name);
    this.setNodeValue(workflow, '4', 'strength_model', finalParams.lora_strength);

    this.setNodeValue(workflow, '39', 'prompt', '');
    this.setNodeValue(workflow, '30', 'prompt', finalParams.prompt);

    return workflow;
  }
}
