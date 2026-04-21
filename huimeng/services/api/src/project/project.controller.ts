import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('项目')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  async findAll(@Request() req: any) {
    const projects = await this.projectService.findAllByUser(req.user.id);
    return projects.map((p: any) => ({
      ...p,
      episodeCount: (p.episodesData?.length || p.episodes?.length || 0),
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  async findOne(@Param('id') id: string) {
    return this.projectService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  async create(@Request() req: any, @Body() dto: any) {
    const project = await this.projectService.create(req.user.id, dto);
    return { id: project.id, name: project.name };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新项目' })
  async update(@Param('id') id: string, @Body() dto: any) {
    const project = await this.projectService.update(id, dto);
    return { id: project.id };
  }

  // 保存剧本
  @Post(':id/script')
  @ApiOperation({ summary: '保存剧本' })
  async saveScript(@Param('id') id: string, @Body() dto: { scriptContent: any }) {
    const project = await this.projectService.saveScript(id, dto.scriptContent);
    return { success: true };
  }

  // 保存剧本列表
  @Post(':id/scripts')
  @ApiOperation({ summary: '保存剧本列表' })
  async saveScripts(@Param('id') id: string, @Body() dto: { scriptsData: any[]; selectedScriptIndex?: number }) {
    const project = await this.projectService.saveScripts(id, dto.scriptsData, dto.selectedScriptIndex);
    return { success: true };
  }

  // 保存分集
  @Post(':id/episodes-data')
  @ApiOperation({ summary: '保存分集数据' })
  async saveEpisodes(@Param('id') id: string, @Body() dto: { episodesData: any[] }) {
    const project = await this.projectService.saveEpisodes(id, dto.episodesData);
    return { success: true };
  }

  // 保存角色
  @Post(':id/characters-data')
  @ApiOperation({ summary: '保存角色数据' })
  async saveCharacters(@Param('id') id: string, @Body() dto: { charactersData: any[] }) {
    const project = await this.projectService.saveCharacters(id, dto.charactersData);
    return { success: true };
  }

  // 保存场景
  @Post(':id/scenes-data')
  @ApiOperation({ summary: '保存场景数据' })
  async saveScenes(@Param('id') id: string, @Body() dto: { scenesData: any[] }) {
    const project = await this.projectService.saveScenes(id, dto.scenesData);
    return { success: true };
  }

  // 保存分镜
  @Post(':id/storyboards')
  @ApiOperation({ summary: '保存分镜数据' })
  async saveStoryboards(@Param('id') id: string, @Body() dto: { storyboardsData: any[] }) {
    const project = await this.projectService.saveStoryboards(id, dto.storyboardsData);
    return { success: true };
  }

  // 保存分镜图
  @Post(':id/images')
  @ApiOperation({ summary: '保存分镜图数据' })
  async saveImages(@Param('id') id: string, @Body() dto: { imagesData: any[] }) {
    const project = await this.projectService.saveImages(id, dto.imagesData);
    return { success: true };
  }

  // 保存成片
  @Post(':id/video')
  @ApiOperation({ summary: '保存成片' })
  async saveVideo(@Param('id') id: string, @Body() dto: { videoUrl: string; coverImageUrl?: string }) {
    const project = await this.projectService.saveVideo(id, dto.videoUrl, dto.coverImageUrl);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  async delete(@Param('id') id: string) {
    await this.projectService.delete(id);
    return { success: true };
  }

  @Get(':id/episodes')
  @ApiOperation({ summary: '获取分集列表' })
  async findEpisodes(@Param('id') id: string) {
    const episodes = await this.projectService.findEpisodes(id);
    return episodes.map((e: any) => ({
      id: e.id,
      episodeNumber: e.episodeNumber,
      title: e.title,
      summary: e.summary,
      scriptContent: e.scriptContent,
      status: e.status,
      estimatedDuration: e.estimatedDuration,
    }));
  }

  @Post(':id/episodes')
  @ApiOperation({ summary: '创建分集' })
  async createEpisode(@Param('id') id: string, @Body() dto: any) {
    const episode = await this.projectService.createEpisode(id, dto);
    return { id: episode.id };
  }

  @Put('episodes/:episodeId')
  @ApiOperation({ summary: '更新分集' })
  async updateEpisode(@Param('episodeId') episodeId: string, @Body() dto: any) {
    const episode = await this.projectService.updateEpisode(episodeId, dto);
    return { id: episode.id };
  }

  @Get(':id/characters')
  @ApiOperation({ summary: '获取角色列表' })
  async findCharacters(@Param('id') id: string) {
    const characters = await this.projectService.findCharacters(id);
    return characters.map((c: any) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      ageGroup: c.ageGroup,
      role: c.role,
      personality: c.personality,
      appearance: c.appearance,
      voiceType: c.voiceType,
      imageUrls: c.imageUrls || [],
    }));
  }

  @Post(':id/characters')
  @ApiOperation({ summary: '创建角色' })
  async createCharacter(@Param('id') id: string, @Body() dto: any) {
    const character = await this.projectService.createCharacter(id, dto);
    return { id: character.id };
  }

  @Put('characters/:characterId')
  @ApiOperation({ summary: '更新角色' })
  async updateCharacter(@Param('characterId') characterId: string, @Body() dto: any) {
    const character = await this.projectService.updateCharacter(characterId, dto);
    return { id: character.id };
  }

  @Delete('characters/:characterId')
  @ApiOperation({ summary: '删除角色' })
  async deleteCharacter(@Param('characterId') id: string) {
    await this.projectService.deleteCharacter(id);
    return { success: true };
  }
}
