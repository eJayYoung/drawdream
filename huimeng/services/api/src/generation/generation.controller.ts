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
}
