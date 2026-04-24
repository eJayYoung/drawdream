import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowService } from './workflow.service';

@ApiTags('创作流程')
@Controller('workflow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('projects/:projectId/script')
  @ApiOperation({ summary: '生成剧本' })
  async generateScript(
    @Param('projectId') projectId: string,
    @Body() body: { prompt: string },
  ) {
    const result = await this.workflowService.generateScript(
      projectId,
      body.prompt,
    );
    return result;
  }

  @Put('projects/:projectId/script')
  @ApiOperation({ summary: '更新剧本' })
  async updateScript(
    @Param('projectId') projectId: string,
    @Body() body: { content: string },
  ) {
    // TODO: Implement script update
    return { success: true };
  }

  @Post('projects/:projectId/episodes')
  @ApiOperation({ summary: '智能分集' })
  async splitEpisodes(
    @Param('projectId') projectId: string,
    @Body() body: { scriptContent: string; episodeCount?: number },
  ) {
    const episodes = await this.workflowService.splitEpisodes(
      projectId,
      body.scriptContent,
      body.episodeCount,
    );
    return episodes.map((e) => ({
      id: e.id,
      episodeNumber: e.episodeNumber,
      title: e.title,
      summary: e.summary,
      scriptContent: e.scriptContent,
    }));
  }

  @Post('projects/:projectId/characters')
  @ApiOperation({ summary: '生成角色' })
  async generateCharacters(
    @Param('projectId') projectId: string,
    @Body() body: { scriptContent: string },
  ) {
    const characters = await this.workflowService.generateCharacters(
      projectId,
      body.scriptContent,
    );
    return characters;
  }

  @Post('projects/:projectId/scenes')
  @ApiOperation({ summary: '生成场景' })
  async generateScenes(
    @Param('projectId') projectId: string,
    @Body() body: { scriptContent: string },
  ) {
    const scenes = await this.workflowService.generateScenes(
      projectId,
      body.scriptContent,
    );
    return scenes;
  }

  @Post('projects/:projectId/storyboards')
  @ApiOperation({ summary: '为单部作品生成分镜' })
  async generateProjectStoryboards(
    @Param('projectId') projectId: string,
    @Body() body: { scriptContent: string; style?: string },
  ) {
    const storyboards = await this.workflowService.generateProjectStoryboards(
      projectId,
      body.scriptContent,
      body.style,
    );
    return storyboards.map((s) => ({
      id: s.id,
      sceneNumber: s.sceneNumber,
      shotType: s.shotType,
      description: s.description,
      imagePrompt: s.imagePrompt,
    }));
  }

  @Post('projects/:projectId/storyboards/scene')
  @ApiOperation({ summary: '为单个场景生成分镜' })
  async generateStoryboardsForScene(
    @Param('projectId') projectId: string,
    @Body() body: { scriptContent: string; sceneIndex: number; sceneName: string; sceneContent: string },
  ) {
    const storyboards = await this.workflowService.generateStoryboardsForScene(
      projectId,
      body.scriptContent,
      body.sceneIndex,
      body.sceneName,
      body.sceneContent,
    );
    return storyboards;
  }

  @Post('episodes/:episodeId/storyboards')
  @ApiOperation({ summary: '生成分镜' })
  async generateStoryboards(
    @Param('episodeId') episodeId: string,
    @Body() body?: { autoGenerateImages?: boolean },
  ) {
    const storyboards = await this.workflowService.generateStoryboards(
      episodeId,
      { autoGenerateImages: body?.autoGenerateImages },
    );
    return storyboards.map((s) => ({
      id: s.id,
      sceneNumber: s.sceneNumber,
      shotType: s.shotType,
      description: s.description,
      imagePrompt: s.imagePrompt,
    }));
  }

  @Get('episodes/:episodeId/storyboards')
  @ApiOperation({ summary: '获取分镜列表' })
  async getStoryboards(@Param('episodeId') episodeId: string) {
    const storyboards = await this.workflowService.getStoryboards(episodeId);
    return storyboards.map((s) => ({
      id: s.id,
      sceneNumber: s.sceneNumber,
      shotType: s.shotType,
      description: s.description,
      imagePrompt: s.imagePrompt,
      imageUrl: s.imageUrl,
      videoUrl: s.videoUrl,
      narration: s.narration,
      dialogue: s.dialogue,
      status: s.status,
    }));
  }

  @Put('storyboards/:storyboardId')
  @ApiOperation({ summary: '更新分镜' })
  async updateStoryboard(
    @Param('storyboardId') id: string,
    @Body()
    body: {
      shotType?: string;
      description?: string;
      imagePrompt?: string;
      narration?: string;
      dialogue?: string;
    },
  ) {
    const storyboard = await this.workflowService.updateStoryboard(id, body);
    return { id: storyboard.id };
  }

  @Post('projects/:projectId/script/format')
  @ApiOperation({ summary: '转换剧本为标准格式' })
  async formatScript(
    @Param('projectId') projectId: string,
    @Body() body: { content: string },
  ) {
    this.logger.log(`formatScript - projectId: ${projectId}, content: ${body.content}`);
    const result = await this.workflowService.formatScript(body.content);
    this.logger.log(`formatScript result: ${result}`);
    return { content: result };
  }

  @Post('projects/:projectId/script/expand')
  @ApiOperation({ summary: 'AI扩写剧本' })
  async expandScript(
    @Param('projectId') projectId: string,
    @Body() body: { content: string; prompt: string },
  ) {
    this.logger.log(`expandScript - projectId: ${projectId}, prompt: ${body.prompt}, content: ${body.content}`);
    const result = await this.workflowService.expandScript(body.content, body.prompt);
    this.logger.log(`expandScript result: ${result}`);
    return { content: result };
  }
}
