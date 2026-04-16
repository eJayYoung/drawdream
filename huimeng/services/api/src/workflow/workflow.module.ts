import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { CommonModule } from '../common/common.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [CommonModule, ProjectModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
