import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Scene } from '../entities/scenes.entity';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Scene])],
  providers: [ScenesService],
  controllers: [ScenesController],
  exports: [ScenesService],
})
export class ScenesModule {}
