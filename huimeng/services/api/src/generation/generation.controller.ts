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
      inputParams: Record<string, unknown>;
      episodeId?: string;
      storyboardId?: string;
    },
  ) {
    const task = await this.generationService.queueTask(
      req.user.id,
      body.projectId,
      body.taskType,
      body.inputParams,
      body.episodeId,
      body.storyboardId,
    );
    return { taskId: task.id, status: task.status };
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: '获取任务状态' })
  async getTaskStatus(@Param('taskId') taskId: string) {
    const task = await this.generationService.getTaskStatus(taskId);
    if (!task) {
      return { error: 'Task not found' };
    }
    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      outputResult: task.outputResult,
      error: task.error,
    };
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: '获取项目所有任务' })
  async getProjectTasks(@Param('projectId') projectId: string) {
    const tasks = await this.generationService.getProjectTasks(projectId);
    return tasks.map((t: any) => ({
      taskId: t.id,
      taskType: t.taskType,
      status: t.status,
      progress: t.progress,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));
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
