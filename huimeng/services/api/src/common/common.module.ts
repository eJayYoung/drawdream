import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ComfyUIService } from './comfyui.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { RedisService } from './redis.service';

@Module({
  providers: [LlmService, ComfyUIService, WorkflowTemplateService, RedisService],
  exports: [LlmService, ComfyUIService, WorkflowTemplateService, RedisService],
})
export class CommonModule {}
