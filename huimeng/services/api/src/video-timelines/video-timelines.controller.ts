import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { VideoTimelinesService } from './video-timelines.service';

@Controller('video-timelines')
export class VideoTimelinesController {
  constructor(private readonly videoTimelinesService: VideoTimelinesService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.videoTimelinesService.findByProjectId(projectId);
  }

  @Get('storyboard/:storyboardId')
  async findByStoryboard(@Param('storyboardId') storyboardId: string) {
    return this.videoTimelinesService.findByStoryboardId(storyboardId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.videoTimelinesService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.videoTimelinesService.create(data);
  }

  @Post('batch')
  async createMany(@Body() data: any[]) {
    return this.videoTimelinesService.createMany(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.videoTimelinesService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.videoTimelinesService.delete(id);
    return { success: true };
  }

  @Delete('project/:projectId')
  async deleteByProject(@Param('projectId') projectId: string) {
    await this.videoTimelinesService.deleteByProjectId(projectId);
    return { success: true };
  }

  @Delete('storyboard/:storyboardId')
  async deleteByStoryboard(@Param('storyboardId') storyboardId: string) {
    await this.videoTimelinesService.deleteByStoryboardId(storyboardId);
    return { success: true };
  }
}
