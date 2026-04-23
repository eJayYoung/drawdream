import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WorkflowResult {
  images?: string[];
  video?: string;
  output_url?: string;
}

export interface QueuePromptResponse {
  prompt_id: string;
  number: number;
}

export interface HistoryItem {
  status: string;
  outputs?: any;
  error?: string;
  rawData?: any; // 包含 filename 等完整返回数据
}

export interface UploadResult {
  name: string;
  url: string;
}

interface ApiRequestHeader {
  key: string;
  callMode: 'async' | 'sync';
  operationType: 'call' | 'query';
  requestContext: Record<string, any>;
}

interface ApiRequestBody {
  api: string;
  prompt: string;
  context?: string;  // JSON 格式
  inParam: string;   // JSON 格式
  taskId?: string;   // for query
}

interface ApiRequest {
  header: ApiRequestHeader;
  body: ApiRequestBody;
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
    outParam: string; // JSON 格式
  };
}

export interface QueryResponse {
  status: 'success' | 'failed' | 'pending' | 'unknown';
  images?: string[];
  outputs?: any;
  error?: string;
  rawData?: any;
}

@Injectable()
export class ComfyUIService {
  private readonly logger = new Logger(ComfyUIService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly clientId: string;
  private readonly outputDir: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('COMFYUI_HOST', '36.138.102.196');
    const port = this.configService.get<string>('COMFYUI_PORT', '8081');
    const apiKey = this.configService.get<string>('COMFYUI_API_KEY', 'hm-yijie');
    this.outputDir = this.configService.get<string>('COMFYUI_OUTPUT_DIR', 'output');
    this.baseUrl = `http://${host}:${port}`;
    this.apiKey = apiKey;
    this.clientId = `huimeng-${Date.now()}`;
    this.logger.log(`ComfyUI service initialized: ${this.baseUrl}, api key: ${this.apiKey}`);
  }

  private buildRequest(api: string, callMode: 'async' | 'sync', requestContext: Record<string, any> = {}, inParam: object = {}, prompt?: string): ApiRequest {
    return {
      header: {
        key: this.apiKey,
        callMode,
        operationType: 'call',
        requestContext,
      },
      body: {
        api,
        prompt: prompt || '',
        context: undefined,
        inParam: JSON.stringify(inParam),
      },
    };
  }

