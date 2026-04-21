import { Injectable, Logger } from '@nestjs/common';
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

  private buildRequest(api: string, callMode: 'async' | 'sync', requestContext: Record<string, any> = {}, inParam: object = {}, context?: object): ApiRequest {
    return {
      header: {
        key: this.apiKey,
        callMode,
        operationType: 'call',
        requestContext,
      },
      body: {
        api,
        prompt: '',
        context: context ? JSON.stringify(context) : undefined,
        inParam: JSON.stringify(inParam),
      },
    };
  }

  /**
   * 提交 prompt 到 ComfyUI 执行
   * @param workflow 完整的 workflow JSON 对象
   */
  async queuePrompt(workflow: object): Promise<QueuePromptResponse> {
    try {
      const request = this.buildRequest(
        'createRolePicture',
        'async',
        {},
        workflow,
      );

      const response = await axios.post(
        `${this.baseUrl}/api/render/call`,
        request,
        { timeout: 10000 }
      );

      this.logger.log(`Queue response: ${JSON.stringify(response.data)}`);

      // 解析 prompt_id 从 outParam 中
      let promptId = '';
      const outParam = response.data?.body?.outParam;
      if (outParam) {
        try {
          const parsed = typeof outParam === 'string' ? JSON.parse(outParam) : outParam;
          promptId = parsed.task_id || parsed.prompt_id || '';
        } catch {
          promptId = '';
        }
      }

      this.logger.log(`Prompt queued: ${promptId}`);
      return {
        prompt_id: promptId,
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
   * 获取 prompt 执行历史
   * @param promptId 从 queuePrompt 返回的 prompt_id
   */
  async getHistory(promptId: string): Promise<HistoryItem | null> {
    try {
      const request = this.buildRequest(
        'taskStatusQuery',
        'sync',
        { prompt_id: promptId },
        {},
      );

      const response = await axios.post(
        `${this.baseUrl}/api/render/call`,
        request,
        { timeout: 10000 }
      );

      this.logger.log(`History response: ${JSON.stringify(response.data)}`);

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

      // outParam 可能是一个嵌套对象，键是 prompt_id
      const promptData = outParam[promptId] || outParam;

      // 获取任务状态
      const taskStatus = body?.taskStatus || promptData?.status?.status_str || 'unknown';
      const status = taskStatus === 'success' ? 'success' : taskStatus === 'failed' ? 'failed' : taskStatus;

      return {
        status,
        outputs: promptData?.outputs || null,
        error: promptData?.error || null,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get history: ${error.message}`);
      return null;
    }
  }

  /**
   * 等待 prompt 执行完成（轮询）
   * @param promptId prompt_id
   * @param maxWaitMs 最大等待时间（毫秒）
   * @param intervalMs 轮询间隔（毫秒）
   */
  async waitForCompletion(
    promptId: string,
    maxWaitMs = 300000, // 5分钟
    intervalMs = 2000,
  ): Promise<HistoryItem> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const history = await this.getHistory(promptId);

      if (history) {
        if (history.status === 'success') {
          return history;
        }
        if (history.status === 'failed') {
          throw new Error(`ComfyUI execution failed: ${history.error}`);
        }
      }

      await this.sleep(intervalMs);
    }

    throw new Error(`ComfyUI execution timeout after ${maxWaitMs}ms`);
  }

  /**
   * 完整的执行流程：提交并等待结果
   */
  async executeWorkflow(workflow: object): Promise<HistoryItem> {
    const { prompt_id } = await this.queuePrompt(workflow);
    this.logger.log(`Workflow submitted with prompt_id: ${prompt_id}`);
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
