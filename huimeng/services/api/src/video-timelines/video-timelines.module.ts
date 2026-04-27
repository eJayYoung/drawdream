import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VideoTimeline } from '../entities/video_timelines.entity';
import { VideoTimelinesService } from './video-timelines.service';
import { VideoTimelinesController } from './video-timelines.controller';

@Module({
  imports: [MikroOrmModule.forFeature([VideoTimeline])],
  providers: [VideoTimelinesService],
  controllers: [VideoTimelinesController],
  exports: [VideoTimelinesService],
})
export class VideoTimelinesModule {}
