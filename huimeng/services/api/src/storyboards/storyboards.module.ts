import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Storyboard } from '../entities/storyboards.entity';
import { StoryboardsService } from './storyboards.service';
import { StoryboardsController } from './storyboards.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Storyboard])],
  providers: [StoryboardsService],
  controllers: [StoryboardsController],
  exports: [StoryboardsService],
})
export class StoryboardsModule {}
