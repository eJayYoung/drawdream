import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LlmService } from '../common/llm.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private scripts: Map<string, any> = new Map();
  private storyboards: Map<string, any> = new Map();
  private episodes: Map<string, any> = new Map();
  private projects: Map<string, any> = new Map();

  constructor(private readonly llmService: LlmService) {}

  async generateScript(
    projectId: string,
    prompt: string,
    projectName?: string,
    style?: string,
  ): Promise<{ content: string; wordCount: number }> {
    try {
      this.logger.log(`Generating script for project ${projectId}`);

      // 使用阿里百炼API生成剧本
      const result = await this.llmService.generateScript(
        projectName || '未命名项目',
        style || '现代',
        prompt,
      );

      const script = {
        id: uuidv4(),
        projectId,
        content: result.content,
        wordCount: result.wordCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.scripts.set(script.id, script);

      // 同时保存到项目对应的剧本
      this.projects.set(projectId, {
        ...this.projects.get(projectId),
        script: script.content,
      });

      this.logger.log(`Script generated successfully for project ${projectId}`);
      return {
        content: result.content,
        wordCount: result.wordCount,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate script: ${error.message}`);
      throw error;
    }
  }

  async splitEpisodes(
    projectId: string,
    scriptContent: string,
    episodeCount?: number,
  ): Promise<any[]> {
    try {
      this.logger.log(`Splitting episodes for project ${projectId}`);

      // 使用阿里百炼API进行智能分集
      const episodeData = await this.llmService.splitEpisodes(scriptContent, episodeCount);

      const episodes: any[] = episodeData.map((ep: any, index: number) => {
        const episode = {
          id: uuidv4(),
          projectId,
          episodeNumber: ep.number || index + 1,
          title: ep.title,
          summary: ep.summary,
          scriptContent: JSON.stringify(ep),
          estimatedDuration: ep.estimatedDuration || 180,
          status: 'pending',
          orderIndex: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.episodes.set(episode.id, episode);
        return episode;
      });

      this.logger.log(`Split into ${episodes.length} episodes`);
      return episodes;
    } catch (error: any) {
      this.logger.error(`Failed to split episodes: ${error.message}`);
      throw error;
    }
  }

  async generateStoryboards(
    episodeId: string,
    options?: { autoGenerateImages?: boolean; style?: string },
  ): Promise<any[]> {
    try {
      const episode = this.episodes.get(episodeId);
      if (!episode) throw new Error('Episode not found');

      this.logger.log(`Generating storyboards for episode ${episodeId}`);

      let scriptData: any;
      try {
        scriptData = typeof episode.scriptContent === 'string'
          ? JSON.parse(episode.scriptContent)
          : episode.scriptContent;
      } catch {
        scriptData = { scenes: [] };
      }

      const scenes = scriptData.scenes || [];
      const style = options?.style || episode.style || 'cinematic';
      const storyboards: any[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        // 使用阿里百炼API生成更智能的分镜描述
        let storyboardData: any;
        try {
          const llmResult = await this.llmService.generateStoryboardPrompt(episode, scene, style);
          storyboardData = JSON.parse(llmResult);
        } catch {
          // 如果LLM调用失败，使用默认格式
          storyboardData = {
            imagePrompt: `${scene.location}, ${scene.action}, ${style} style, cinematic`,
            shotType: this.suggestShotType(scene),
            narration: scene.dialogue,
            dialogue: scene.dialogue,
          };
        }

        const storyboard = {
          id: uuidv4(),
          episodeId,
          sceneNumber: i + 1,
          shotType: storyboardData.shotType || 'medium',
          description: scene.action,
          imagePrompt: storyboardData.imagePrompt,
          narration: storyboardData.narration,
          dialogue: storyboardData.dialogue,
          durationFrames: 48,
          orderIndex: i,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        storyboards.push(storyboard);
        this.storyboards.set(storyboard.id, storyboard);
      }

      this.logger.log(`Generated ${storyboards.length} storyboards`);
      return storyboards;
    } catch (error: any) {
      this.logger.error(`Failed to generate storyboards: ${error.message}`);
      throw error;
    }
  }

  async getStoryboards(episodeId: string): Promise<any[]> {
    return Array.from(this.storyboards.values())
      .filter((s) => s.episodeId === episodeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async updateStoryboard(id: string, data: any): Promise<any> {
    const storyboard = this.storyboards.get(id);
    if (!storyboard) throw new Error('Storyboard not found');
    Object.assign(storyboard, data, { updatedAt: new Date() });
    return storyboard;
  }

  async getEpisode(episodeId: string): Promise<any> {
    return this.episodes.get(episodeId);
  }

  private suggestShotType(scene: any): string {
    const action = (scene.action || '').toLowerCase();
    const dialogue = (scene.dialogue || '').toLowerCase();

    if (action.includes('特写') || action.includes('close')) {
      return 'close_up';
    }
    if (action.includes('远景') || action.includes('wide') || action.includes('全景')) {
      return 'wide';
    }
    if (action.includes('建立') || action.includes('establishing')) {
      return 'establishing';
    }

    return dialogue ? 'medium' : 'full';
  }
}
