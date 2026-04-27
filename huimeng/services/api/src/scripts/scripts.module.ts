import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Script } from '../entities/scripts.entity';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Script])],
  providers: [ScriptsService],
  controllers: [ScriptsController],
  exports: [ScriptsService],
})
export class ScriptsModule {}
