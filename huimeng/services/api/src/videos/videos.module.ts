import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Video } from '../entities/videos.entity';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Video])],
  providers: [VideosService],
  controllers: [VideosController],
  exports: [VideosService],
})
export class VideosModule {}
