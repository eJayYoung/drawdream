import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerationService } from './generation.service';
import { ComfyUIService } from '../common/comfyui.service';
import { MaterialsService } from '../materials/materials.service';
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
    private readonly materialsService: MaterialsService,
    private readonly ossService: OssService,
  ) {}

  @Get('assets/:assetId/dataurl')
  @ApiOperation({ summary: '获取资产的data URL' })
  async getAssetDataUrl(@Param('assetId') assetId: string) {
    const assetResult = await this.generationService.fetchAssetFile(assetId);
    if (assetResult.buffer && assetResult.contentType) {
      const base64 = assetResult.buffer.toString('base64');
      const dataUrl = `data:${assetResult.contentType};base64,${base64}`;
      return { dataUrl };
    } else {
      return { error: 'Asset not found' };
    }
  }

  @Post('assets/batch-dataurl')
  @ApiOperation({ summary: '批量获取资产data URL' })
  async getBatchAssetDataUrl(@Body() body: { assetIds: string[] }) {
    const { assetIds } = body;
    if (!assetIds || !Array.isArray(assetIds)) {
      return { error: 'assetIds array required' };
    }
    const results = await this.generationService.fetchBatchAssetFiles(assetIds);
    return results;
  }

  @Post('assets/upload')
  @ApiOperation({ summary: '上传资产到ComfyUI' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(
    @UploadedFile() file: MulterFile,
    @Request() req: any,
    @Query('step') step?: string,
    @Query('projectId') projectId?: string,
    @Query('characterId') characterId?: string,
    @Query('sceneId') sceneId?: string,
  ) {
    // 并行上传到 OSS 和 ComfyUI
    const [ossUrl, result] = await Promise.all([
      this.ossService.uploadBuffer(file.buffer, file.originalname, file.mimetype),
      this.comfyUIService.uploadAsset(file.buffer, file.originalname),
    ]);
    const data = result?.data || {};

    // fileType: PICTURE -> image, VIDEO -> video, AUDIO -> audio
    const fileTypeMap: Record<string, 'image' | 'video' | 'audio'> = {
      PICTURE: 'image',
      VIDEO: 'video',
      AUDIO: 'audio',
    };
    const fileType = fileTypeMap[data.fileType] || 'image';

    // 保存到素材库，使用 OSS URL
    await this.materialsService.create(req.user.id, {
      assetId: data.id?.toString() || '',
      originFileName: data.assetName || file.originalname,
      url: ossUrl,
      fileType,
      source: 'upload',
      size: file.size,
      mimeType: file.mimetype,
      projectId,
      metadata: { step, characterId, sceneId },
    });

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
      step?: string;
      characterId?: string;
      sceneId?: string;
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
      step: body.step,
      characterId: body.characterId,
      sceneId: body.sceneId,
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
}
