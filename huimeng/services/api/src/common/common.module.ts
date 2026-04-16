import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ComfyUIService } from './comfyui.service';
import { WorkflowTemplateService } from './workflow-template.service';

@Module({
  providers: [LlmService, ComfyUIService, WorkflowTemplateService],
  exports: [LlmService, ComfyUIService, WorkflowTemplateService],
})
export class CommonModule {}
