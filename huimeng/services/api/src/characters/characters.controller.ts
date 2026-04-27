import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CharactersService } from './characters.service';

@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.charactersService.findByProjectId(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.charactersService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.charactersService.create(data);
  }

  @Post('batch')
  async createMany(@Body() data: any[]) {
    return this.charactersService.createMany(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.charactersService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.charactersService.delete(id);
    return { success: true };
  }

  @Delete('project/:projectId')
  async deleteByProject(@Param('projectId') projectId: string) {
    await this.charactersService.deleteByProjectId(projectId);
    return { success: true };
  }
}
