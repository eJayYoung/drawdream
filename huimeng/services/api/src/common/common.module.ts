import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ComfyUIService } from './comfyui.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { RedisService } from './redis.service';
import { OssService } from './oss.service';

@Module({
  providers: [LlmService, ComfyUIService, WorkflowTemplateService, RedisService, OssService],
  exports: [LlmService, ComfyUIService, WorkflowTemplateService, RedisService, OssService],
})
export class CommonModule {}
