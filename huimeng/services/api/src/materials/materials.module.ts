import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialLibrary } from '../entities/materials.entity';
import { ProjectModule } from '../project/project.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [MikroOrmModule.forFeature([MaterialLibrary]), ProjectModule, CommonModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
