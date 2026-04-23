import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerationService } from './generation.service';

@ApiTags('AI生成')
@Controller('generation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('queue')
  @ApiOperation({ summary: '排队生成任务' })
  async queueTask(
    @Request() req: any,
    @Body()
    body: {
      projectId: string;
      taskType: string;
      prompt: string;
      inputParams: Record<string, unknown>;
      episodeId?: string;
      storyboardId?: string;
    },
  ) {
    const task = await this.generationService.queueTask({
      userId: req.user.id,
      projectId: body.projectId,
      taskType: body.taskType,
      prompt: body.prompt,
      inputParams: body.inputParams,
      episodeId: body.episodeId,
      storyboardId: body.storyboardId,
    });
    return { taskId: task.id, status: task.status };
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: '获取任务状态' })
  async getTaskStatus(@Param('taskId') taskId: string) {
    // 代理到 ComfyUI 查询接口
    const result = await this.generationService.getTaskStatus(taskId);
    if (!result) {
      return { error: 'Task not found or failed to query' };
    }
    return {
      taskId: result.taskId,
      status: result.status,
      progress: result.progress,
      outputResult: result.outputs,
    };
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: '获取项目所有任务' })
  async getProjectTasks(@Param('projectId') projectId: string) {
    // ComfyUI 不支持按项目查询，依赖 WebSocket 推送
    const tasks = await this.generationService.getProjectTasks(projectId);
    return tasks;
  }

  @Post('webhook/comfyui')
  @ApiOperation({ summary: 'ComfyUI回调' })
  async comfyUICallback(
    @Body()
    body: {
      prompt_id: string;
      status: 'success' | 'failed';
      outputs?: Record<string, unknown>;
      error?: string;
    },
  ) {
    await this.generationService.handleComfyUICallback(
      body.prompt_id,
      body.status,
      body.outputs,
      body.error,
    );
    return { received: true };
  }
}
