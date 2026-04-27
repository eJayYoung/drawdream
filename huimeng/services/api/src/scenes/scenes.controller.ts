import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ScenesService } from './scenes.service';

@Controller('scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.scenesService.findByProjectId(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scenesService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.scenesService.create(data);
  }

  @Post('batch')
  async createMany(@Body() data: any[]) {
    return this.scenesService.createMany(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.scenesService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.scenesService.delete(id);
    return { success: true };
  }

  @Delete('project/:projectId')
  async deleteByProject(@Param('projectId') projectId: string) {
    await this.scenesService.deleteByProjectId(projectId);
    return { success: true };
  }
}
