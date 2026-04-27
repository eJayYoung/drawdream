import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { CommonModule } from '../common/common.module';
import { ProjectModule } from '../project/project.module';
import { ScriptsModule } from '../scripts/scripts.module';
import { CharactersModule } from '../characters/characters.module';
import { ScenesModule } from '../scenes/scenes.module';
import { StoryboardsModule } from '../storyboards/storyboards.module';

@Module({
  imports: [CommonModule, ProjectModule, ScriptsModule, CharactersModule, ScenesModule, StoryboardsModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
