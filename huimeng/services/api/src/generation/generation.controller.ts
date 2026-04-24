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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerationService } from './generation.service';
import { ComfyUIService } from '../common/comfyui.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('AI生成')
@Controller('generation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly comfyUIService: ComfyUIService,
  ) {}

  @Post('assets/upload')
  @ApiOperation({ summary: '上传资产到 OSS' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(@UploadedFile() file: Express.Multer.File) {
    const result = await this.comfyUIService.uploadAsset(
      new Blob([new Uint8Array(file.buffer)]),
      file.originalname,
      {
        key: 'hm-yijie',
        assetType: 'SENE_IMG',
        assetDesc: '多角度视图参考图',
      },
    );
    const assetId = result?.data?.id || result?.id;
    return { assetId };
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
    });
    return { taskId: result.taskId, status: result.status };
  }
}
