import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Character } from '../entities/characters.entity';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Character])],
  providers: [CharactersService],
  controllers: [CharactersController],
  exports: [CharactersService],
})
export class CharactersModule {}
