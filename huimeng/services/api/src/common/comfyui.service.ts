import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface QueryResponse {
  status: 'success' | 'failed' | 'pending' | 'unknown';
  images?: string[];
  outputs?: any;
  error?: string;
  rawData?: any;
}

interface ApiRequestHeader {
  key: string;
  callMode: 'async' | 'sync';
  operationType: 'call' | 'query';
  requestContext: Record<string, any>;
}

interface CallRequestBody {
  api: string;
  prompt: string;
  context: string;
  inParam: string;
}

interface QueryRequestBody {
  api: string;
  taskId: string;
}

interface ApiResponse {
  header: {
    result: string;
    code: string;
    description: string;
  };
  body: {
    taskId: string;
    taskStatus: string;
    outParam: string;
  };
}

@Injectable()
export class ComfyUIService {
  private readonly logger = new Logger(ComfyUIService.name);
  private readonly baseUrl: string;
  private readonly proxyUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('COMFYUI_HOST', '36.138.102.196');
    const port = this.configService.get<string>('COMFYUI_PORT', '8081');
    this.baseUrl = `http://${host}:${port}`;
    this.apiKey = this.configService.get<string>('COMFYUI_API_KEY', 'hm-yijie');
    this.logger.log(`ComfyUI service initialized: ${this.baseUrl}, api key: ${this.apiKey}`);
  }

  /**
   * 上传资产到代理服务器（透明代理）
   * @param fileBuffer 文件Buffer
   * @param filename 文件名
   * @param formFields 其他表单字段，如 { key, assetType, assetDesc }
   */
  async uploadAsset(
    fileBuffer: Blob,
    filename: string,
    formFields: Record<string, string> = {},
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      for (const [key, value] of Object.entries(formFields)) {
        formData.append(key, value);
      }

      this.logger.log(`[ComfyUI] uploadAsset: POST ${this.baseUrl}/api/asset/upload`);

      const response = await axios.post(`${this.baseUrl}/api/asset/upload`, formData, {
        headers: {
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/multi-angle`,
        },
        timeout: 30000,
      });

      this.logger.log(`uploadAsset response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`uploadAsset failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 转发工作流执行接口到远程服务
   * @param taskType 前端传入的 taskType (如 createRolePicture-t2i)
   * @param prompt 提示词
   * @param inParam JSON 字符串，包含 prompt, resolution, image 等参数
   * @param referenceAssetId 可选的参考图资产ID，将传入 requestContext
   */
  async submitWorkflow(taskType: string, prompt: string, inParam: string, referenceAssetId?: string): Promise<{ prompt_id: string }> {
    try {
      // 构建 requestContext
      const requestContext: Record<string, any> = {};
      if (referenceAssetId) {
        requestContext['imageId-1'] = referenceAssetId;
      }

      const request = {
        header: {
          key: this.apiKey,
          callMode: 'async',
          operationType: 'call',
          requestContext,
        } as ApiRequestHeader,
        body: {
          api: taskType,
          prompt,
          context: '',
          inParam,
        } as CallRequestBody,
      };

      this.logger.log(`[ComfyUI] submitWorkflow: POST ${this.baseUrl}/api/render/call`);
      this.logger.log(`[ComfyUI] curl -X POST ${this.baseUrl}/api/render/call -H 'Content-Type: application/json' -d '${JSON.stringify(request)}'`);

      const response = await axios.post<ApiResponse>(
        `${this.baseUrl}/api/render/call`,
        request,
        { timeout: 10000 }
      );

      this.logger.log(`submitWorkflow response: ${JSON.stringify(response.data)}`);

      if (response.data?.header?.result === 'error') {
        const errorMsg = response.data?.header?.description || 'Unknown error';
        throw new BadRequestException(`ComfyUI error: ${errorMsg}`);
      }

      const resData = response.data as any;
      const prompt_id =
        resData?.body?.taskId ||
        resData?.body?.prompt_id ||
        resData?.taskId ||
        resData?.prompt_id ||
        '';

      this.logger.log(`Task submitted with prompt_id: ${prompt_id}`);
      if (!prompt_id) {
        this.logger.warn(`submitWorkflow: no taskId found in response, full response: ${JSON.stringify(response.data)}`);
      }

      return { prompt_id };
    } catch (error: any) {
      this.logger.error(`submitWorkflow failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 转发工作流任务查询接口到远程服务
   * @param taskType 前端传入的 taskType (如 createRolePicture-t2i)
   * @param taskId 任务ID
   */
  async queryWorkflowStatus(taskType: string, taskId: string): Promise<QueryResponse> {
    try {
      const request = {
        header: {
          key: this.apiKey,
          callMode: 'sync',
          operationType: 'query',
          requestContext: {},
        },
        body: {
          api: taskType,
          taskId,
        } as QueryRequestBody,
      };

      this.logger.log(`[ComfyUI] curl -X POST ${this.baseUrl}/api/render/query -H 'Content-Type: application/json' -d '${JSON.stringify(request)}'`);

      const response = await axios.post(
        `${this.baseUrl}/api/render/query`,
        request,
        { timeout: 10000 }
      );

      this.logger.log(`Query response: ${JSON.stringify(response.data)}`);

      const data = response.data;
      const body = data?.body || {};

      // 解析 outParam (可能是字符串或对象)
      let outParam: any = {};
      if (body?.outParam) {
        try {
          outParam = typeof body.outParam === 'string' ? JSON.parse(body.outParam) : body.outParam;
        } catch {
          outParam = {};
        }
      }

      // 获取任务状态
      const taskStatus = body?.taskStatus || 'unknown';
      let status: 'success' | 'failed' | 'pending' | 'unknown' = 'unknown';

      if (taskStatus === 'completed') {
        status = 'success';
      } else if (taskStatus === 'failed') {
        status = 'failed';
      } else if (taskStatus === 'pending' || taskStatus === 'running') {
        status = 'pending';
      }

      // 从 outParam 中提取 images
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

      return {
        status,
        images,
        outputs: outParam,
        error: outParam?.error || null,
        rawData: outParam,
      };
    } catch (error: any) {
      this.logger.error(`Failed to query task: ${error.message}`);
      return { status: 'unknown', error: error.message };
    }
  }

  }
