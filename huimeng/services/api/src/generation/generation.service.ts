import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GenerationGateway } from './generation.gateway';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private tasks: Map<string, any> = new Map();

  async queueTask(
    userId: string,
    projectId: string,
    taskType: string,
    inputParams: Record<string, unknown>,
    episodeId?: string,
    storyboardId?: string,
  ): Promise<any> {
    const task = {
      id: uuidv4(),
      userId,
      projectId,
      taskType,
      workflowId: this.getWorkflowId(taskType),
      episodeId,
      storyboardId,
      status: 'queued',
      inputParams,
      progress: 0,
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);

    // Simulate async processing
    setTimeout(() => this.processTask(task.id), 1000);

    return task;
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.progress = 0;

    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      task.progress = i;
    }

    task.status = 'completed';
    task.progress = 100;
    task.outputResult = {
      url: `https://example.com/output/${taskId}.png`,
    };
    task.completedAt = new Date();

    this.logger.log(`Task ${taskId} completed`);
  }

  async getTaskStatus(taskId: string): Promise<any | null> {
    return this.tasks.get(taskId) || null;
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    return Array.from(this.tasks.values())
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async handleComfyUICallback(
    jobId: string,
    status: 'success' | 'failed',
    outputs?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const task = Array.from(this.tasks.values()).find(
      (t) => t.comfyuiJobId === jobId,
    );
    if (!task) return;

    task.status = status === 'success' ? 'completed' : 'failed';
    task.outputResult = outputs;
    task.error = error;
    task.completedAt = new Date();
  }

  private getWorkflowId(taskType: string): string {
    const map: Record<string, string> = {
      script: 'script_generation',
      episode_split: 'episode_split',
      character_image: 'character_image',
      storyboard_image: 'storyboard_image',
      storyboard_video: 'storyboard_video',
      audio: 'voice_generation',
      composition: 'video_composition',
    };
    return map[taskType] || 'unknown';
  }
}
