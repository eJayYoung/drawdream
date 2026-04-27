import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { StoryboardsService } from './storyboards.service';

@Controller('storyboards')
export class StoryboardsController {
  constructor(private readonly storyboardsService: StoryboardsService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.storyboardsService.findByProjectId(projectId);
  }

  @Get('episode/:episodeId')
  async findByEpisode(@Param('episodeId') episodeId: string) {
    return this.storyboardsService.findByEpisodeId(episodeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.storyboardsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.storyboardsService.create(data);
  }

  @Post('batch')
  async createMany(@Body() data: any[]) {
    return this.storyboardsService.createMany(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.storyboardsService.update(id, data);
  }

  @Put(':id/image')
  async updateImage(
    @Param('id') id: string,
    @Body() body: { imageUrl: string; comfyAssetId?: string },
  ) {
    await this.storyboardsService.updateImageUrl(id, body.imageUrl, body.comfyAssetId);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.storyboardsService.delete(id);
    return { success: true };
  }

  @Delete('project/:projectId')
  async deleteByProject(@Param('projectId') projectId: string) {
    await this.storyboardsService.deleteByProjectId(projectId);
    return { success: true };
  }
}
