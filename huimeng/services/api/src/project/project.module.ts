import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Project } from '../entities';

@Module({
  imports: [MikroOrmModule.forFeature([Project])],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
