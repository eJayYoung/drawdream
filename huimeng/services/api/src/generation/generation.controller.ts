import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerationService } from './generation.service';
import { ComfyUIService } from '../common/comfyui.service';
import { OssService } from '../common/oss.service';
import { FileInterceptor } from '@nestjs/platform-express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('AI生成')
@Controller('generation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly comfyUIService: ComfyUIService,
    private readonly ossService: OssService,
    private readonly configService: ConfigService,
  ) {}

  @Post('assets/upload')
  @ApiOperation({ summary: '上传资产到 OSS' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(@UploadedFile() file: MulterFile) {
    const result = await this.comfyUIService.uploadAsset(file.buffer, file.originalname);
    return result;
  }

  @Post('workflow')
  @ApiOperation({ summary: '创建工作流' })
  async createWorkflow(
    @Request() req: any,
    @Body()
    body: {
      projectId: string;
      taskType: string;
      prompt: string;
      inParam: string; // JSON.stringify({ prompt, resolution?, image? })
      episodeId?: string;
      storyboardId?: string;
      referenceAssetId?: string;
      referenceAssetContent?: string;
      requestContext?: Record<string, any>;
    },
  ) {
    const result = await this.generationService.executeWorkflow({
      userId: req.user.id,
      projectId: body.projectId,
      taskType: body.taskType,
      prompt: body.prompt,
      inParam: body.inParam,
      episodeId: body.episodeId,
      storyboardId: body.storyboardId,
      referenceAssetId: body.referenceAssetId,
      referenceAssetContent: body.referenceAssetContent,
      requestContext: body.requestContext,
    });
    return { taskId: result.taskId, status: result.status };
  }

  @Post('proxy-image')
  @ApiOperation({ summary: '代理获取图片（解决跨域）' })
  async proxyImage(@Body() body: { imageUrl: string }) {
    const result = await this.ossService.proxyImage(body.imageUrl);
    return result;
  }

  @Post('screenshot/upload')
  @ApiOperation({ summary: '上传360全景截图到ComfyUI' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadScreenshot(@UploadedFile() file: MulterFile) {
    console.log('[screenshot/upload] received file:', file ? { fieldname: file.fieldname, originalname: file.originalname, size: file.size, mimetype: file.mimetype } : 'null');
    try {
      const buffer = file.buffer;
      const filename = file.originalname || `panorama_screenshot_${Date.now()}.jpg`;

      // 上传到 ComfyUI，获取 asset id，然后下载后上传 OSS
      const uploadResult = await this.comfyUIService.uploadAsset(buffer, filename);
      console.log('[screenshot/upload] uploadResult:', JSON.stringify(uploadResult));
      // ComfyUI 返回格式是 { code, data: { id, assetContent }, message }
      const assetId = uploadResult?.data?.id;
      console.log('[screenshot/upload] assetId:', assetId);
      let displayUrl = '';

      if (assetId) {
        displayUrl = await this.generationService.downloadAssetToOss(assetId, filename);
      }

      console.log('[screenshot/upload] displayUrl:', displayUrl);
      return { url: displayUrl };
    } catch (error: any) {
      throw new BadRequestException(`截图上传失败: ${error.message}`);
    }
  }

  @Post('smart-storyboard')
  @ApiOperation({ summary: '智能分镜 - 使用资产引用生成图片' })
  async smartStoryboard(
    @Request() req: any,
    @Body()
    body: {
      projectId: string;
      prompt: string;
      assetIds: string[]; // ComfyUI asset IDs in order: imageId-1, imageId-2, etc.
      inParam?: string;
      episodeId?: string;
      storyboardId?: string;
    },
  ) {
    const { projectId, prompt, assetIds, inParam: inParamStr, episodeId, storyboardId } = body;

    // 构建 requestContext: { "imageId-1": "assetId1", "imageId-2": "assetId2", ... }
    const requestContext: Record<string, string> = {};
    assetIds.forEach((assetId, index) => {
      requestContext[`imageId-${index + 1}`] = assetId;
    });

    // 构建 inParam
    const finalInParamStr = inParamStr || JSON.stringify(
      Object.fromEntries(assetIds.map((_, index) => [`imageId-${index + 1}`, '']))
    );

    const result = await this.generationService.submitSmartStoryboard({
      userId: req.user.id,
      projectId,
      taskType: 'createStoryBoard',
      prompt,
      inParam: finalInParamStr,
      requestContext,
      episodeId,
      storyboardId,
    });

    return { taskId: result.taskId, status: result.status };
  }
}