  /**
   * 提交 prompt 到 ComfyUI 执行
   * @param api API 名称，对应 /api/render/call 的 body.api
   * @param prompt 提示词
   * @param workflow 完整的 workflow JSON 对象
   */
  async queuePrompt(api: string, prompt: string, workflow?: object): Promise<QueuePromptResponse> {
    try {
      const request = this.buildRequest(
        api,
        'async',
        {},
        workflow,
        prompt,
      );

      this.logger.log(`[ComfyUI] curl -X POST ${this.baseUrl}/api/render/call -H 'Content-Type: application/json' -d '${JSON.stringify(request)}'`);

      const response = await axios.post(
        `${this.baseUrl}/api/render/call`,
        request,
        { timeout: 10000 }
      );

      this.logger.log(`Queue response: ${JSON.stringify(response.data)}`);

      // 从 body.taskId 获取 taskId
      const taskId = response.data?.body?.taskId || '';

      this.logger.log(`Prompt queued with taskId: ${taskId}`);
      return {
        prompt_id: taskId,
        number: 0,
      };
    } catch (error: any) {
      this.logger.error(`Failed to queue prompt: ${error.message}`);
      if (error.response) {
        this.logger.error(`ComfyUI response: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 只提交任务，不等待完成（用于后台轮询场景）
   * @param api API 名称
   * @param prompt 提示词
   * @param workflow 完整的 workflow JSON 对象
   */
  async submitTask(api: string, prompt: string, workflow?: object): Promise<{ prompt_id: string }> {
    try {
      const request = this.buildRequest(
        api,
        'async',
        {},      // requestContext
        workflow || {}, // inParam - workflow 参数
        prompt,  // prompt 作为 body.prompt 传递
      );

      this.logger.log(`[ComfyUI] submitTask: POST ${this.baseUrl}/api/render/call`);
      this.logger.log(`[ComfyUI] curl -X POST ${this.baseUrl}/api/render/call -H 'Content-Type: application/json' -d '${JSON.stringify(request)}'`);

      const response = await axios.post(
        `${this.baseUrl}/api/render/call`,
        request,
        { timeout: 10000 }
      );

      this.logger.log(`submitTask response: ${JSON.stringify(response.data)}`);

      // 检查错误响应
      if (response.data?.header?.result === 'error') {
        const errorMsg = response.data?.header?.description || 'Unknown error';
        throw new BadRequestException(`ComfyUI error: ${errorMsg}`);
      }

      // 尝试多种可能的响应格式
      const prompt_id =
        response.data?.body?.taskId ||
        response.data?.body?.prompt_id ||
        response.data?.taskId ||
        response.data?.prompt_id ||
        '';
      this.logger.log(`Task submitted with prompt_id: ${prompt_id}`);
      if (!prompt_id) {
        this.logger.warn(`submitTask: no taskId found in response, full response: ${JSON.stringify(response.data)}`);
      }
      return { prompt_id };
    } catch (error: any) {
      this.logger.error(`submitTask failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取 prompt 执行历史
   * @param promptId 从 queuePrompt 返回的 prompt_id
   */
  async getHistory(taskId: string): Promise<QueryResponse> {
    try {
      const request = {
        header: {
          key: this.apiKey,
          callMode: 'sync',
          operationType: 'call',
          requestContext: {},
        },
        body: {
          api: 'queryTaskStatus',
          prompt: '',
          inParam: '{}',
          taskId,
        },
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

      // 从 outParam 中提取 images（直接使用资产ID，不构造URL）
      const images: string[] = [];
      if (outParam?.images && Array.isArray(outParam.images)) {
        for (const img of outParam.images) {
          // img 可能是字符串 filename 或对象 { filename, subfolder, type }
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

  /**
   * 等待 prompt 执行完成（轮询）
   * @param promptId prompt_id
   * @param maxWaitMs 最大等待时间（毫秒）
   * @param intervalMs 轮询间隔（毫秒）
   */
  async waitForCompletion(
    taskId: string,
    maxWaitMs = 300000, // 5分钟
    intervalMs = 2000,
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getHistory(taskId);
      this.logger.log(`Polling task ${taskId}: ${result.status}`);
      if (result) {
        if (result.status === 'success') {
          return result;
        }
        if (result.status === 'failed') {
          throw new Error(`ComfyUI execution failed: ${result.error}`);
        }
      }

      await this.sleep(intervalMs);
    }

    throw new Error(`ComfyUI execution timeout after ${maxWaitMs}ms`);
  }

  /**
   * 完整的执行流程：提交并等待结果
   * @param api API 名称，对应 /api/render/call 的 body.api
   * @param prompt 提示词
   * @param workflow 完整的 workflow JSON 对象
   */
  async executeWorkflow(api: string, prompt: string, workflow?: object): Promise<QueryResponse> {
    const { prompt_id } = await this.queuePrompt(api, prompt, workflow);
    this.logger.log(`Workflow submitted with taskId: ${prompt_id}`);
    return this.waitForCompletion(prompt_id);
  }

  /**
   * 获取服务器信息
   */
  async getInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/render/call/stats`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get info: ${error.message}`);
      return null;
    }
  }

  /**
   * 从 history 输出中提取图片 URL
   */
  extractImagesFromOutput(outputs: any): string[] {
    const images: string[] = [];

    if (!outputs) return images;

    // 如果 outputs 是直接包含 filename 的对象（如 { filename: "xxx.png" }）
    if (outputs.filename) {
      const url = `${this.baseUrl}/view?filename=${outputs.filename}&subfolder=${outputs.subfolder || ''}&type=${outputs.type || 'output'}`;
      images.push(url);
      return images;
    }

    // outputs 结构可能是 { "76": { "images": [...] } }
    for (const nodeOutputs of Object.values(outputs) as any[]) {
      if (nodeOutputs?.images) {
        for (const img of nodeOutputs.images) {
          const url = `${this.baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`;
          images.push(url);
        }
      }
    }

    return images;
  }

  /**
   * 上传图片到 ComfyUI 服务器
   * @param imageBuffer 图片文件的 Buffer
   * @param filename 上传到服务器后保存的文件名
   */
  async uploadImage(imageBuffer: Buffer, filename: string): Promise<UploadResult> {
    try {
      const formData = new FormData();
      const uint8Array = new Uint8Array(imageBuffer);
      formData.append('image', new Blob([uint8Array]), filename);

      const response = await axios.post(
        `${this.baseUrl}/upload/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      this.logger.log(`Image uploaded: ${filename}`);
      return {
        name: response.data.name || filename,
        url: `${this.baseUrl}/view?filename=${response.data.name || filename}&type=input`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  }

  /**
   * 上传图片并返回可在 workflow 中使用的文件名
   */
  async uploadImageForWorkflow(
    imageBuffer: Buffer,
    filename: string,
    subfolder: string = '',
  ): Promise<string> {
    const result = await this.uploadImage(imageBuffer, filename);
    return subfolder ? `${subfolder}/${filename}` : filename;
  }

  /**
   * 获取工作流输出的文件列表
   */
  async getOutputFiles(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/outputs`, {
        timeout: 10000,
      });
      return response.data.outputs || [];
    } catch (error: any) {
      this.logger.error(`Failed to get output files: ${error.message}`);
      return [];
    }
  }

  /**
   * 下载输出文件
   */
  async downloadOutputFile(filename: string, subfolder: string = ''): Promise<Buffer> {
    try {
      const params: Record<string, string> = { filename };
      if (subfolder) {
        params.subfolder = subfolder;
      }

      const response = await axios.get(`${this.baseUrl}/view`, {
        params,
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to download output file: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取视频文件（从 VHS_VideoCombine 输出）
   */
  extractVideoFromOutput(outputs: any): string | null {
    if (!outputs) return null;

    for (const nodeOutputs of Object.values(outputs) as any[]) {
      if (nodeOutputs?.videos) {
        const video = nodeOutputs.videos[0];
        return `${this.baseUrl}/view?filename=${video.filename}&subfolder=${video.subfolder || ''}&type=${video.type || 'output'}`;
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
