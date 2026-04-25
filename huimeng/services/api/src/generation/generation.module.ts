import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { GenerationGateway } from './generation.gateway';
import { CommonModule } from '../common/common.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    CommonModule,
    ProjectModule,
    MulterModule.register({
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  controllers: [GenerationController],
  providers: [GenerationService, GenerationGateway],
  exports: [GenerationService],
})
export class GenerationModule {}
