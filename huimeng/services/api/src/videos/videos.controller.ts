import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { VideosService } from './videos.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.videosService.findByProjectId(projectId);
  }

  @Get('project/:projectId/latest')
  async findLatest(@Param('projectId') projectId: string) {
    return this.videosService.findLatestByProjectId(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.videosService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.videosService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.videosService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.videosService.delete(id);
    return { success: true };
  }

  @Delete('project/:projectId')
  async deleteByProject(@Param('projectId') projectId: string) {
    await this.videosService.deleteByProjectId(projectId);
    return { success: true };
  }
}
